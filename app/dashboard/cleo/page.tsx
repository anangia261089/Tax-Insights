"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/app/components/Nav";
import AnalysisStream from "@/app/components/AnalysisStream";
import SuggestedQuestions from "@/app/components/SuggestedQuestions";
import InsightCard from "@/app/components/InsightCard";
import DeductionChart from "@/app/components/DeductionChart";
import type { TaxAnalysisResult } from "@/app/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Thread {
  id: string;
  title: string | null;
  isPinned: boolean;
  updatedAt: string;
  messageCount: number;
}

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
  metadata?: {
    analysisData?: TaxAnalysisResult;
    attachments?: { name: string; kind: "pdf" | "csv" }[];
    followUps?: string[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function serverToChat(m: ServerMessage): ChatMessage {
  if (m.role === "user") return { role: "user", content: m.content, attachments: m.metadata?.attachments };
  return {
    role: "assistant",
    content: m.metadata?.analysisData ? "" : m.content,
    streamedText: m.metadata?.analysisData ? m.content : undefined,
    analysisData: m.metadata?.analysisData,
    followUps: m.metadata?.followUps,
    isStreaming: false,
  };
}

// Data-driven starter suggestions for empty state
function buildStarterSuggestions(data: TaxAnalysisResult): string[] {
  const q: string[] = [];
  q.push(`Walk me through my ${fmt(data.totalDeductions)} in deductions`);
  if (data.section179.potentialAdditional > 0)
    q.push(`Can I write off my ${fmt(data.section179.assetValue)} in equipment this year?`);
  const topMedium = data.categories.find((c) => c.confidence === "medium");
  if (topMedium)
    q.push(`What documentation do I need for my ${topMedium.title.toLowerCase()} expenses?`);
  if (data.itemsNeedingReview > 0 && q.length < 3)
    q.push(`I have ${data.itemsNeedingReview} items flagged — what should I do?`);
  if (q.length < 3)
    q.push("What should I prepare before meeting my tax advisor?");
  return q.slice(0, 3);
}

// ─── Sidebar thread item ───────────────────────────────────────────────────────

function ThreadItem({
  thread, isActive, onSelect, onRename, onPin, onDelete,
}: {
  thread: Thread; isActive: boolean;
  onSelect: () => void; onRename: (t: string) => void;
  onPin: () => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thread.title || "New thread");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== (thread.title || "New thread")) onRename(t);
    else setDraft(thread.title || "New thread");
  }

  return (
    <div
      onClick={() => !editing && onSelect()}
      className={`group relative rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
        isActive ? "bg-[#1B2A4A] text-white" : "hover:bg-gray-100 text-gray-700"
      }`}
    >
      <div className="flex items-start gap-1.5 pr-16">
        {thread.isPinned && (
          <span className={`text-[10px] mt-0.5 shrink-0 ${isActive ? "text-white/60" : "text-[#00B7A3]"}`}>📌</span>
        )}
        {editing ? (
          <input ref={inputRef} value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(thread.title || "New thread"); } }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm bg-white text-gray-900 rounded px-1 outline-none border border-[#00B7A3] min-w-0"
          />
        ) : (
          <span className="flex-1 text-sm leading-snug line-clamp-2 min-w-0">
            {thread.title || "New thread"}
          </span>
        )}
      </div>
      <p className={`text-[11px] mt-0.5 ${isActive ? "text-white/50" : "text-gray-400"}`}>
        {relativeDate(thread.updatedAt)}
      </p>
      {!editing && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-2 hidden group-hover:flex gap-0.5"
        >
          <button onClick={() => setEditing(true)} title="Rename"
            className={`p-1 rounded text-xs transition-colors ${isActive ? "text-white/60 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"}`}>✏️</button>
          <button onClick={onPin} title={thread.isPinned ? "Unpin" : "Pin"}
            className={`p-1 rounded text-xs transition-colors ${isActive ? "text-white/60 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"}`}>{thread.isPinned ? "📌" : "📍"}</button>
          <button onClick={onDelete} title="Delete"
            className={`p-1 rounded text-xs transition-colors ${isActive ? "text-white/60 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"}`}>🗑️</button>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  analysisPreview,
  onSelect,
  onCreateThread,
}: {
  analysisPreview: TaxAnalysisResult | null;
  onSelect: (q: string) => void;
  onCreateThread: () => void;
}) {
  const suggestions = analysisPreview ? buildStarterSuggestions(analysisPreview) : null;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00B7A3] to-[#0e9fd4] flex items-center justify-center mb-5 shadow-lg">
        <span className="text-white text-2xl font-bold">C</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Hi, I&apos;m Cleo</h2>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
        Your AI tax advisor. I&apos;ve analysed your Xero data and found{" "}
        {analysisPreview
          ? <strong className="text-gray-700">{fmt(analysisPreview.totalDeductions)} in deductions</strong>
          : "some deduction opportunities"
        }{" "}worth exploring.
      </p>

      {suggestions ? (
        <div className="w-full space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Where would you like to start?
          </p>
          {suggestions.map((q) => (
            <button key={q} onClick={() => onSelect(q)}
              className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#00B7A3] hover:bg-[#00B7A3]/5 text-sm text-gray-700 transition-all group">
              <span className="flex items-center justify-between gap-3">
                <span>{q}</span>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-[#00B7A3] shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          ))}
          <p className="text-xs text-gray-400 pt-2">or type your own question below</p>
        </div>
      ) : (
        <button onClick={onCreateThread}
          className="px-6 py-3 bg-[#1B2A4A] text-white rounded-xl text-sm font-semibold hover:bg-[#253a5e] transition-colors">
          Start a thread
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function CleoChat() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orgName, setOrgName] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<UploadedDoc[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [analysisPreview, setAnalysisPreview] = useState<TaxAnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const qParamHandled = useRef(false);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Silently fetch Xero analysis for empty-state suggestions (no message sent)
  async function fetchAnalysisPreview() {
    try {
      const res = await fetch("/api/tax/analyse");
      if (res.ok) {
        const data: TaxAnalysisResult = await res.json();
        setAnalysisPreview(data);
      }
    } catch { /* non-critical */ }
  }

  async function loadThreads(): Promise<Thread[]> {
    try {
      const res = await fetch("/api/chat/threads");
      if (res.status === 401) { window.location.href = "/api/auth/login"; return []; }
      if (!res.ok) return [];
      const data = await res.json();
      const list: Thread[] = data.threads ?? [];
      setThreads(list);
      if (data.orgName) setOrgName(data.orgName);
      return list;
    } catch { return []; }
  }

  const loadThread = useCallback(async (threadId: string) => {
    setActiveThreadId(threadId);
    setMessages([]);
    try {
      const res = await fetch(`/api/chat/threads/${threadId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.orgName) setOrgName(data.orgName);
      setMessages((data.messages as ServerMessage[]).map(serverToChat));
    } catch { /* show empty */ }
  }, []);

  // Initial load: threads + analysis preview (in parallel)
  useEffect(() => {
    async function init() {
      await Promise.all([
        loadThreads().then((list) => {
          if (list.length > 0) return loadThread(list[0].id);
        }),
        fetchAnalysisPreview(),
      ]);
      setLoading(false);
    }
    init();
  }, [loadThread]);

  // Handle ?q= param from Overview — run once after load, in its own thread
  useEffect(() => {
    if (loading || qParamHandled.current) return;
    const q = searchParams.get("q");
    if (!q) return;
    qParamHandled.current = true;
    // Slight delay so threads finish loading first
    setTimeout(() => runAnalysis(decodeURIComponent(q)), 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function createThread(): Promise<string | null> {
    try {
      const res = await fetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const thread: Thread = data.thread;
      setThreads((prev) => [thread, ...prev]);
      setActiveThreadId(thread.id);
      setMessages([]);
      return thread.id;
    } catch { return null; }
  }

  async function handleNewThread() {
    await createThread();
    // Don't auto-run — show empty state with suggestions
  }

  async function renameThread(threadId: string, title: string) {
    await fetch(`/api/chat/threads/${threadId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, title } : t));
  }

  async function pinThread(threadId: string) {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    const isPinned = !thread.isPinned;
    await fetch(`/api/chat/threads/${threadId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned }),
    });
    setThreads((prev) =>
      prev.map((t) => t.id === threadId ? { ...t, isPinned } : t)
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        })
    );
  }

  async function deleteThread(threadId: string) {
    if (!confirm("Delete this thread? This cannot be undone.")) return;
    await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
    const updated = threads.filter((t) => t.id !== threadId);
    setThreads(updated);
    if (activeThreadId === threadId) {
      if (updated.length > 0) await loadThread(updated[0].id);
      else { setActiveThreadId(null); setMessages([]); }
    }
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

    // Ensure we have an active thread
    let threadId = activeThreadId;
    if (!threadId) {
      threadId = await createThread();
      if (!threadId) return;
    }

    setIsAnalysing(true);
    const uploadsForTurn = pendingUploads;
    setPendingUploads([]);
    const isFirstMessage = messages.length === 0;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: question, attachments: uploadsForTurn.map((u) => ({ name: u.name, kind: u.kind })) },
      { role: "assistant", content: "", loading: true },
    ]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch("/api/tax/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, uploads: uploadsForTurn, refresh: opts.refresh === true, threadId }),
      });
      if (res.status === 401) { window.location.href = "/api/auth/login"; return; }
      if (!res.ok) throw new Error("Analysis failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
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
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "", analysisData: data.data, streamedText: "", isStreaming: true, loading: false }; return u; });
            } else if (data.type === "text") {
              streamedText += data.text;
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], loading: false, streamedText, isStreaming: true }; return u; });
              setTimeout(scrollToBottom, 50);
            } else if (data.type === "followUps") {
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], followUps: data.questions }; return u; });
            } else if (data.type === "done") {
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], streamedText, isStreaming: false }; return u; });
            }
          } catch { /* skip */ }
        }
      }

      // Auto-title after first message
      if (isFirstMessage && threadId) {
        fetch(`/api/chat/threads/${threadId}/title`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstMessage: question }),
        }).then((r) => r.json()).then((d) => {
          if (d.title) setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, title: d.title } : t));
        }).catch(() => {
          setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, title: question.slice(0, 40) } : t));
        });
      }

      setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, updatedAt: new Date().toISOString() } : t));
    } catch {
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "Sorry, I had trouble analysing your data. Please try again.", loading: false }; return u; });
    } finally {
      setIsAnalysing(false);
    }
  }

  function handleSend() {
    const q = inputValue.trim();
    if (!q && pendingUploads.length === 0) return;
    setInputValue("");
    runAnalysis(q || `Please review the attached ${pendingUploads.map((u) => u.kind.toUpperCase()).join(" and ")}.`);
  }

  const hasShownAnalysis = messages.some((m) => m.analysisData);
  const activeThread = threads.find((t) => t.id === activeThreadId);
  const isEmptyThread = !loading && messages.length === 0;
  const pinnedThreads = threads.filter((t) => t.isPinned);
  const recentThreads = threads.filter((t) => !t.isPinned);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FAFBFC] print:bg-white">
      <Nav orgName={orgName} />

      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside className={`${sidebarOpen ? "w-64" : "w-0"} shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-200 print:hidden`}>
          <div className="p-3 border-b border-gray-100 shrink-0">
            <button onClick={handleNewThread}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1B2A4A] text-white text-sm font-medium hover:bg-[#253a5e] transition-colors">
              <span className="text-lg leading-none">+</span> New thread
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {pinnedThreads.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">Pinned</p>
                <div className="space-y-0.5">
                  {pinnedThreads.map((t) => (
                    <ThreadItem key={t.id} thread={t} isActive={t.id === activeThreadId}
                      onSelect={() => loadThread(t.id)}
                      onRename={(title) => renameThread(t.id, title)}
                      onPin={() => pinThread(t.id)}
                      onDelete={() => deleteThread(t.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {recentThreads.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">Recent</p>
                <div className="space-y-0.5">
                  {recentThreads.map((t) => (
                    <ThreadItem key={t.id} thread={t} isActive={t.id === activeThreadId}
                      onSelect={() => loadThread(t.id)}
                      onRename={(title) => renameThread(t.id, title)}
                      onPin={() => pinThread(t.id)}
                      onDelete={() => deleteThread(t.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {threads.length === 0 && !loading && (
              <p className="text-xs text-gray-400 text-center px-4 py-8">No threads yet.</p>
            )}
          </div>
        </aside>

        {/* ── Chat area ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Thread header */}
          <div className="border-b border-gray-200 bg-white px-4 py-2.5 flex items-center gap-3 shrink-0 print:hidden">
            <button onClick={() => setSidebarOpen((v) => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Toggle sidebar">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => router.push("/dashboard")}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors">← Overview</button>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-700 flex-1 truncate">
              {activeThread?.title || (isEmptyThread ? "New thread" : "Cleo")}
            </span>
            <div className="flex items-center gap-3">
              {hasShownAnalysis && (
                <button onClick={() => runAnalysis("Re-analyse with the latest Xero data", { refresh: true })}
                  disabled={isAnalysing}
                  className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors">
                  Refresh
                </button>
              )}
              {messages.length > 0 && (
                <button onClick={() => window.print()}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <main className="flex-1 overflow-y-auto" style={{ overflowAnchor: "none" }}>
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

              {loading && (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-2 border-[#00B7A3] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Empty state — new thread or no threads */}
              {!loading && isEmptyThread && (
                <EmptyState
                  analysisPreview={analysisPreview}
                  onSelect={(q) => runAnalysis(q)}
                  onCreateThread={handleNewThread}
                />
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
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00B7A3] to-[#0e9fd4] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <span className="text-white text-xs font-bold">C</span>
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
                              <SuggestedQuestions
                                questions={msg.followUps?.length ? msg.followUps : buildStarterSuggestions(msg.analysisData)}
                                onSelect={runAnalysis}
                              />
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
          <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0 print:hidden">
            <div className="max-w-2xl mx-auto">
              {pendingUploads.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {pendingUploads.map((u) => (
                    <span key={u.name} className="inline-flex items-center gap-1.5 text-xs bg-gray-100 border border-gray-200 text-gray-700 pl-2 pr-1 py-1 rounded-lg">
                      {u.kind === "pdf" ? "📄" : "📊"}
                      <span className="max-w-[160px] truncate">{u.name}</span>
                      <button onClick={() => setPendingUploads((p) => p.filter((d) => d.name !== u.name))}
                        className="w-4 h-4 rounded hover:bg-gray-200 flex items-center justify-center text-gray-500">×</button>
                    </span>
                  ))}
                </div>
              )}
              {uploadError && <p className="text-xs text-red-500 mb-2">{uploadError}</p>}
              <div className="flex gap-2 items-center">
                <input ref={fileInputRef} type="file" accept=".pdf,.csv,application/pdf,text/csv" multiple onChange={handleFileSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isAnalysing}
                  title="Attach PDF or CSV"
                  className="p-2.5 text-gray-400 hover:text-[#00B7A3] hover:bg-gray-50 rounded-xl disabled:opacity-40 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 10-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input type="text" value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={pendingUploads.length > 0 ? "Add a note, or press send..." : "Ask Cleo anything about your deductions..."}
                  disabled={isAnalysing}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00B7A3]/30 focus:border-[#00B7A3] disabled:opacity-50 transition-all"
                />
                <button onClick={handleSend}
                  disabled={isAnalysing || (!inputValue.trim() && pendingUploads.length === 0)}
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
      </div>
    </div>
  );
}

export default function CleoPage() {
  return <Suspense><CleoChat /></Suspense>;
}
