"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/app/components/Nav";
import AnalysisStream from "@/app/components/AnalysisStream";
import SuggestedQuestions from "@/app/components/SuggestedQuestions";
import InsightCard from "@/app/components/InsightCard";
import DeductionChart from "@/app/components/DeductionChart";
import type { TaxAnalysisResult } from "@/app/lib/types";

interface UploadedDoc { kind: "pdf" | "csv"; name: string; data: string; }
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  analysisData?: TaxAnalysisResult;
  streamedText?: string;
  isStreaming?: boolean;
  loading?: boolean;
  attachments?: { name: string; kind: "pdf" | "csv" }[];
  followUps?: string[];
}
interface ServerMessage {
  id: string; role: "user" | "assistant"; content: string; createdAt: string;
  metadata?: { analysisData?: TaxAnalysisResult; attachments?: { name: string; kind: "pdf" | "csv" }[]; followUps?: string[]; };
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function serverToChat(m: ServerMessage): ChatMessage {
  if (m.role === "user") return { role: "user", content: m.content, attachments: m.metadata?.attachments };
  return { role: "assistant", content: m.metadata?.analysisData ? "" : m.content,
    streamedText: m.metadata?.analysisData ? m.content : undefined,
    analysisData: m.metadata?.analysisData, followUps: m.metadata?.followUps, isStreaming: false };
}

function seedFollowUps(data: TaxAnalysisResult): string[] {
  const q: string[] = [];
  if (data.itemsNeedingReview > 0) q.push("What documentation do I need for the flagged items?");
  if (data.section179.potentialAdditional > 0) q.push(`Can I write off the ${fmt(data.section179.assetValue)} in equipment this year?`);
  const top = data.categories[0];
  if (top) q.push(`Break down my ${fmt(top.total)} in ${top.title.toLowerCase()}`);
  if (q.length < 3) q.push("What should I prepare before meeting my tax advisor?");
  return q.slice(0, 3);
}

function JaxChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgName, setOrgName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<UploadedDoc[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const didAutoRun = useRef(false);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/chat/history");
        if (res.status === 401) { window.location.href = "/api/auth/login"; return; }
        if (res.ok) {
          const data: { orgName: string | null; messages: ServerMessage[] } = await res.json();
          if (data.orgName) setOrgName(data.orgName);
          if (data.messages.length > 0) setMessages(data.messages.map(serverToChat));
        }
      } catch { /* continue */ } finally { setLoading(false); }
    }
    init();
  }, []);

  useEffect(() => {
    if (loading || didAutoRun.current) return;
    const q = searchParams.get("q");
    if (q) { didAutoRun.current = true; runAnalysis(decodeURIComponent(q)); }
    else if (messages.length === 0) { didAutoRun.current = true; runAnalysis("Walk me through my top deduction opportunities."); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const hasShownAnalysis = messages.some((m) => m.analysisData);

  async function clearHistory() {
    if (!confirm("Clear the conversation? This deletes all prior messages.")) return;
    const res = await fetch("/api/chat/history", { method: "DELETE" });
    if (res.ok) { setMessages([]); didAutoRun.current = false; }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadError("");
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/tax/upload", { method: "POST", body: form });
        const body = await res.json();
        if (!res.ok) { setUploadError(body.error || "Upload failed"); continue; }
        setPendingUploads((prev) => [...prev, body as UploadedDoc]);
      } catch { setUploadError("Upload failed"); }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function runAnalysis(question: string, opts: { refresh?: boolean } = {}) {
    if (isAnalysing) return;
    setIsAnalysing(true);
    const uploadsForTurn = pendingUploads;
    setPendingUploads([]);
    setMessages((prev) => [...prev,
      { role: "user", content: question, attachments: uploadsForTurn.map((u) => ({ name: u.name, kind: u.kind })) },
      { role: "assistant", content: "", loading: true },
    ]);
    setTimeout(scrollToBottom, 50);
    try {
      const res = await fetch("/api/tax/explain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, uploads: uploadsForTurn, refresh: opts.refresh === true }),
      });
      if (res.status === 401) { window.location.href = "/api/auth/login"; return; }
      if (!res.ok) throw new Error("Analysis failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let analysisData: TaxAnalysisResult | undefined;
      let streamedText = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "analysis") {
              analysisData = data.data;
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "", analysisData, streamedText: "", isStreaming: true, loading: false }; return u; });
            } else if (data.type === "text") {
              streamedText += data.text;
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], loading: false, streamedText, isStreaming: true }; return u; });
            } else if (data.type === "followUps") {
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], followUps: Array.isArray(data.questions) ? data.questions : [] }; return u; });
            } else if (data.type === "done") {
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], streamedText, isStreaming: false }; return u; });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "Sorry, I had trouble analysing your data. Please try again.", loading: false }; return u; });
    } finally { setIsAnalysing(false); }
  }

  function handleSend() {
    const q = inputValue.trim();
    if (!q && pendingUploads.length === 0) return;
    setInputValue("");
    runAnalysis(q || `Please review the attached ${pendingUploads.map((u) => u.kind.toUpperCase()).join(" and ")}.`);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FAFBFC]">
      <Nav orgName={orgName} />

      <main className="flex-1 overflow-y-auto" style={{ overflowAnchor: "none" }}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

          {/* Top bar */}
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Overview
            </button>
            <div className="flex gap-3">
              {hasShownAnalysis && (
                <button onClick={() => runAnalysis("Re-analyse with the latest Xero data", { refresh: true })} disabled={isAnalysing}
                  className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors">
                  Refresh data
                </button>
              )}
              {messages.length > 1 && (
                <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Clear</button>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#00B7A3] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="flex flex-col items-end gap-1.5">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {msg.attachments.map((a) => (
                          <span key={a.name} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                            {a.kind === "pdf" ? "📄" : "📊"} {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="bg-[#1B2A4A] text-white rounded-2xl rounded-br-sm px-5 py-3 max-w-sm text-sm font-medium shadow-sm">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-start">
                  {/* JAX avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00B7A3] to-[#0e9fd4] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <span className="text-white text-xs font-bold">J</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {msg.loading ? (
                      <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {[0, 150, 300].map((d) => (
                              <div key={d} className="w-2 h-2 bg-[#00B7A3] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
                          </div>
                          <p className="text-sm text-gray-500">Reading your Xero data...</p>
                        </div>
                      </div>
                    ) : msg.analysisData ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <InsightCard label="Total Deductions" value={fmt(msg.analysisData.totalDeductions)} subtitle={`${msg.analysisData.fiscalYear} fiscal year`} accent="teal" />
                          <InsightCard label="Potential Tax Savings" value={fmt(msg.analysisData.estimatedTaxSavings)} subtitle="At 23.2% effective rate" accent="green" />
                          {msg.analysisData.itemsNeedingReview > 0 && (
                            <InsightCard label="Needs Your Attention" value={`${msg.analysisData.itemsNeedingReview} item${msg.analysisData.itemsNeedingReview > 1 ? "s" : ""}`} subtitle="May need documentation" accent="amber" />
                          )}
                          {msg.analysisData.section179.potentialAdditional > 0 && (
                            <InsightCard label="Unclaimed Write-off" value={fmt(msg.analysisData.section179.potentialAdditional)} subtitle="Equipment you could deduct now" accent="blue" />
                          )}
                        </div>
                        {msg.analysisData.categories.length > 0 && <DeductionChart categories={msg.analysisData.categories} />}
                        <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm p-6">
                          <AnalysisStream content={msg.streamedText || ""} isStreaming={msg.isStreaming || false} />
                        </div>
                        {!msg.isStreaming && msg.streamedText && (
                          <SuggestedQuestions questions={msg.followUps?.length ? msg.followUps : seedFollowUps(msg.analysisData)} onSelect={runAnalysis} />
                        )}
                      </>
                    ) : msg.streamedText !== undefined ? (
                      <>
                        <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm p-6">
                          <AnalysisStream content={msg.streamedText || ""} isStreaming={msg.isStreaming || false} />
                        </div>
                        {!msg.isStreaming && msg.followUps?.length && (
                          <SuggestedQuestions questions={msg.followUps} onSelect={runAnalysis} />
                        )}
                      </>
                    ) : (
                      <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm p-5">
                        <AnalysisStream content={msg.content} isStreaming={false} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} style={{ overflowAnchor: "auto", height: "1px" }} />
        </div>
      </main>

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto">
          {pendingUploads.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pendingUploads.map((u) => (
                <span key={u.name} className="inline-flex items-center gap-1.5 text-xs bg-gray-100 border border-gray-200 text-gray-700 pl-2 pr-1 py-1 rounded-lg">
                  {u.kind === "pdf" ? "📄" : "📊"} <span className="max-w-[160px] truncate">{u.name}</span>
                  <button onClick={() => setPendingUploads((p) => p.filter((d) => d.name !== u.name))} className="w-4 h-4 rounded hover:bg-gray-200 flex items-center justify-center text-gray-500">×</button>
                </span>
              ))}
            </div>
          )}
          {uploadError && <p className="text-xs text-red-500 mb-2">{uploadError}</p>}
          <div className="flex gap-2 items-center">
            <input ref={fileInputRef} type="file" accept=".pdf,.csv,application/pdf,text/csv" multiple onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isAnalysing} title="Attach PDF or CSV"
              className="p-2.5 text-gray-400 hover:text-[#00B7A3] hover:bg-gray-50 rounded-xl disabled:opacity-40 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 10-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text" value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={pendingUploads.length > 0 ? "Add a note, or press send..." : "Ask JAX anything about your deductions..."}
              disabled={isAnalysing}
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00B7A3]/30 focus:border-[#00B7A3] disabled:opacity-50 transition-all"
            />
            <button onClick={handleSend} disabled={isAnalysing || (!inputValue.trim() && pendingUploads.length === 0)}
              className="px-4 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-semibold hover:bg-[#253a5e] disabled:opacity-40 transition-colors flex items-center gap-1.5">
              Send
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-2">
            Powered by Claude. Not financial, tax, or legal advice. Always consult a qualified professional.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JaxPage() {
  return <Suspense><JaxChat /></Suspense>;
}
