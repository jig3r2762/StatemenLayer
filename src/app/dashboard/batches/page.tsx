import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { UploadCloud } from "lucide-react";
import type { ReportBatch } from "@/types/database";
import { BatchesClient } from "./BatchesClient";

async function getBatchesWithStats(userId: string) {
  const { data: account } = await supabaseAdmin.from("accounts").select("id").eq("clerk_user_id", userId).single();
  if (!account) return { batches: [], months: [], totals: { sent: 0, opened: 0, openRate: 0 } };

  const { data } = await supabaseAdmin.from("report_batches").select("*").eq("account_id", account.id).order("created_at", { ascending: false });
  const batches = (data ?? []) as ReportBatch[];
  const batchIds = batches.map((b) => b.id);

  const { data: reportRows } = batchIds.length
    ? await supabaseAdmin.from("reports").select("batch_id, email_status").in("batch_id", batchIds)
    : { data: [] as Array<{ batch_id: string; email_status: string }> };

  const statsByBatch = new Map<string, { reportCount: number; openedCount: number; sentCount: number }>();
  (reportRows ?? []).forEach((r) => {
    const cur = statsByBatch.get(r.batch_id) ?? { reportCount: 0, openedCount: 0, sentCount: 0 };
    cur.reportCount += 1;
    if (r.email_status === "opened") cur.openedCount += 1;
    if (r.email_status !== "pending") cur.sentCount += 1;
    statsByBatch.set(r.batch_id, cur);
  });

  const enriched = batches.map((b) => {
    const st = statsByBatch.get(b.id) ?? { reportCount: 0, openedCount: 0, sentCount: 0 };
    return { ...b, ...st };
  });

  const totalSent = enriched.reduce((sum, b) => sum + b.sentCount, 0);
  const totalOpened = enriched.reduce((sum, b) => sum + b.openedCount, 0);
  const totalReports = enriched.reduce((sum, b) => sum + b.reportCount, 0);
  const openRate = totalReports > 0 ? Math.round((totalOpened / totalReports) * 100) : 0;
  const months = Array.from(new Set(enriched.map((b) => b.month))).sort().reverse();

  return { batches: enriched, months, totals: { sent: totalSent, opened: totalOpened, openRate } };
}

export default async function BatchesPage() {
  const { userId } = await auth();
  const { batches, months, totals } = await getBatchesWithStats(userId!);

  return (
    <div style={{ flex: 1 }}>
      <Header
        title="Reports"
        actions={
          <Link
            href="/dashboard/upload"
            prefetch={true}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#F59E0B", color: "#0A0F1E", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "var(--font-dm-sans, sans-serif)" }}
          >
            <UploadCloud style={{ width: 15, height: 15 }} />
            New upload
          </Link>
        }
      />

      <div style={{ padding: "0 32px 32px" }}>
        {/* Stats bar */}
        <div style={{ display: "flex", gap: 24, marginBottom: 20, fontSize: 13, color: "#6B7280" }}>
          <span><span style={{ fontWeight: 600, color: "#111827", fontFamily: "var(--font-jetbrains, monospace)" }}>{totals.sent}</span> sent</span>
          <span><span style={{ fontWeight: 600, color: "#111827", fontFamily: "var(--font-jetbrains, monospace)" }}>{totals.opened}</span> opened</span>
          <span><span style={{ fontWeight: 600, color: "#111827", fontFamily: "var(--font-jetbrains, monospace)" }}>{totals.openRate}%</span> open rate</span>
        </div>

        {batches.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "64px 18px", textAlign: "center", boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}>
            <UploadCloud style={{ width: 32, height: 32, color: "#D1D5DB", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No reports yet</p>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>Upload a CSV export — owners are detected automatically and reports are generated immediately</p>
            <Link href="/dashboard/upload" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#F59E0B", color: "#0A0F1E", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Upload CSV
            </Link>
          </div>
        ) : (
          <BatchesClient
            rows={batches.map((b) => ({
              id: b.id,
              month: b.month,
              source_file: b.source_file,
              status: b.status,
              reportCount: b.reportCount,
              openedCount: b.openedCount,
              sentCount: b.sentCount,
              created_at: b.created_at,
            }))}
            availableMonths={months}
          />
        )}
      </div>
    </div>
  );
}
