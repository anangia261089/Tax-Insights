"use client";

interface Props {
  totalDeductions: number;
  estimatedTaxSavings: number;
  itemsNeedingReview: number;
  newOpportunities: number;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function DeductionCards({ totalDeductions, estimatedTaxSavings, itemsNeedingReview, newOpportunities }: Props) {
  const cards = [
    { label: "Total Deductions", value: formatCurrency(totalDeductions), color: "bg-[#00B7A3]" },
    { label: "Estimated Tax Savings", value: formatCurrency(estimatedTaxSavings), color: "bg-[#1A9955]" },
    { label: "Items to Review", value: String(itemsNeedingReview), color: "bg-[#F59E0B]" },
    { label: "New Opportunities", value: String(newOpportunities), color: "bg-[#0078C8]" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className={`w-2 h-2 rounded-full ${card.color} mb-2`} />
          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
          <p className="text-xl font-semibold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
