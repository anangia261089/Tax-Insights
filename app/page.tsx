import Nav from "@/app/components/Nav";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <Nav />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Teal accent circle */}
          <div className="w-16 h-16 bg-[#00B7A3] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl font-bold">J</span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Tax Insights for your business
          </h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            Connect your Xero account to get an instant analysis of your tax
            deductions, identify missed opportunities, and prepare for your next
            tax review.
          </p>

          <a
            href="/api/auth/login"
            className="inline-flex items-center gap-2 bg-[#13B5EA] hover:bg-[#0e9fd4] text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Connect to Xero
          </a>

          <p className="text-xs text-gray-400 mt-6">
            We only request read access to your data. Nothing is modified in
            your Xero account.
          </p>
        </div>
      </main>

      {/* Disclaimer */}
      <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
        JAX can make mistakes. Outputs are not financial, tax or legal advice.
      </footer>
    </div>
  );
}
