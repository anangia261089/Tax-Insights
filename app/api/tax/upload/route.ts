import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_CSV_CHARS = 120_000; // ~30k tokens, leaves room for conversation

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const name = file.name || "upload";
    const lower = name.toLowerCase();

    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json(
          { error: `PDF too large (max ${MAX_PDF_BYTES / 1024 / 1024} MB)` },
          { status: 413 }
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      return NextResponse.json({
        kind: "pdf",
        name,
        data: buf.toString("base64"),
      });
    }

    if (lower.endsWith(".csv") || file.type === "text/csv") {
      if (file.size > MAX_CSV_BYTES) {
        return NextResponse.json(
          { error: `CSV too large (max ${MAX_CSV_BYTES / 1024 / 1024} MB)` },
          { status: 413 }
        );
      }
      let text = await file.text();
      if (text.length > MAX_CSV_CHARS) {
        text = text.slice(0, MAX_CSV_CHARS) + "\n... [truncated]";
      }
      return NextResponse.json({ kind: "csv", name, data: text });
    }

    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF or CSV." },
      { status: 415 }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
