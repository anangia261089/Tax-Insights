import { NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";

export async function GET() {
  try {
    const { xero, tenantId } = await getAuthenticatedXero();

    const today = new Date().toISOString().split("T")[0];
    const response = await xero.accountingApi.getReportBalanceSheet(
      tenantId,
      today
    );

    return NextResponse.json({ report: response.body.reports?.[0] || null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Error fetching balance sheet:", error);
    return NextResponse.json({ error: "Failed to fetch balance sheet" }, { status: 500 });
  }
}
