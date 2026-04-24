"use client";

import type { TaxCategory } from "@/app/lib/types";

interface Props {
  categories: TaxCategory[];
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const STATUS_STYLES = {
  claimed: "bg-green-100 text-green-700",
  review: "bg-amber-100 text-amber-700",
  opportunity: "bg-blue-100 text-blue-700",
};

export default function CategoryTable({ categories }: Props) {
  return (
    <div className="space-y-4 mb-4">
      {categories.map((cat) => (
        <div key={cat.section} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div>
              <span className="text-sm font-medium text-gray-900">{cat.section}</span>
              <span className="text-xs text-gray-500 ml-2">{cat.title}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(cat.total)}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {cat.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 text-gray-700">{item.account}</td>
                  <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  {item.reason && (
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-xs">{item.reason}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
