import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/app/db/client";
import type { Tenant } from "@/app/db/schema";

/**
 * Resolves the Tenant row for the given Xero tenant ID, creating it on first access.
 * Updates last_active_at on every call. Callers must have already verified auth.
 */
export async function resolveTenant(
  xeroTenantId: string,
  orgName?: string
): Promise<Tenant> {
  const db = getDb();

  const existing = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.xeroTenantId, xeroTenantId))
    .limit(1);

  if (existing.length > 0) {
    const t = existing[0];
    // Fire-and-forget last-active update; don't block on it
    await db
      .update(schema.tenants)
      .set({
        lastActiveAt: new Date(),
        // Refresh org name and clear any pending deletion if they're back
        orgName: orgName ?? t.orgName,
        disconnectScheduledAt: null,
      })
      .where(eq(schema.tenants.id, t.id));
    return { ...t, lastActiveAt: new Date(), orgName: orgName ?? t.orgName };
  }

  const [created] = await db
    .insert(schema.tenants)
    .values({
      xeroTenantId,
      orgName: orgName ?? null,
    })
    .onConflictDoUpdate({
      target: schema.tenants.xeroTenantId,
      set: {
        lastActiveAt: sql`now()`,
        orgName: orgName ?? sql`${schema.tenants.orgName}`,
      },
    })
    .returning();

  return created;
}

/**
 * Schedule a tenant's data for hard-deletion after the retention window.
 * The cron job in /api/cron/purge-tenants actually deletes the rows.
 */
export async function scheduleTenantDeletion(tenantId: string, retentionDays = 7): Promise<void> {
  const db = getDb();
  const scheduledAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  await db
    .update(schema.tenants)
    .set({ disconnectScheduledAt: scheduledAt })
    .where(eq(schema.tenants.id, tenantId));
}
