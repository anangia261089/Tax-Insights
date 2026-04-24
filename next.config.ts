import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly expose server-side env vars to route handlers
  // This is needed for Next.js 16 + Turbopack which has a known issue
  // where .env.local vars aren't always injected into the runtime process env
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    CLAUDE_MODEL: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
    XERO_CLIENT_ID: process.env.XERO_CLIENT_ID || "",
    XERO_CLIENT_SECRET: process.env.XERO_CLIENT_SECRET || "",
    XERO_REDIRECT_URI: process.env.XERO_REDIRECT_URI || "",
    XERO_SCOPES: process.env.XERO_SCOPES || "",
    SESSION_SECRET: process.env.SESSION_SECRET || "",
    DATABASE_URL: process.env.DATABASE_URL || "",
    ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY || "",
  },
};

export default nextConfig;
