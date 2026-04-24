import { getXeroClient } from "./xero-client";
import { getSession } from "./session";
import type { XeroClient } from "xero-node";

/**
 * Returns an authenticated XeroClient and tenantId, refreshing the token if needed.
 * Throws if not authenticated.
 */
export async function getAuthenticatedXero(): Promise<{
  xero: XeroClient;
  tenantId: string;
}> {
  const session = await getSession();

  if (!session.xero) {
    throw new Error("Not authenticated");
  }

  const xero = getXeroClient();
  const { accessToken, refreshToken, tenantId, expiresAt } = session.xero;

  let currentAccessToken = accessToken;
  const now = Math.floor(Date.now() / 1000);

  if (now >= expiresAt) {
    const newTokenSet = await xero.refreshWithRefreshToken(
      process.env.XERO_CLIENT_ID!,
      process.env.XERO_CLIENT_SECRET!,
      refreshToken
    );
    currentAccessToken = newTokenSet.access_token!;
    session.xero = {
      ...session.xero,
      accessToken: newTokenSet.access_token!,
      refreshToken: newTokenSet.refresh_token || refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (newTokenSet.expires_in || 1800),
    };
    await session.save();
  }

  xero.accountingApi.accessToken = currentAccessToken;

  return { xero, tenantId };
}
