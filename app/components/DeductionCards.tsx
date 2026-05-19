"use client";

interface Props {
  totalDeductions: number;
  estimatedTaxSavings: number;
  itemsNeedingReview: number;
  newOpportunities: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const CARDS = [
  { key: "totalDeductions",      label: "Total Deductions",      tag: "bg-[#00B7A3]/10 text-[#00B7A3]" },
  { key: "estimatedTaxSavings",  label: "Est. Tax Savings",       tag: "bg-[#1A9955]/10 text-[#1A9955]" },
  { key: "itemsNeedingReview",   label: "Items to Review",        tag: "bg-amber-100 text-amber-600"     },
  { key: "newOpportunities",     label: "New Opportunities",      tag: "bg-[#0078C8]/10 text-[#0078C8]" },
] as const;

export default function DeductionCards({ totalDeductions, estimatedTaxSavings, itemsNeedingReview, newOpportunities }: Props) {
  const values: Record<string, string> = {
    totalDeductions: fmt(totalDeductions),
    estimatedTaxSavings: fmt(estimatedTaxSavings),
    itemsNeedingReview: String(itemsNeedingReview),
    newOpportunities: String(newOpportunities),
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CARDS.map((c) => (
        <div key={c.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-3 ${c.tag}`}>
            {c.label}
          </span>
          <p className="text-2xl font-bold text-gray-900">{values[c.key]}</p>
        </div>
      ))}
    </div>
  );
}
