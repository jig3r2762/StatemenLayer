import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendOwnerEmail } from "@/lib/email/dispatch";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { NormalizedReport } from "@/types/parsers";

function extractStoragePath(pdfUrl: string): string | null {
  if (!pdfUrl.startsWith("http")) return pdfUrl;
  const match = pdfUrl.match(/\/sign\/pdfs\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

type SendRow = {
  id: string;
  pdf_url: string | null;
  web_token: string | null;
  parsed_data: NormalizedReport | null;
  owner: { name: string; email: string } | { name: string; email: string }[] | null;
};

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, firm_name, from_name, reply_to_email")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: batch } = await supabaseAdmin
    .from("report_batches")
    .select("id, account_id, month, status, sent_at")
    .eq("id", id)
    .eq("account_id", account.id)
    .single();

  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (!["ready", "partial", "sent"].includes(batch.status)) {
    return NextResponse.json({ error: "Generate PDFs before sending" }, { status: 400 });
  }

  // Optional: selective send — body may contain { reportIds: string[] }
  let reportIds: string[] | null = null;
  try {
    const body = await _req.json().catch(() => ({}));
    if (Array.isArray(body.reportIds) && body.reportIds.length > 0) {
      reportIds = body.reportIds as string[];
    }
  } catch { /* no body — send all */ }

  let query = supabaseAdmin
    .from("reports")
    .select("id, pdf_url, web_token, parsed_data, owner:owners(name, email)")
    .eq("batch_id", batch.id)
    .order("created_at", { ascending: true });

  if (reportIds) query = query.in("id", reportIds);

  const { data: reports, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const errors: string[] = [];
  let sent = 0;
  let failed = 0;
  const baseUrl = process.env.BASE_URL ?? "";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@statementlayer.local";

  for (const report of (reports ?? []) as SendRow[]) {
    const owner = Array.isArray(report.owner) ? report.owner[0] : report.owner;

    if (!owner?.email) {
      failed += 1;
      errors.push(`Report ${report.id}: owner email missing`);
      continue;
    }

    let signedPdfUrl: string | null = null;
    if (report.pdf_url) {
      const storagePath = extractStoragePath(report.pdf_url);
      if (storagePath) {
        const { data: signed } = await supabaseAdmin.storage
          .from("pdfs")
          .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        signedPdfUrl = signed?.signedUrl ?? null;
      }
    }

    const result = await sendOwnerEmail({
      ownerEmail: owner.email,
      ownerName: owner.name,
      propertyAddress: report.parsed_data?.property_address ?? "Property statement",
      reportMonth: batch.month,
      pdfUrl: signedPdfUrl,
      webViewUrl: report.web_token ? `${baseUrl}/r/${report.web_token}` : null,
      fromEmail,
      firmName: account.from_name?.trim() || account.firm_name,
      replyTo: account.reply_to_email ?? undefined,
      reportId: report.id,
    });

    if ("error" in result) {
      failed += 1;
      errors.push(`Report ${report.id}: ${result.error}`);
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from("reports")
      .update({ email_status: "sent" })
      .eq("id", report.id);

    if (updateError) {
      failed += 1;
      errors.push(`Report ${report.id}: ${updateError.message}`);
      continue;
    }

    sent += 1;
  }

  const nextStatus = failed > 0 ? "partial" : "sent";
  const { error: batchUpdateError } = await supabaseAdmin
    .from("report_batches")
    .update({
      status: nextStatus,
      sent_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  if (batchUpdateError) {
    return NextResponse.json({ error: batchUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ sent, failed, errors });
}
