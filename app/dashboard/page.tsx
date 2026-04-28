"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/app/components/Nav";
import TaxIntelligencePanel from "@/app/components/TaxIntelligencePanel";
import type { TaxAnalysisResult } from "@/app/lib/types";

export default function Dashboard() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [analysis, setAnalysis] = useState<TaxAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tax/analyse")
      .then(async (res) => {
        if (res.status === 401) { window.location.href = "/api/auth/login"; return; }
        if (!res.ok) throw new Error("Failed to load");
        const data: TaxAnalysisResult = await res.json();
        setAnalysis(data);
        setOrgName(data.orgName);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function goToJax(question?: string) {
    const url = question
      ? `/dashboard/jax?q=${encodeURIComponent(question)}`
      : "/dashboard/jax";
    router.push(url);
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#FAFBFC]">
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
            <a href="/api/auth/login" className="text-[#00B7A3] hover:underline text-sm">Reconnect</a>
          </div>
        </main>
      ) : analysis ? (
        <main className="flex-1 overflow-y-auto">
          <TaxIntelligencePanel
            analysis={analysis}
            onReviewWithJax={() => goToJax()}
            onAskJax={(ctx) => goToJax(ctx)}
          />
        </main>
      ) : null}
    </div>
  );
}
