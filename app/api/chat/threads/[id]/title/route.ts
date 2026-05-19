import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/app/lib/env";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";
import { resolveTenant } from "@/app/lib/tenant";
import { updateConversation } from "@/app/lib/chat-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId: xeroTenantId } = await getAuthenticatedXero();
    const tenant = await resolveTenant(xeroTenantId);
    const body = await request.json().catch(() => ({}));
    const firstMessage: string = body.firstMessage || "";

    const apiKey = getEnv("ANTHROPIC_API_KEY");
    if (!apiKey || !firstMessage) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const model = getEnv("CLAUDE_MODEL") || "claude-sonnet-4-6";

    const resp = await client.messages.create({
      model,
      max_tokens: 20,
      system: "Generate a 2–4 word thread title for a tax chat. Return ONLY the title, no quotes, no punctuation.",
      messages: [{ role: "user", content: `First message: "${firstMessage.slice(0, 200)}"` }],
    });

    const title =
      resp.content.find((b) => b.type === "text")?.type === "text"
        ? (resp.content.find((b) => b.type === "text") as { text: string }).text.trim()
        : firstMessage.slice(0, 40);

    await updateConversation(tenant.id, id, { title });
    return NextResponse.json({ title });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 });
  }
}
