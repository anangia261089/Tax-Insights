import fs from "fs";
import path from "path";

/**
 * Reads a key from .env.local at runtime.
 * Next.js 16 + Turbopack has a known bug where .env.local values are not
 * always injected into process.env for route handlers. This is the fallback.
 */
function readEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    const result: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

let _envFileCache: Record<string, string> | null = null;

export function getEnv(key: string): string {
  // 1. Check process.env first (works when vars are passed on the command line)
  if (process.env[key]) return process.env[key]!;

  // 2. Fall back to reading .env.local directly (Turbopack workaround)
  if (!_envFileCache) {
    _envFileCache = readEnvFile();
  }
  return _envFileCache[key] || "";
}
