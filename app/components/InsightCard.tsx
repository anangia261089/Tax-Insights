"use client";

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  accent: "teal" | "green" | "amber" | "blue";
}

const ACCENT_STYLES = {
  teal: "border-l-[#00B7A3] bg-gradient-to-r from-[#00B7A3]/5 to-transparent",
  green: "border-l-[#1A9955] bg-gradient-to-r from-[#1A9955]/5 to-transparent",
  amber: "border-l-[#F59E0B] bg-gradient-to-r from-[#F59E0B]/5 to-transparent",
  blue: "border-l-[#0078C8] bg-gradient-to-r from-[#0078C8]/5 to-transparent",
};

export default function InsightCard({ label, value, subtitle, accent }: Props) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 p-5 ${ACCENT_STYLES[accent]}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
