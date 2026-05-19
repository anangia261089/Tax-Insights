import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { deleteXeroSession } from "@/app/lib/xero-session-store";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (session.xeroTenantId) {
    await deleteXeroSession(session.xeroTenantId).catch(() => {});
  }
  session.destroy();
  return NextResponse.redirect(new URL("/", request.url));
}
