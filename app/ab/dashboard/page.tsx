"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Nav from "@/app/components/Nav";
import AnalysisStream from "@/app/components/AnalysisStream";
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

// Risk badge component for AB view
function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-green-100 text-green-800 border border-green-200",
    medium: "bg-amber-100 text-amber-800 border border-amber-200",
    high: "bg-red-100 text-red-800 border border-red-200",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[level]}`}>
      {level.toUpperCase()} RISK
    </span>
  );
}

// Detailed tax position table for accountants
function TaxPositionTable({ data }: { data: TaxAnalysisResult }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Tax Position — {data.fiscalYear}</h3>
        <span className="text-xs text-gray-500">IRS Pub. references included</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left px-5 py-3">Category</th>
            <th className="text-left px-5 py-3">IRS Reference</th>
            <th className="text-right px-5 py-3">Amount</th>
            <th className="text-right px-5 py-3">Items</th>
            <th className="text-center px-5 py-3">Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.categories.map((cat, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-5 py-3.5 font-medium text-gray-900">{cat.title}</td>
              <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{cat.section}</td>
              <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                {formatCurrency(cat.total)}
              </td>
              <td className="px-5 py-3.5 text-right text-gray-500">{cat.items.length}</td>
              <td className="px-5 py-3.5 text-center">
                <RiskBadge level={cat.items.some((i) => i.status === "review") ? "medium" : "low"} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold">
            <td className="px-5 py-3.5 text-gray-900">Total Deductions</td>
            <td className="px-5 py-3.5" />
            <td className="px-5 py-3.5 text-right text-[#00B7A3] text-base">
              {formatCurrency(data.totalDeductions)}
            </td>
            <td className="px-5 py-3.5" />
            <td className="px-5 py-3.5" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Flagged items panel
function FlaggedItems({ data }: { data: TaxAnalysisResult }) {
  if (data.itemsNeedingReview === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm font-semibold text-amber-900">
          {data.itemsNeedingReview} item{data.itemsNeedingReview > 1 ? "s" : ""} require documentation
        </span>
      </div>
      <p className="text-xs text-amber-800">
        Review flagged items with client before filing. Ensure receipts, business purpose
        statements, and attendee records are on file.
      </p>
    </div>
  );
}

// Section 179 opportunity panel
function Section179Panel({ data }: { data: TaxAnalysisResult }) {
  if (data.section179.potentialAdditional <= 0) return null;
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-sm font-semibold text-blue-900">Section 179 Opportunity</span>
        <span className="text-xs text-blue-600 font-mono ml-auto">IRS Pub. 946</span>
      </div>
      <p className="text-xs text-blue-800 mt-1">
        <strong>{formatCurrency(data.section179.potentialAdditional)}</strong> in additional
        equipment deductions available via Section 179 election.
        Asset value on books: {formatCurrency(data.section179.assetValue)}.
        Consider accelerating deduction in current tax year.
      </p>
    </div>
  );
}

const AB_QUESTIONS = [
  "Summarise the full tax position for client review",
  "List all items that need documentation before filing",
  "What Section 179 elections should we make this year?",
  "Are there any year-end strategies to reduce tax liability?",
];

export default function ABDashboard() {
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
            content: `**Accountant View** — connected to **${data.name}**.\n\nI have access to the full tax position with IRS references and risk flags. What would you like to review?`,
          },
        ]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const hasShownAnalysis = messages.some((m) => m.analysisData);

  async function runAnalysis(question: string) {
    if (isAnalysing) return;
    setIsAnalysing(true);

    const isFollowUp = hasShownAnalysis;
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    const loadingIdx = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", loading: true },
    ]);

    try {
      // AB mode: request professional-level analysis
      const res = await fetch("/api/tax/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, isFollowUp, mode: "accountant" }),
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
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[loadingIdx] = {
          role: "assistant",
          content: "Analysis failed. Please try again.",
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6FA]">
      <Nav orgName={orgName} />

      {/* AB mode banner */}
      <div className="bg-[#1B2A4A] text-white text-xs text-center py-1.5 font-medium tracking-wide">
        ACCOUNTANT VIEW — Full IRS references · Risk flags · Professional detail
      </div>

      {loading ? (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[#00B7A3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Connecting to Xero...</p>
          </div>
        </main>
      ) : error ? (
        <main className="flex-1 flex items-center justify-center">
          <p className="text-red-600">{error}</p>
        </main>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end mb-2">
                      <div className="bg-[#1B2A4A] text-white rounded-2xl rounded-br-md px-5 py-3 max-w-md text-sm font-medium shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 items-start">
                      <div className="w-9 h-9 bg-[#1B2A4A] rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0 space-y-3">
                        {msg.loading ? (
                          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-[#1B2A4A] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 bg-[#1B2A4A] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 bg-[#1B2A4A] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                              <p className="text-sm text-gray-500">Pulling Xero data and running tax analysis...</p>
                            </div>
                          </div>
                        ) : msg.analysisData ? (
                          <>
                            {/* Detailed tax position table */}
                            <TaxPositionTable data={msg.analysisData} />

                            {/* Flagged items */}
                            <FlaggedItems data={msg.analysisData} />

                            {/* Section 179 */}
                            <Section179Panel data={msg.analysisData} />

                            {/* Claude's professional analysis */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                              <AnalysisStream
                                content={msg.streamedText || ""}
                                isStreaming={msg.isStreaming || false}
                              />
                            </div>

                            {/* Follow-up questions */}
                            {!msg.isStreaming && msg.streamedText && (
                              <div className="flex flex-wrap gap-2">
                                {[
                                  "What documentation is required for flagged items?",
                                  "Draft a client summary email",
                                  "What are the filing deadlines to flag?",
                                ].map((q) => (
                                  <button
                                    key={q}
                                    onClick={() => runAnalysis(q)}
                                    disabled={isAnalysing}
                                    className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-[#1B2A4A] hover:text-[#1B2A4A] transition-all disabled:opacity-40"
                                  >
                                    {q}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : msg.streamedText !== undefined ? (
                          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <AnalysisStream
                              content={msg.streamedText || ""}
                              isStreaming={msg.isStreaming || false}
                            />
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <AnalysisStream content={msg.content} isStreaming={false} />
                            {i === 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {AB_QUESTIONS.map((q) => (
                                  <button
                                    key={q}
                                    onClick={() => runAnalysis(q)}
                                    disabled={isAnalysing}
                                    className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-gray-700 hover:border-[#1B2A4A] hover:text-[#1B2A4A] transition-all disabled:opacity-40"
                                  >
                                    {q}
                                  </button>
                                ))}
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

          <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask a professional tax question..."
                  disabled={isAnalysing}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] disabled:opacity-50 transition-all"
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
                Powered by Claude. For professional review only — always verify before filing.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
