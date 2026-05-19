"use client";

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  accent: "teal" | "green" | "amber" | "blue";
}

const VALUE_COLOR = {
  teal: "text-[#00B7A3]",
  green: "text-[#1A9955]",
  amber: "text-amber-500",
  blue: "text-[#0078C8]",
};

export default function InsightCard({ label, value, subtitle, accent }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${VALUE_COLOR[accent]}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
