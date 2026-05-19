import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";
import { resolveTenant } from "@/app/lib/tenant";
import {
  loadMessages,
  updateConversation,
  deleteConversationById,
} from "@/app/lib/chat-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    const messages = await loadMessages({ tenantId: tenant.id, conversationId: id });
    return NextResponse.json({ messages, orgName: tenant.orgName });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    const body = await request.json().catch(() => ({}));
    const patch: { title?: string; isPinned?: boolean } = {};
    if (typeof body.title === "string") patch.title = body.title;
    if (typeof body.isPinned === "boolean") patch.isPinned = body.isPinned;
    const thread = await updateConversation(tenant.id, id, patch);
    return NextResponse.json({ thread });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    await deleteConversationById(tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
  }
}
