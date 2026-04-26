import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { formatMonth } from "@/lib/utils";
import type { Report } from "@/types/database";
import { BatchActions } from "./BatchActions";
import { BatchDetailClient } from "./BatchDetailClient";

async function getBatchData(userId: string, batchId: string) {
  const { data: account } = await supabaseAdmin
    .from("accounts").select("id").eq("clerk_user_id", userId).single();
  if (!account) return null;

  const { data: batch } = await supabaseAdmin
    .from("report_batches").select("*").eq("id", batchId).eq("account_id", account.id).single();
  if (!batch) return null;

  const { data: reports } = await supabaseAdmin
    .from("reports").select("*, owner:owners(*)").eq("batch_id", batchId).order("created_at", { ascending: true });

  return { batch, reports: (reports ?? []) as Report[] };
}

const STATUS_COLORS: Record<string, { dot: string; bg: string; color: string; label: string }> = {
  ready:      { dot: "#3B82F6", bg: "#EFF6FF", color: "#1D4ED8", label: "Ready" },
  processing: { dot: "#F59E0B", bg: "#FFFBEB", color: "#92400E", label: "Processing" },
  sent:       { dot: "#059669", bg: "#ECFDF5", color: "#047857", label: "Sent" },
  partial:    { dot: "#F97316", bg: "#FFF7ED", color: "#C2410C", label: "Partial" },
};

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  const data = await getBatchData(userId!, id);
  if (!data) notFound();

  const { batch, reports } = data;
  const openedCount  = reports.filter((r) => r.email_status === "opened").length;
  const sentCount    = reports.filter((r) => r.email_status !== "pending").length;
  const openRate     = sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : 0;

  const statusCfg = STATUS_COLORS[batch.status] ?? STATUS_COLORS.ready;

  const unopenedCount = batch.sent_at && (Date.now() - new Date(batch.sent_at).getTime() > 48 * 60 * 60 * 1000)
    ? reports.filter((r) => r.email_status === "sent" || r.email_status === "delivered").length
    : 0;

  const stats = [
    { label: "Status",    value: statusCfg.label, mono: false, extra: <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: statusCfg.dot, marginRight: 6 }} /> },
    { label: "Reports",   value: String(reports.length), mono: true, extra: null },
    { label: "Sent",      value: String(sentCount),  mono: true, extra: null },
    { label: "Open rate", value: `${openRate}%`,     mono: true, extra: null },
  ];

  return (
    <div style={{ flex: 1 }}>
      <Header
        title={formatMonth(batch.month)}
        description={`${batch.source_file} · ${reports.length} reports`}
        actions={<BatchActions batch={batch} reportsCount={reports.length} />}
      />

      <BatchDetailClient
        batch={batch}
        reports={reports}
        sentCount={sentCount}
        missingEmailCount={reports.filter((r) => !r.owner?.email).length}
        stats={stats}
        unopenedCount={unopenedCount}
      />
    </div>
  );
}
