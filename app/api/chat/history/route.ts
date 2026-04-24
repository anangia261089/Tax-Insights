import { NextResponse } from "next/server";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";
import { resolveTenant } from "@/app/lib/tenant";
import {
  clearConversation,
  getOrCreateActiveConversation,
  loadMessages,
} from "@/app/lib/chat-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    const conversation = await getOrCreateActiveConversation(tenant.id);
    const messages = await loadMessages({
      tenantId: tenant.id,
      conversationId: conversation.id,
    });
    return NextResponse.json({
      conversationId: conversation.id,
      orgName: tenant.orgName,
      messages,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Error loading chat history:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    await clearConversation(tenant.id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Error clearing conversation:", error);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
