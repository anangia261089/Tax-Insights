import { NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";

export async function GET() {
  try {
    const { xero, tenantId } = await getAuthenticatedXero();

    // Fetch Profit & Loss for the last fiscal year
    const now = new Date();
    const fromDate = `${now.getFullYear() - 1}-04-01`;
    const toDate = `${now.getFullYear()}-03-31`;

    const response = await xero.accountingApi.getReportProfitAndLoss(
      tenantId,
      fromDate,
      toDate
    );

    return NextResponse.json({ report: response.body.reports?.[0] || null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Error fetching P&L:", error);
    return NextResponse.json({ error: "Failed to fetch P&L report" }, { status: 500 });
  }
}
