"use client";

import type { TaxCategory } from "@/app/lib/types";

interface Props {
  categories: TaxCategory[];
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const COLORS = ["#00B7A3", "#0078C8", "#1A9955", "#F59E0B", "#8B5CF6", "#EC4899"];

export default function DeductionChart({ categories }: Props) {
  const maxTotal = Math.max(...categories.map((c) => c.total), 1);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Deductions by IRS Category</h3>
      <div className="space-y-3">
        {categories.map((cat, i) => (
          <div key={cat.section} className="flex items-center gap-3">
            <div className="w-36 text-xs text-gray-600 shrink-0 truncate" title={cat.title}>
              {cat.title}
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(cat.total / maxTotal) * 100}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                }}
              />
            </div>
            <div className="w-20 text-xs text-gray-700 text-right shrink-0">
              {formatCurrency(cat.total)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
