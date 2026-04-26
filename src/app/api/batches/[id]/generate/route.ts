import { auth } from "@clerk/nextjs/server";
import { generateCommentary } from "@/lib/ai/commentary";
import { generatePdf } from "@/lib/pdf/engine";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Account, MonthlyTrend, Owner, PrevMonthFigures } from "@/types/database";
import type { NormalizedReport } from "@/types/parsers";

export const runtime = "nodejs";
export const maxDuration = 300;

function sanitizeFilename(value: string): string {
  return value.replace(/[\/\\:]/g, "-").replace(/\s+/g, " ").trim();
}

type ReportRow = {
  id: string;
  owner_id: string;
  parsed_data: NormalizedReport | null;
  owner: Owner | Owner[] | null;
};

function sse(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { id } = await params;

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, plan, brand_color, logo_url, firm_name, clerk_user_id, stripe_id, created_at")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return new Response(JSON.stringify({ error: "Account not found" }), { status: 404 });

  const { data: batch } = await supabaseAdmin
    .from("report_batches")
    .select("id, account_id, status, prev_month_data")
    .eq("id", id)
    .eq("account_id", account.id)
    .single();

  if (!batch) return new Response(JSON.stringify({ error: "Batch not found" }), { status: 404 });

  await supabaseAdmin.from("report_batches").update({ status: "processing" }).eq("id", batch.id);

  // Build 3-month trend data per owner
  const { data: recentBatches } = await supabaseAdmin
    .from("report_batches")
    .select("id, month")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const ownerTrendMap: Record<string, MonthlyTrend[]> = {};

  for (const b of recentBatches ?? []) {
    const { data: batchReports } = await supabaseAdmin
      .from("reports")
      .select("owner_id, parsed_data")
      .eq("batch_id", b.id);

    for (const br of batchReports ?? []) {
      if (!br.owner_id || !br.parsed_data) continue;
      const d = br.parsed_data as NormalizedReport;
      if (!ownerTrendMap[br.owner_id]) ownerTrendMap[br.owner_id] = [];
      ownerTrendMap[br.owner_id].push({
        month: b.month,
        income: d.total_income,
        expenses: d.total_expenses,
        net: d.net_to_owner,
      });
    }
  }

  for (const ownerId of Object.keys(ownerTrendMap)) {
    ownerTrendMap[ownerId].sort((a, b) => a.month.localeCompare(b.month));
  }

  const { data: reports, error: reportsError } = await supabaseAdmin
    .from("reports")
    .select("id, owner_id, parsed_data, owner:owners(*)")
    .eq("batch_id", batch.id)
    .order("created_at", { ascending: true });

  if (reportsError) {
    return new Response(JSON.stringify({ error: reportsError.message }), { status: 500 });
  }

  const prevMonthData = (batch.prev_month_data as Record<string, PrevMonthFigures> | null) ?? {};
  const reportList = (reports ?? []) as ReportRow[];
  const total = reportList.length;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse({ type: "start", total }));

      let generated = 0;
      const errors: string[] = [];

      for (const rawReport of reportList) {
        const owner = Array.isArray(rawReport.owner) ? rawReport.owner[0] : rawReport.owner;
        const ownerName = owner?.name ?? "Unknown";

        if (!owner || !rawReport.parsed_data) {
          errors.push(`Report ${rawReport.id}: missing data`);
          controller.enqueue(sse({ type: "error", reportId: rawReport.id }));
          continue;
        }

        try {
          const prevFigures = prevMonthData[rawReport.owner_id] ?? undefined;
          const trendData = ownerTrendMap[rawReport.owner_id] ?? [];

          const commentary = await generateCommentary(rawReport.parsed_data, prevFigures);
          const pdfBuffer = await generatePdf({
            report: rawReport.parsed_data,
            owner,
            account: account as Account,
            attachmentUrls: [],
            trendData,
          });

          const fileName = `${account.id}/${batch.id}/${sanitizeFilename(owner.name)}.pdf`;

          const { error: uploadErr } = await supabaseAdmin.storage
            .from("pdfs")
            .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

          if (uploadErr) throw new Error(uploadErr.message);

          const { error: updateError } = await supabaseAdmin
            .from("reports")
            .update({ pdf_url: fileName, ai_commentary: commentary })
            .eq("id", rawReport.id);

          if (updateError) throw new Error(updateError.message);

          generated += 1;
          controller.enqueue(sse({ type: "progress", done: generated, total, reportId: rawReport.id, ownerName }));
        } catch (error) {
          console.error(
            `[batch-generate] batch=${batch.id} report=${rawReport.id} failed`,
            error instanceof Error ? error.message : "Unknown error"
          );
          errors.push(`Report ${rawReport.id}: generation failed`);
          controller.enqueue(sse({ type: "error", reportId: rawReport.id }));
        }
      }

      const nextStatus = errors.length > 0 ? (generated > 0 ? "partial" : "pending") : "ready";
      await supabaseAdmin.from("report_batches").update({ status: nextStatus }).eq("id", batch.id);

      controller.enqueue(sse({ type: "complete", status: nextStatus, generated, failed: errors.length }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
