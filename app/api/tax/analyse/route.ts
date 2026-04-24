import { NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";
import { analyseDeductions } from "@/app/lib/tax-engine";

export async function GET() {
  try {
    const { xero, tenantId } = await getAuthenticatedXero();

    // Fetch all data in parallel
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateFilter = `Date >= DateTime(${oneYearAgo.getFullYear()}, ${oneYearAgo.getMonth() + 1}, ${oneYearAgo.getDate()})`;
    const now = new Date();
    const fromDate = `${now.getFullYear() - 1}-04-01`;
    const toDate = `${now.getFullYear()}-03-31`;
    const today = now.toISOString().split("T")[0];

    const [txRes, pnlRes, bsRes, contactsRes, orgRes] = await Promise.all([
      xero.accountingApi.getBankTransactions(tenantId, undefined, dateFilter),
      xero.accountingApi.getReportProfitAndLoss(tenantId, fromDate, toDate),
      xero.accountingApi.getReportBalanceSheet(tenantId, today),
      xero.accountingApi.getContacts(tenantId, undefined, "IsSupplier==true"),
      xero.accountingApi.getOrganisations(tenantId),
    ]);

    const orgName = orgRes.body.organisations?.[0]?.name || "Your Organisation";

    // Debug logging
    console.log("=== XERO DATA DEBUG ===");
    console.log("Transactions:", txRes.body.bankTransactions?.length || 0);
    console.log("P&L report rows:", JSON.stringify(pnlRes.body.reports?.[0]?.rows?.length || 0));
    if (pnlRes.body.reports?.[0]?.rows?.[0]) {
      console.log("P&L first row:", JSON.stringify(pnlRes.body.reports[0].rows[0]).substring(0, 500));
    }
    console.log("Contacts:", contactsRes.body.contacts?.length || 0);

    const transactions = (txRes.body.bankTransactions || []).map((tx) => ({
      total: tx.total,
      contact: tx.contact?.name,
      type: tx.type?.toString(),
      lineItems: (tx.lineItems || []).map((li) => ({
        description: li.description,
        amount: li.lineAmount,
        accountCode: li.accountCode,
      })),
    }));

    const contacts = (contactsRes.body.contacts || []).map((c) => ({
      name: c.name,
      isSupplier: c.isSupplier,
    }));

    const result = analyseDeductions(
      orgName,
      transactions,
      pnlRes.body.reports?.[0] || null,
      bsRes.body.reports?.[0] || null,
      contacts
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Error running tax analysis:", error);
    return NextResponse.json({ error: "Failed to run tax analysis" }, { status: 500 });
  }
}
