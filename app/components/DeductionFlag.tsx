"use client";

import { useState } from "react";

export interface TaxFlag {
  id: string;
  title: string;
  amount: number;
  confidence: "high" | "medium" | "low";
  explanation: string;
}

interface Props {
  flag: TaxFlag;
  onAskJax: (context: string) => void;
  onFlagForCpa: (flag: TaxFlag) => void;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const CONFIDENCE_CONFIG = {
  high: {
    label: "High confidence",
    dot: "bg-[#00B7A3]",
    text: "text-[#00B7A3]",
    bg: "bg-[#00B7A3]/8",
  },
  medium: {
    label: "Medium confidence",
    dot: "bg-amber-400",
    text: "text-amber-600",
    bg: "bg-amber-50",
  },
  low: {
    label: "Needs review",
    dot: "bg-red-400",
    text: "text-red-500",
    bg: "bg-red-50",
  },
};

export default function DeductionFlag({ flag, onAskJax, onFlagForCpa }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const conf = CONFIDENCE_CONFIG[flag.confidence];

  function handleFlagForCpa() {
    setFlagged(true);
    onFlagForCpa(flag);
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        expanded ? "border-gray-200 shadow-sm" : "border-gray-100 hover:border-gray-200"
      } bg-white`}
    >
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Confidence dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${conf.dot}`} />

        {/* Title + confidence */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{flag.title}</p>
          <p className={`text-xs mt-0.5 ${conf.text}`}>{conf.label}</p>
        </div>

        {/* Amount */}
        <span className="text-sm font-semibold text-gray-900 shrink-0">
          {formatCurrency(flag.amount)}
        </span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className={`px-4 pb-4 border-t border-gray-100 ${conf.bg} rounded-b-xl`}>
          <p className="text-sm text-gray-700 leading-relaxed pt-3 pb-4">
            {flag.explanation}
          </p>
          <div className="flex gap-2">
            {flagged ? (
              <span className="flex items-center gap-1.5 text-xs text-[#00B7A3] font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Flagged for your CPA
              </span>
            ) : (
              <button
                onClick={handleFlagForCpa}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B2A4A] text-white rounded-lg hover:bg-[#253a5e] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Flag for CPA
              </button>
            )}
            <button
              onClick={() => onAskJax(`Tell me more about the ${flag.title} opportunity — I have ${formatCurrency(flag.amount)} in this category.`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Ask JAX more
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
