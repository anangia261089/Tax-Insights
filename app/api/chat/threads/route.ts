import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";
import { resolveTenant } from "@/app/lib/tenant";
import { listConversations, createConversation } from "@/app/lib/chat-store";
import { isSameOrigin, csrfError } from "@/app/lib/csrf";
import { getDb } from "@/app/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensureIsPinnedColumn() {
  try {
    await getDb().execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false`);
  } catch { /* already exists or no-op */ }
}

export async function GET() {
  await ensureIsPinnedColumn();
  try {
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    const threads = await listConversations(tenant.id);
    return NextResponse.json({ threads, orgName: tenant.orgName });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Failed to load threads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return csrfError();
  try {
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    const body = await request.json().catch(() => ({}));
    const thread = await createConversation(tenant.id, body.title ?? null);
    return NextResponse.json({ thread });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
