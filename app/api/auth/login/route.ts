import { NextResponse } from "next/server";
import { getXeroClient } from "@/app/lib/xero-client";

export async function GET() {
  const xero = getXeroClient();
  await xero.initialize();
  const consentUrl = await xero.buildConsentUrl();
  return NextResponse.redirect(consentUrl);
}
