import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { EmailStatusBadge } from "@/components/batches/EmailStatusBadge";
import { CommentaryEditor } from "@/components/reports/CommentaryEditor";
import { formatMonth } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import type { Report } from "@/types/database";
import { ReviewBatchClient } from "./ReviewBatchClient";

async function getReviewData(userId: string, batchId: string) {
  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return null;

  const { data: batch } = await supabaseAdmin
    .from("report_batches")
    .select("*")
    .eq("id", batchId)
    .eq("account_id", account.id)
    .single();

  if (!batch) return null;

  const { data: reports } = await supabaseAdmin
    .from("reports")
    .select("*, owner:owners(*)")
    .eq("batch_id", batchId);

  const sorted = ((reports ?? []) as Report[]).sort((a, b) =>
    (a.owner?.name ?? "").localeCompare(b.owner?.name ?? "")
  );

  return { batch, reports: sorted };
}

const btnSecondary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "white", color: "#374151", border: "1px solid #E5E7EB",
  borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500,
  cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)",
  textDecoration: "none",
};

export default async function BatchReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  const data = await getReviewData(userId!, id);

  if (!data) notFound();

  const { batch, reports } = data;

  return (
    <div style={{ flex: 1 }}>
      <Header title={`Review Batch — ${formatMonth(batch.month)}`} />
      <div style={{ padding: "0 32px 32px", maxWidth: 800 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: "#6B7280" }}>
            {reports.length} report{reports.length !== 1 ? "s" : ""} in this batch
          </span>
          <ReviewBatchClient batchId={batch.id} reportsCount={reports.length} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {reports.length === 0 ? (
            <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "64px 18px", textAlign: "center", boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No reports found</p>
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>This batch doesn&apos;t have any reports yet.</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{report.owner?.name ?? "—"}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Statement ready for review</div>
                  </div>
                  <EmailStatusBadge status={report.email_status} />
                </div>
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  <CommentaryEditor
                    reportId={report.id}
                    initialCommentary={report.ai_commentary}
                    ownerName={report.owner?.name ?? "Owner"}
                  />

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {report.pdf_url ? (
                      <a href={report.pdf_url} target="_blank" rel="noreferrer" style={btnSecondary}>
                        <ExternalLink style={{ width: 14, height: 14 }} /> Preview PDF
                      </a>
                    ) : (
                      <span style={{ ...btnSecondary, opacity: 0.5, cursor: "not-allowed" }}>
                        <ExternalLink style={{ width: 14, height: 14 }} /> Preview PDF
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
