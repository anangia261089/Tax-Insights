"use client";

import { useState } from "react";
import type { EntityType } from "@/app/lib/types";
import { ENTITY_LABELS } from "@/app/lib/types";

interface Props {
  current: EntityType | null;
  onSave: (type: EntityType) => void;
}

const ENTITY_OPTIONS: { value: EntityType; description: string }[] = [
  { value: "sole_proprietor", description: "Self-employed, Schedule C, ~29.6% effective rate" },
  { value: "llc_single",     description: "Single-member LLC, taxed as sole prop, ~29.6%" },
  { value: "llc_multi",      description: "Multi-member LLC, taxed as partnership, ~29.6%" },
  { value: "s_corp",         description: "S-Corp election, lower SE taxes, ~24.8%" },
  { value: "partnership",    description: "General or LP, K-1 pass-through, ~29.6%" },
  { value: "c_corp",         description: "C-Corp, flat 21% federal, no QBI deduction" },
];

export default function EntityTypePicker({ current, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSelect(type: EntityType) {
    setSaving(true);
    try {
      const res = await fetch("/api/tenant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: type }),
      });
      if (res.ok) onSave(type);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
          current
            ? "bg-[#1B2A4A]/5 border-[#1B2A4A]/20 text-[#1B2A4A] hover:bg-[#1B2A4A]/10"
            : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
        }`}
      >
        {saving ? (
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {current ? ENTITY_LABELS[current] : "Set entity type"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-20 w-72 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-3 pb-1.5">
              How is your business structured?
            </p>
            {ENTITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex flex-col gap-0.5 ${
                  current === opt.value ? "bg-[#00B7A3]/5" : ""
                }`}
              >
                <span className={`text-sm font-medium ${current === opt.value ? "text-[#00B7A3]" : "text-gray-800"}`}>
                  {ENTITY_LABELS[opt.value]}
                  {current === opt.value && " ✓"}
                </span>
                <span className="text-[11px] text-gray-400">{opt.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
