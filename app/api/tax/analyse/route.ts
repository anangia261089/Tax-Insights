import { NextRequest, NextResponse } from "next/server";
import { getCachedAnalysis } from "@/app/lib/xero-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
    const { result, cached } = await getCachedAnalysis({ forceRefresh });
    return NextResponse.json({ ...result, _cached: cached });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Not authenticated") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Error running tax analysis:", error);
    return NextResponse.json({ error: "Failed to run tax analysis" }, { status: 500 });
  }
}
