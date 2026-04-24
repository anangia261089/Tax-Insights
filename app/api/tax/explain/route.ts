import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthenticatedXero } from "@/app/lib/xero-auth";
import { analyseDeductions } from "@/app/lib/tax-engine";
import { getEnv } from "@/app/lib/env";

export const dynamic = "force-dynamic";

function buildSystemPrompt(): string {
  return `You are a tax insights assistant that explains business tax deductions in plain, clear English. You help small business owners understand their tax position without jargon.

RULES:
- ONLY reference numbers and accounts that appear in the FINANCIAL DATA provided. Never invent or estimate figures.
- Cite specific IRS rules using their publication name (e.g., "IRS Publication 535, Chapter 1" not "§162").
- Explain WHY each expense qualifies as a deduction in everyday language.
- When an item is flagged for review, explain exactly what documentation is needed and why.
- Use the business owner's actual account names and dollar amounts in your explanation.
- Format currency as $X,XXX with commas.
- Use markdown formatting: **bold** for key numbers, bullet points for lists, ### for section headers.
- Keep each section to 2-3 sentences max. Be concise but complete.
- End with a clear "What to do next" section with numbered action items.
- NEVER say "I recommend" or give direct tax advice. Say "this may qualify" or "consider discussing with your tax advisor".

IRS REFERENCE TABLE (use these plain-English names, not section codes):
- Business Operating Costs → IRS Publication 535 (Business Expenses) — covers rent, utilities, insurance, office supplies, software, marketing, professional fees
- Employee & Contractor Pay → IRS Publication 15 (Employer's Tax Guide) + Publication 1099 series — wages, salaries, subcontractor payments
- Vehicle & Travel Costs → IRS Publication 463 (Travel, Gift, and Car Expenses) — auto, fuel, mileage, parking, tolls, business travel
- Equipment & Asset Write-offs → IRS Publication 946 (Depreciating Property) — Section 179 immediate deduction for equipment, computers, furniture
- Meals & Entertainment → IRS Publication 463 — generally 50% deductible, requires date/attendees/business purpose documentation

FORMATTING:
Start with a brief 1-sentence summary of the overall tax position.
Then for each deduction category, use this structure:

### [Plain English Category Name]
**[Total amount]** across [number] expense types

[2-3 sentence explanation of what this covers and why it's deductible, referencing their specific accounts]

[If any items flagged for review, explain why in a callout]

End with:
### What to do next
[Numbered action items based on their specific situation]`;
}

function buildUserPrompt(orgName: string, analysisData: Record<string, unknown>): string {
  return `Analyse the tax deductions for ${orgName}. Here is their financial data from Xero:

FINANCIAL DATA:
${JSON.stringify(analysisData, null, 2)}

Explain their tax deduction position in plain English. Reference their actual account names and amounts. Cite IRS publications. Flag anything that needs attention.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userQuestion = body.question || "Analyse my tax deductions";
    const isFollowUp = body.isFollowUp === true;

    // First, get the analysis data from Xero
    const { xero, tenantId } = await getAuthenticatedXero();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateFilter = `Date >= DateTime(${oneYearAgo.getFullYear()}, ${oneYearAgo.getMonth() + 1}, ${oneYearAgo.getDate()})`;
    const now = new Date();
    const fromDate = `${now.getFullYear() - 1}-04-01`;
    const toDate = `${now.getFullYear()}-03-31`;
    const today = now.toISOString().split("T")[0];

    const [txRes, pnlRes, bsRes, contactsRes, orgRes] = await Promise.all([
      xero.accountingApi.getBankTransactions(tenantId, undefined, dateFilter),
      xero.accountingApi.getReportProfitAndLoss(tenantId, fromDate, toDate),
      xero.accountingApi.getReportBalanceSheet(tenantId, today),
      xero.accountingApi.getContacts(tenantId, undefined, "IsSupplier==true"),
      xero.accountingApi.getOrganisations(tenantId),
    ]);

    const orgName = orgRes.body.organisations?.[0]?.name || "Your Organisation";

    const transactions = (txRes.body.bankTransactions || []).map((tx) => ({
      total: tx.total,
      contact: tx.contact?.name,
      type: tx.type?.toString(),
      lineItems: (tx.lineItems || []).map((li) => ({
        description: li.description,
        amount: li.lineAmount,
        accountCode: li.accountCode,
      })),
    }));

    const contacts = (contactsRes.body.contacts || []).map((c) => ({
      name: c.name,
      isSupplier: c.isSupplier,
    }));

    const analysisResult = analyseDeductions(
      orgName,
      transactions,
      pnlRes.body.reports?.[0] || null,
      bsRes.body.reports?.[0] || null,
      contacts
    );

    // Now stream Claude's explanation
    const apiKey = getEnv("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set — checked process.env and .env.local");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const client = new Anthropic({ apiKey });
    const model = getEnv("CLAUDE_MODEL") || "claude-sonnet-4-6";

    const userPrompt = isFollowUp
      ? `The user asked: "${userQuestion}"\n\nHere is their financial data from Xero for context:\n${JSON.stringify(analysisResult, null, 2)}\n\nAnswer their specific question in plain English. Reference their actual numbers. Cite IRS publications where relevant.`
      : buildUserPrompt(orgName, analysisResult as unknown as Record<string, unknown>);

    const stream = client.messages.stream({
      model,
      max_tokens: 2048,
      system: buildSystemPrompt(),
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Return SSE stream
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            // Send structured data for cards (only on first analysis, not follow-ups)
            if (!isFollowUp) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "analysis", data: analysisResult })}\n\n`
                )
              );
            }

            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`
                  )
                );
              }
            }

            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: "done" })}\n\n`
              )
            );
            controller.close();
          } catch (error) {
            console.error("Stream error:", error);
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: "error", message: "Analysis interrupted. Please try again." })}\n\n`
              )
            );
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
