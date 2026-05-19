import { eq } from "drizzle-orm";
import { getDb, schema } from "@/app/db/client";
import { decryptForTenant, encryptForTenant } from "@/app/db/crypto";

export interface XeroSessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function saveXeroSession(
  xeroTenantId: string,
  tokens: XeroSessionTokens
): Promise<void> {
  const db = getDb();
  const accessTokenEncrypted = encryptForTenant(xeroTenantId, tokens.accessToken);
  const refreshTokenEncrypted = encryptForTenant(xeroTenantId, tokens.refreshToken);

  await db
    .insert(schema.xeroSessions)
    .values({
      xeroTenantId,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      expiresAt: tokens.expiresAt,
    })
    .onConflictDoUpdate({
      target: schema.xeroSessions.xeroTenantId,
      set: {
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt: tokens.expiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function getXeroSession(
  xeroTenantId: string
): Promise<XeroSessionTokens | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.xeroSessions)
    .where(eq(schema.xeroSessions.xeroTenantId, xeroTenantId))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    accessToken: decryptForTenant(xeroTenantId, row.accessTokenEncrypted),
    refreshToken: decryptForTenant(xeroTenantId, row.refreshTokenEncrypted),
    expiresAt: row.expiresAt,
  };
}

export async function deleteXeroSession(xeroTenantId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(schema.xeroSessions)
    .where(eq(schema.xeroSessions.xeroTenantId, xeroTenantId));
}
