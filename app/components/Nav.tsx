"use client";

export default function Nav({ orgName }: { orgName?: string }) {
  return (
    <nav className="bg-[#1B2A4A] px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Xero-style logo */}
        <span className="text-[#13B5EA] font-bold text-xl tracking-tight">
          xero
        </span>
        <span className="text-white/40 text-lg font-light">|</span>
        <span className="text-white font-medium text-sm">Tax Insights</span>
      </div>
      <div className="flex items-center gap-4">
        {orgName && (
          <span className="text-white/80 text-sm">{orgName}</span>
        )}
        {orgName && (
          <a
            href="/api/auth/logout"
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Disconnect
          </a>
        )}
      </div>
    </nav>
  );
}
