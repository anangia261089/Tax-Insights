import { getXeroClient } from "./xero-client";
import { getSession } from "./session";
import { getXeroSession, saveXeroSession } from "./xero-session-store";
import type { XeroClient } from "xero-node";

/**
 * Returns an authenticated XeroClient and tenantId, refreshing the token if needed.
 * Tokens live in the DB (xero_sessions); the cookie only holds the tenant ID pointer.
 * Throws "Not authenticated" if the session or DB row is missing.
 */
export async function getAuthenticatedXero(): Promise<{
  xero: XeroClient;
  tenantId: string;
}> {
  const session = await getSession();

  if (!session.xeroTenantId) {
    throw new Error("Not authenticated");
  }

  const tenantId = session.xeroTenantId;
  const stored = await getXeroSession(tenantId);

  if (!stored) {
    throw new Error("Not authenticated");
  }

  const xero = getXeroClient();
  let { accessToken, refreshToken, expiresAt } = stored;
  const now = Math.floor(Date.now() / 1000);

  if (now >= expiresAt) {
    const newTokenSet = await xero.refreshWithRefreshToken(
      process.env.XERO_CLIENT_ID!,
      process.env.XERO_CLIENT_SECRET!,
      refreshToken
    );
    accessToken = newTokenSet.access_token!;
    refreshToken = newTokenSet.refresh_token || refreshToken;
    expiresAt = Math.floor(Date.now() / 1000) + (newTokenSet.expires_in || 1800);
    await saveXeroSession(tenantId, { accessToken, refreshToken, expiresAt });
  }

  xero.accountingApi.accessToken = accessToken;

  return { xero, tenantId };
}
