import { NextRequest, NextResponse } from "next/server";

/**
 * Validates that the request comes from the same origin as the server.
 * Browsers always include Origin on cross-site fetch; checking it prevents
 * CSRF from malicious third-party pages.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try { return new URL(origin).host === host; } catch { return false; }
  }

  // Fallback for same-origin requests that omit Origin (e.g. form POST)
  const referer = request.headers.get("referer");
  if (referer) {
    try { return new URL(referer).host === host; } catch { return false; }
  }

  return false;
}

export function csrfError(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
