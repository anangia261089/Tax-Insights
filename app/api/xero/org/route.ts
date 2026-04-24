import { NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";

export async function GET() {
  try {
    const { xero, tenantId } = await getAuthenticatedXero();
    const response = await xero.accountingApi.getOrganisations(tenantId);
    const org = response.body.organisations?.[0];

    return NextResponse.json({
      name: org?.name || "Unknown Organisation",
      shortCode: org?.shortCode,
      countryCode: org?.countryCode,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Error fetching org:", error);
    return NextResponse.json({ error: "Failed to fetch organisation" }, { status: 500 });
  }
}
