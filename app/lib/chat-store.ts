import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/app/db/client";
import { decryptForTenant, decryptJson, encryptForTenant, encryptJson } from "@/app/db/crypto";
import type { Conversation, Message } from "@/app/db/schema";
import type { TaxAnalysisResult } from "@/app/lib/types";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  metadata?: {
    analysisData?: TaxAnalysisResult;
    attachments?: { name: string; kind: "pdf" | "csv" }[];
    followUps?: string[];
  };
}

/**
 * v1: one active conversation per tenant. Returns the most recent one,
 * creating it if none exists.
 */
export async function getOrCreateActiveConversation(tenantId: string): Promise<Conversation> {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.tenantId, tenantId))
    .orderBy(desc(schema.conversations.updatedAt))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(schema.conversations)
    .values({ tenantId })
    .returning();
  return created;
}

export async function appendMessage(params: {
  tenantId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: StoredMessage["metadata"];
}): Promise<string> {
  const db = getDb();
  const contentEncrypted = encryptForTenant(params.tenantId, params.content);
  const metadataEncrypted = params.metadata
    ? encryptJson(params.tenantId, params.metadata)
    : null;

  const [inserted] = await db
    .insert(schema.messages)
    .values({
      tenantId: params.tenantId,
      conversationId: params.conversationId,
      role: params.role,
      contentEncrypted,
      metadataEncrypted,
    })
    .returning({ id: schema.messages.id });

  // Touch conversation updated_at
  await db
    .update(schema.conversations)
    .set({ updatedAt: new Date() })
    .where(eq(schema.conversations.id, params.conversationId));

  return inserted.id;
}

export async function loadMessages(params: {
  tenantId: string;
  conversationId: string;
  limit?: number;
}): Promise<StoredMessage[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.tenantId, params.tenantId),
        eq(schema.messages.conversationId, params.conversationId)
      )
    )
    .orderBy(asc(schema.messages.createdAt))
    .limit(params.limit ?? 200);

  return rows.map((r: Message) => {
    const message: StoredMessage = {
      id: r.id,
      role: r.role as "user" | "assistant",
      content: decryptForTenant(params.tenantId, r.contentEncrypted),
      createdAt: r.createdAt,
    };
    if (r.metadataEncrypted) {
      try {
        message.metadata = decryptJson(params.tenantId, r.metadataEncrypted);
      } catch (err) {
        console.error("Failed to decrypt message metadata", r.id, err);
      }
    }
    return message;
  });
}

/**
 * Clears all messages for a tenant by deleting their conversation(s).
 * Cascade takes care of messages.
 */
export async function clearConversation(tenantId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.conversations).where(eq(schema.conversations.tenantId, tenantId));
}
