import { NextRequest, NextResponse } from "next/server";
import { getXeroClient } from "@/app/lib/xero-client";
import { getSession } from "@/app/lib/session";

export async function GET(request: NextRequest) {
  try {
    const xero = getXeroClient();
    await xero.initialize();

    // Exchange the auth code for tokens
    // xero-node expects the full callback URL including query params
    const tokenSet = await xero.apiCallback(request.url);

    // Get the connected tenants (Xero organisations)
    await xero.updateTenants(false);
    const tenantId = xero.tenants[0]?.tenantId;

    if (!tenantId) {
      return NextResponse.redirect(
        new URL("/?error=no_tenant", request.url)
      );
    }

    // Store tokens in an encrypted session cookie
    // Note: we skip idToken to keep the cookie under the 4096-byte browser limit
    const session = await getSession();
    session.xero = {
      accessToken: tokenSet.access_token!,
      refreshToken: tokenSet.refresh_token!,
      idToken: "",
      tenantId,
      expiresAt: Math.floor(Date.now() / 1000) + (tokenSet.expires_in || 1800),
    };
    await session.save();

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Xero OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }
}
