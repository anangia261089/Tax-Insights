import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";
import { resolveTenant } from "@/app/lib/tenant";
import { invalidateAnalysisCache } from "@/app/lib/xero-cache";
import { isSameOrigin, csrfError } from "@/app/lib/csrf";
import { getDb, schema } from "@/app/db/client";
import type { EntityType } from "@/app/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_ENTITY_TYPES = new Set<EntityType>([
  "sole_proprietor",
  "s_corp",
  "c_corp",
  "partnership",
  "llc_single",
  "llc_multi",
]);

export async function GET() {
  try {
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    return NextResponse.json({ entityType: tenant.entityType ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return csrfError();
  try {
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    const body = await request.json().catch(() => ({}));
    const entityType: string = body.entityType;

    if (!entityType || !VALID_ENTITY_TYPES.has(entityType as EntityType)) {
      return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
    }

    await getDb()
      .update(schema.tenants)
      .set({ entityType })
      .where(eq(schema.tenants.id, tenant.id));

    // Bust the in-process cache so the next analysis uses the new rate
    invalidateAnalysisCache(xeroTenantId);

    return NextResponse.json({ entityType });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
