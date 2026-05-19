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
  onAskCleo: (context: string) => void;
  onFlagForCpa: (flag: TaxFlag) => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const CONF = {
  high:   { label: "High confidence", tag: "bg-[#00B7A3]/10 text-[#00B7A3]",  body: "bg-[#00B7A3]/5"  },
  medium: { label: "Med. confidence", tag: "bg-amber-100 text-amber-600",       body: "bg-amber-50"      },
  low:    { label: "Needs review",    tag: "bg-red-100 text-red-600",           body: "bg-red-50"        },
};

export default function DeductionFlag({ flag, onAskCleo, onFlagForCpa }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const c = CONF[flag.confidence];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${c.tag}`}>
          {c.label}
        </span>
        <span className="flex-1 text-sm font-medium text-gray-900 truncate">{flag.title}</span>
        <span className="text-sm font-bold text-gray-900 shrink-0">{fmt(flag.amount)}</span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className={`px-5 pb-5 pt-4 border-t border-gray-100 ${c.body}`}>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">{flag.explanation}</p>
          <div className="flex gap-2">
            {flagged ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00B7A3]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Flagged for your CPA
              </span>
            ) : (
              <button
                onClick={() => { setFlagged(true); onFlagForCpa(flag); }}
                className="px-3 py-1.5 text-xs font-semibold bg-[#1B2A4A] text-white rounded-lg hover:bg-[#253a5e] transition-colors"
              >
                Flag for CPA
              </button>
            )}
            <button
              onClick={() => onAskCleo(`Tell me more about the ${flag.title} opportunity — I have ${fmt(flag.amount)} in this category.`)}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-white transition-colors"
            >
              Ask Cleo more →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
