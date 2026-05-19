"use client";

export default function Nav({ orgName }: { orgName?: string }) {
  return (
    <header className="bg-[#1B2A4A] h-14 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[#13B5EA] font-bold text-lg tracking-tight">xero</span>
        <span className="text-white/30">|</span>
        <span className="text-white text-sm font-medium">Tax Insights</span>
      </div>
      {orgName && (
        <div className="flex items-center gap-4">
          <span className="text-white/70 text-sm">{orgName}</span>
          <a
            href="/api/auth/logout"
            className="text-sm text-white/50 hover:text-white transition-colors border border-white/20 rounded-lg px-3 py-1.5 hover:border-white/40"
          >
            Disconnect
          </a>
        </div>
      )}
    </header>
  );
}
