"use client";

import DeductionFlag, { type TaxFlag } from "@/app/components/DeductionFlag";
import type { TaxAnalysisResult } from "@/app/lib/types";

interface Props {
  analysis: TaxAnalysisResult;
  onReviewWithJax: () => void;
  onAskJax: (context: string) => void;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function buildFlags(analysis: TaxAnalysisResult): TaxFlag[] {
  const flags: TaxFlag[] = [];

  // Section 179 opportunity — always surfaces first if it exists
  if (analysis.section179.potentialAdditional > 0) {
    flags.push({
      id: "s179",
      title: "Section 179 depreciation",
      amount: analysis.section179.potentialAdditional,
      confidence: "high",
      explanation: `You have ${formatCurrency(analysis.section179.assetValue)} in equipment on your books. You may qualify to deduct ${formatCurrency(analysis.section179.potentialAdditional)} this year instead of spreading it over 5 years — worth discussing with your CPA before year-end.`,
    });
  }

  // Categories with flagged review items — medium confidence
  for (const cat of analysis.categories) {
    if (flags.length >= 3) break;
    if (cat.confidence === "medium" && cat.total > 0) {
      const reviewItems = cat.items.filter((i) => i.status === "review");
      const reason = reviewItems[0]?.reason || "Some items in this category may need documentation.";
      flags.push({
        id: cat.section,
        title: cat.title,
        amount: cat.total,
        confidence: "medium",
        explanation: `You have ${formatCurrency(cat.total)} in ${cat.title.toLowerCase()}. ${reason} Your CPA will want to review these before filing.`,
      });
    }
  }

  // Fill remaining slots with highest-value high-confidence categories
  for (const cat of analysis.categories) {
    if (flags.length >= 3) break;
    if (flags.some((f) => f.id === cat.section)) continue;
    if (cat.confidence === "high" && cat.total > 0) {
      flags.push({
        id: cat.section,
        title: cat.title,
        amount: cat.total,
        confidence: "high",
        explanation: `${formatCurrency(cat.total)} in ${cat.title.toLowerCase()} likely qualifies as a deductible business expense. Make sure your Xero records clearly show these are business-related costs.`,
      });
    }
  }

  return flags.slice(0, 3);
}

export default function TaxIntelligencePanel({ analysis, onReviewWithJax, onAskJax }: Props) {
  const flags = buildFlags(analysis);
  const totalFlagged = flags.reduce((sum, f) => sum + f.amount, 0);
  const flaggedForCpa: TaxFlag[] = [];

  function handleFlagForCpa(flag: TaxFlag) {
    if (!flaggedForCpa.find((f) => f.id === flag.id)) {
      flaggedForCpa.push(flag);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-[#00B7A3] uppercase tracking-widest mb-1">
          Tax Intelligence
        </p>
        <h1 className="text-2xl font-bold text-gray-900">{analysis.orgName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{analysis.fiscalYear} · Proactive deduction flags based on your Xero data</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total flagged for review</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFlagged)}</p>
          <p className="text-xs text-gray-400 mt-1">{flags.length} items · {analysis.fiscalYear}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total deductions captured</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(analysis.totalDeductions)}</p>
          <p className="text-xs text-gray-400 mt-1">Across {analysis.categories.length} categories</p>
        </div>
      </div>

      {/* Flags */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Top opportunities
        </p>
        <div className="space-y-2">
          {flags.map((flag) => (
            <DeductionFlag
              key={flag.id}
              flag={flag}
              onAskJax={(ctx) => {
                onAskJax(ctx);
              }}
              onFlagForCpa={handleFlagForCpa}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="pt-2">
        <button
          onClick={onReviewWithJax}
          className="w-full py-3.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-semibold hover:bg-[#253a5e] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Review all with JAX
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-2">
          JAX will walk through every category with you in plain English
        </p>
      </div>
    </div>
  );
}
