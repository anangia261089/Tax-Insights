import { NextRequest, NextResponse } from "next/server";
import { getXeroClient } from "@/app/lib/xero-client";
import { getSession } from "@/app/lib/session";
import { saveXeroSession } from "@/app/lib/xero-session-store";

export async function GET(request: NextRequest) {
  try {
    const xero = getXeroClient();
    await xero.initialize();

    const tokenSet = await xero.apiCallback(request.url);

    await xero.updateTenants(false);
    const tenantId = xero.tenants[0]?.tenantId;

    if (!tenantId) {
      return NextResponse.redirect(new URL("/?error=no_tenant", request.url));
    }

    // Persist tokens in the DB (encrypted). Cookie only stores the tenant ID pointer.
    await saveXeroSession(tenantId, {
      accessToken: tokenSet.access_token!,
      refreshToken: tokenSet.refresh_token!,
      expiresAt: Math.floor(Date.now() / 1000) + (tokenSet.expires_in || 1800),
    });

    const session = await getSession();
    session.xeroTenantId = tenantId;
    await session.save();

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Xero OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
