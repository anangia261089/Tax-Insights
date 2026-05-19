"use client";

import DeductionFlag, { type TaxFlag } from "@/app/components/DeductionFlag";
import type { TaxAnalysisResult } from "@/app/lib/types";

interface Props {
  analysis: TaxAnalysisResult;
  onReviewWithCleo: () => void;
  onAskCleo: (context: string) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function buildFlags(analysis: TaxAnalysisResult): TaxFlag[] {
  const flags: TaxFlag[] = [];

  if (analysis.section179.potentialAdditional > 0) {
    flags.push({
      id: "s179",
      title: "Section 179 depreciation",
      amount: analysis.section179.potentialAdditional,
      confidence: "high",
      explanation: `You have ${fmt(analysis.section179.assetValue)} in equipment on your books. You may qualify to deduct ${fmt(analysis.section179.potentialAdditional)} this year instead of spreading it over 5 years — worth discussing with your CPA before year-end.`,
    });
  }

  for (const cat of analysis.categories) {
    if (flags.length >= 3) break;
    if (cat.confidence === "medium" && cat.total > 0) {
      const reason = cat.items.find((i) => i.status === "review")?.reason ?? "Some items may need documentation.";
      flags.push({ id: cat.section, title: cat.title, amount: cat.total, confidence: "medium",
        explanation: `You have ${fmt(cat.total)} in ${cat.title.toLowerCase()}. ${reason} Your CPA will want to review these before filing.` });
    }
  }

  for (const cat of analysis.categories) {
    if (flags.length >= 3) break;
    if (flags.some((f) => f.id === cat.section)) continue;
    if (cat.confidence === "high" && cat.total > 0) {
      flags.push({ id: cat.section, title: cat.title, amount: cat.total, confidence: "high",
        explanation: `${fmt(cat.total)} in ${cat.title.toLowerCase()} likely qualifies as a deductible business expense. Make sure your Xero records clearly show these are business-related costs.` });
    }
  }

  return flags.slice(0, 3);
}

export default function TaxIntelligencePanel({ analysis, onReviewWithCleo, onAskCleo }: Props) {
  const flags = buildFlags(analysis);
  const totalFlagged = flags.reduce((s, f) => s + f.amount, 0);
  const flaggedForCpa: TaxFlag[] = [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-[#00B7A3]/10 text-[#00B7A3] mb-3">
          Tax Intelligence
        </span>
        <h1 className="text-2xl font-bold text-gray-900">{analysis.orgName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {analysis.fiscalYear} · Proactive deduction flags based on your Xero data
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total flagged for review</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalFlagged)}</p>
          <p className="text-xs text-gray-400 mt-1">{flags.length} items · {analysis.fiscalYear}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">Total deductions captured</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(analysis.totalDeductions)}</p>
          <p className="text-xs text-gray-400 mt-1">Across {analysis.categories.length} categories</p>
        </div>
      </div>

      {/* Flags */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Top opportunities
        </p>
        <div className="space-y-3">
          {flags.map((flag) => (
            <DeductionFlag key={flag.id} flag={flag} onAskCleo={onAskCleo} onFlagForCpa={(f) => { if (!flaggedForCpa.find((x) => x.id === f.id)) flaggedForCpa.push(f); }} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* CTA */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onReviewWithCleo}
          className="w-full max-w-sm py-3.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-semibold hover:bg-[#253a5e] transition-colors"
        >
          Review all with Cleo
        </button>
        <p className="text-xs text-gray-400">Cleo will walk through every category with you in plain English</p>
      </div>
    </div>
  );
}
