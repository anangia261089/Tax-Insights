import { NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";

export async function GET() {
  try {
    const { xero, tenantId } = await getAuthenticatedXero();

    // Fetch suppliers (for 1099 contractor tracking)
    const response = await xero.accountingApi.getContacts(
      tenantId,
      undefined, // ifModifiedSince
      "IsSupplier==true" // where
    );

    const contacts = (response.body.contacts || []).map((c) => ({
      id: c.contactID,
      name: c.name,
      firstName: c.firstName,
      lastName: c.lastName,
      emailAddress: c.emailAddress,
      taxNumber: c.taxNumber,
      isSupplier: c.isSupplier,
      balances: c.balances,
    }));

    return NextResponse.json({ contacts, count: contacts.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Error fetching contacts:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}
