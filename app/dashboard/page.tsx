"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Nav from "@/app/components/Nav";
import InsightCard from "@/app/components/InsightCard";
import AnalysisStream from "@/app/components/AnalysisStream";
import SuggestedQuestions from "@/app/components/SuggestedQuestions";
import type { TaxAnalysisResult } from "@/app/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  analysisData?: TaxAnalysisResult;
  streamedText?: string;
  isStreaming?: boolean;
  loading?: boolean;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function generateFollowUps(data: TaxAnalysisResult): string[] {
  const questions: string[] = [];

  if (data.itemsNeedingReview > 0) {
    questions.push("What documentation do I need for the flagged items?");
  }

  if (data.section179.potentialAdditional > 0) {
    questions.push(
      `Can I write off the ${formatCurrency(data.section179.assetValue)} in equipment this year?`
    );
  }

  const topCat = data.categories[0];
  if (topCat) {
    questions.push(
      `Break down my ${formatCurrency(topCat.total)} in business operating costs`
    );
  }

  if (questions.length < 3) {
    questions.push("What should I prepare before meeting my tax advisor?");
  }

  return questions.slice(0, 3);
}

export default function Dashboard() {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    fetch("/api/xero/org")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/api/auth/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to connect");
        const data = await res.json();
        setOrgName(data.name);
        setMessages([
          {
            role: "assistant",
            content: `Hi! I'm connected to **${data.name}**. I can analyse your tax deductions, find missed opportunities, and explain everything in plain English.\n\nWhat would you like to know?`,
          },
        ]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Track whether we've already shown the analysis cards
  const hasShownAnalysis = messages.some((m) => m.analysisData);

  async function runAnalysis(question: string) {
    if (isAnalysing) return;
    setIsAnalysing(true);

    const isFollowUp = hasShownAnalysis;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    // Add loading message
    const loadingIdx = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
        loading: true,
      },
    ]);

    try {
      const res = await fetch("/api/tax/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, isFollowUp }),
      });

      if (res.status === 401) {
        window.location.href = "/api/auth/login";
        return;
      }
      if (!res.ok) throw new Error("Analysis failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let analysisData: TaxAnalysisResult | undefined;
      let streamedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "analysis") {
              analysisData = data.data;
              // Switch from loading to streaming
              setMessages((prev) => {
                const updated = [...prev];
                updated[loadingIdx] = {
                  role: "assistant",
                  content: "",
                  analysisData,
                  streamedText: "",
                  isStreaming: true,
                  loading: false,
                };
                return updated;
              });
            } else if (data.type === "text") {
              streamedText += data.text;
              setMessages((prev) => {
                const updated = [...prev];
                // Also switch from loading to streaming on first text chunk
                updated[loadingIdx] = {
                  ...updated[loadingIdx],
                  loading: false,
                  streamedText,
                  isStreaming: true,
                };
                return updated;
              });
            } else if (data.type === "done") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[loadingIdx] = {
                  ...updated[loadingIdx],
                  streamedText,
                  isStreaming: false,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[loadingIdx] = {
          role: "assistant",
          content: "Sorry, I had trouble analysing your data. Please try again or reconnect your Xero account.",
          loading: false,
        };
        return updated;
      });
    } finally {
      setIsAnalysing(false);
    }
  }

  function handleSend() {
    const q = inputValue.trim();
    if (!q) return;
    setInputValue("");
    runAnalysis(q);
  }

  const initialQuestions = [
    "Analyse my tax deductions",
    "Find missed deduction opportunities",
    "What can I write off this year?",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFC]">
      <Nav orgName={orgName} />

      {loading ? (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[#00B7A3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Connecting to Xero...</p>
          </div>
        </main>
      ) : error ? (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <p className="text-red-600 mb-4">{error}</p>
            <a href="/api/auth/login" className="text-[#00B7A3] hover:underline text-sm">
              Reconnect
            </a>
          </div>
        </main>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    /* User message */
                    <div className="flex justify-end mb-2">
                      <div className="bg-[#1B2A4A] text-white rounded-2xl rounded-br-md px-5 py-3 max-w-md text-sm font-medium shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    /* Assistant message */
                    <div className="flex gap-3 items-start">
                      <div className="w-9 h-9 bg-gradient-to-br from-[#00B7A3] to-[#0e9fd4] rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        {msg.loading ? (
                          /* Loading state */
                          <div className="bg-white rounded-2xl rounded-tl-md border border-gray-100 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-[#00B7A3] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 bg-[#00B7A3] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 bg-[#00B7A3] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                              <p className="text-sm text-gray-500">
                                Pulling your data from Xero and analysing...
                              </p>
                            </div>
                          </div>
                        ) : msg.analysisData ? (
                          /* Full analysis response */
                          <div className="space-y-4">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 gap-3">
                              <InsightCard
                                label="Total Deductions"
                                value={formatCurrency(msg.analysisData.totalDeductions)}
                                subtitle={`${msg.analysisData.fiscalYear} fiscal year`}
                                accent="teal"
                              />
                              <InsightCard
                                label="Potential Tax Savings"
                                value={formatCurrency(msg.analysisData.estimatedTaxSavings)}
                                subtitle="At 23.2% effective rate"
                                accent="green"
                              />
                              {msg.analysisData.itemsNeedingReview > 0 && (
                                <InsightCard
                                  label="Needs Your Attention"
                                  value={`${msg.analysisData.itemsNeedingReview} item${msg.analysisData.itemsNeedingReview > 1 ? "s" : ""}`}
                                  subtitle="May need documentation"
                                  accent="amber"
                                />
                              )}
                              {msg.analysisData.section179.potentialAdditional > 0 && (
                                <InsightCard
                                  label="Unclaimed Write-off"
                                  value={formatCurrency(msg.analysisData.section179.potentialAdditional)}
                                  subtitle="Equipment you could deduct now"
                                  accent="blue"
                                />
                              )}
                            </div>

                            {/* Streamed explanation */}
                            <div className="bg-white rounded-2xl rounded-tl-md border border-gray-100 p-6 shadow-sm">
                              <AnalysisStream
                                content={msg.streamedText || ""}
                                isStreaming={msg.isStreaming || false}
                              />
                            </div>

                            {/* Follow-up questions (only after streaming is done) */}
                            {!msg.isStreaming && msg.streamedText && (
                              <SuggestedQuestions
                                questions={generateFollowUps(msg.analysisData)}
                                onSelect={runAnalysis}
                              />
                            )}
                          </div>
                        ) : msg.streamedText !== undefined ? (
                          /* Follow-up response (text only, no cards) */
                          <div className="bg-white rounded-2xl rounded-tl-md border border-gray-100 p-6 shadow-sm">
                            <AnalysisStream
                              content={msg.streamedText || ""}
                              isStreaming={msg.isStreaming || false}
                            />
                          </div>
                        ) : (
                          /* Simple text message (welcome) */
                          <div className="bg-white rounded-2xl rounded-tl-md border border-gray-100 p-5 shadow-sm">
                            <AnalysisStream content={msg.content} isStreaming={false} />
                            {i === 0 && (
                              <div className="mt-4">
                                <SuggestedQuestions
                                  questions={initialQuestions}
                                  onSelect={runAnalysis}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </main>

          {/* Input bar */}
          <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about your tax deductions..."
                  disabled={isAnalysing}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00B7A3]/30 focus:border-[#00B7A3] disabled:opacity-50 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={isAnalysing || !inputValue.trim()}
                  className="px-5 py-3 bg-[#1B2A4A] text-white rounded-xl text-sm font-medium hover:bg-[#253a5e] disabled:opacity-40 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-[11px] text-gray-400 mt-2">
                Powered by Claude. Not financial, tax, or legal advice. Always consult a qualified professional.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
