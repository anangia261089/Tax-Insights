import { NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";

export async function GET() {
  try {
    const { xero, tenantId } = await getAuthenticatedXero();

    // Fetch bank transactions from the last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateFilter = `Date >= DateTime(${oneYearAgo.getFullYear()}, ${oneYearAgo.getMonth() + 1}, ${oneYearAgo.getDate()})`;

    const response = await xero.accountingApi.getBankTransactions(
      tenantId,
      undefined, // ifModifiedSince
      dateFilter  // where
    );

    const transactions = (response.body.bankTransactions || []).map((tx) => ({
      id: tx.bankTransactionID,
      type: tx.type,
      date: tx.date,
      reference: tx.reference,
      status: tx.status,
      total: tx.total,
      contact: tx.contact?.name,
      lineItems: (tx.lineItems || []).map((li) => ({
        description: li.description,
        amount: li.lineAmount,
        accountCode: li.accountCode,
        taxType: li.taxType,
      })),
    }));

    return NextResponse.json({ transactions, count: transactions.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
