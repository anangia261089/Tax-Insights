import { NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";

export async function GET() {
  try {
    const { xero, tenantId } = await getAuthenticatedXero();

    // US calendar tax year (Jan 1 – Dec 31 of the prior year)
    const year = new Date().getFullYear() - 1;
    const fromDate = `${year}-01-01`;
    const toDate = `${year}-12-31`;

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
