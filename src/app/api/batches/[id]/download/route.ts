import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildBatchZip } from "@/lib/pdf/zip";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/utils";
import type { NormalizedReport } from "@/types/parsers";

type DownloadRow = {
  id: string;
  pdf_url: string | null;
  parsed_data: NormalizedReport | null;
  owner: { name: string } | { name: string }[] | null;
  batch: { month: string } | { month: string }[] | null;
};

function sanitizePart(value: string): string {
  return value.replace(/[\/\\:]/g, "-").replace(/\s+/g, " ").trim();
}

// Works for both stored paths ("acct/batch/owner.pdf") and old signed URLs
function extractStoragePath(pdfUrl: string): string | null {
  if (!pdfUrl.startsWith("http")) return pdfUrl;
  const match = pdfUrl.match(/\/sign\/pdfs\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: batch } = await supabaseAdmin
    .from("report_batches")
    .select("id, month")
    .eq("id", id)
    .eq("account_id", account.id)
    .single();

  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const { data: reports, error } = await supabaseAdmin
    .from("reports")
    .select("id, pdf_url, parsed_data, owner:owners(name), batch:report_batches(month)")
    .eq("batch_id", batch.id)
    .not("pdf_url", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!reports?.length) {
    return NextResponse.json(
      { error: "No PDFs found. Click Generate on the batch first." },
      { status: 404 }
    );
  }

  const pdfs: Array<{ filename: string; buffer: Buffer }> = [];

  for (const report of reports as DownloadRow[]) {
    if (!report.pdf_url) continue;

    const storagePath = extractStoragePath(report.pdf_url);
    if (!storagePath) continue;

    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from("pdfs")
      .download(storagePath);

    if (dlErr || !blob) {
      console.error(`[download] Failed to fetch PDF from storage: ${storagePath}`, dlErr?.message);
      continue;
    }

    const owner = Array.isArray(report.owner) ? report.owner[0] : report.owner;
    const reportBatch = Array.isArray(report.batch) ? report.batch[0] : report.batch;
    const parsed = report.parsed_data;
    const monthLabel = reportBatch?.month
      ? formatMonth(reportBatch.month).replace(/\s+/g, "")
      : "Statement";
    const filename = `${sanitizePart(owner?.name ?? "Owner")}_${sanitizePart(
      parsed?.property_address ?? "Property"
    )}_${sanitizePart(monthLabel)}.pdf`;

    pdfs.push({ filename, buffer: Buffer.from(await blob.arrayBuffer()) });
  }

  if (!pdfs.length) {
    return NextResponse.json(
      { error: "PDFs could not be retrieved. Try regenerating the batch." },
      { status: 500 }
    );
  }

  const zipBuffer = await buildBatchZip(pdfs);

  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="batch-${batch.month}.zip"`,
    },
  });
}
