import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/app/lib/env";
import { systemBlocks } from "@/app/lib/skills";
import { getCachedAnalysis } from "@/app/lib/xero-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface UploadedDoc {
  kind: "pdf" | "csv";
  name: string;
  // base64 for PDFs, plain text (parsed) for CSVs
  data: string;
}

type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
      title?: string;
    };

function buildInitialUserPrompt(orgName: string, analysisData: unknown): string {
  return `Analyse the tax deductions for ${orgName}. Here is their financial data from Xero:

FINANCIAL DATA:
${JSON.stringify(analysisData, null, 2)}

Explain their tax deduction position in plain English. Reference their actual account names and amounts. Cite IRS publications. Flag anything that needs attention.`;
}

function buildFollowUpPrompt(question: string, analysisData: unknown): string {
  return `The user asked: "${question}"

Xero financial data for context:
${JSON.stringify(analysisData, null, 2)}

Answer their specific question in plain English. Reference their actual numbers. Cite IRS publications where relevant.`;
}

function buildUploadContext(docs: UploadedDoc[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const doc of docs) {
    if (doc.kind === "pdf") {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: doc.data,
        },
        title: doc.name,
      });
    } else if (doc.kind === "csv") {
      blocks.push({
        type: "text",
        text: `The user uploaded a CSV file named "${doc.name}". Contents:\n\n\`\`\`csv\n${doc.data}\n\`\`\``,
      });
    }
  }
  return blocks;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userQuestion: string = body.question || "Analyse my tax deductions";
    const isFollowUp: boolean = body.isFollowUp === true;
    const history: ChatTurn[] = Array.isArray(body.history) ? body.history : [];
    const uploads: UploadedDoc[] = Array.isArray(body.uploads) ? body.uploads : [];
    const forceRefresh: boolean = body.refresh === true;

    const { result: analysisResult, cached } = await getCachedAnalysis({ forceRefresh });
    const orgName = analysisResult.orgName;

    const apiKey = getEnv("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const client = new Anthropic({ apiKey });
    const model = getEnv("CLAUDE_MODEL") || "claude-sonnet-4-6";

    // Assemble messages: prior history (trimmed) + current turn
    const trimmedHistory = history
      .slice(-10)
      .filter((t) => t.role === "user" || t.role === "assistant")
      .map((t) => ({ role: t.role, content: t.content }));

    const currentText = isFollowUp
      ? buildFollowUpPrompt(userQuestion, analysisResult)
      : buildInitialUserPrompt(orgName, analysisResult);

    const currentContent: ContentBlock[] = [
      ...buildUploadContext(uploads),
      { type: "text", text: currentText },
    ];

    const messages = [
      ...trimmedHistory,
      { role: "user" as const, content: currentContent },
    ];

    const stream = client.messages.stream({
      model,
      max_tokens: 2048,
      system: systemBlocks(),
      messages,
    });

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (obj: unknown) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

          try {
            send({ type: "meta", cached });
            if (!isFollowUp) {
              send({ type: "analysis", data: analysisResult });
            }

            let fullText = "";
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                fullText += event.delta.text;
                send({ type: "text", text: event.delta.text });
              }
            }

            // Generate 3 follow-up questions based on the answer
            try {
              const followUps = await generateFollowUps(client, model, fullText, analysisResult);
              send({ type: "followUps", questions: followUps });
            } catch (err) {
              console.error("Follow-up generation failed:", err);
            }

            send({ type: "done" });
            controller.close();
          } catch (error) {
            console.error("Stream error:", error);
            send({ type: "error", message: "Analysis interrupted. Please try again." });
            controller.close();
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error in explain:", error);
    return new Response(JSON.stringify({ error: "Failed to analyse" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function generateFollowUps(
  client: Anthropic,
  model: string,
  lastAnswer: string,
  analysisData: unknown
): Promise<string[]> {
  const resp = await client.messages.create({
    model,
    max_tokens: 300,
    system:
      "You suggest short, specific follow-up questions a small-business owner would naturally ask after reading a tax deductions analysis. Return ONLY a JSON array of 3 strings, no prose, no markdown fence. Each question must be under 80 characters and tied to their specific data.",
    messages: [
      {
        role: "user",
        content: `Their analysis data:\n${JSON.stringify(analysisData).slice(0, 4000)}\n\nAssistant's last answer:\n${lastAnswer.slice(0, 2000)}\n\nReturn 3 follow-up questions as a JSON array of strings.`,
      },
    ],
  });

  const text =
    resp.content.find((b) => b.type === "text")?.type === "text"
      ? (resp.content.find((b) => b.type === "text") as { text: string }).text
      : "";

  // Strip code fences if present
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
  const jsonStart = cleaned.indexOf("[");
  const jsonEnd = cleaned.lastIndexOf("]");
  if (jsonStart === -1 || jsonEnd === -1) return [];

  try {
    const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    if (Array.isArray(parsed)) {
      return parsed.filter((q): q is string => typeof q === "string").slice(0, 3);
    }
  } catch {
    // fall through
  }
  return [];
}
