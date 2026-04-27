import { Suspense } from "react";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AlertTriangle, UploadCloud, Send } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/utils";
import { DashboardGreeting } from "./_components/DashboardGreeting";

async function getDashboardData(userId: string) {
  let { data: account } = await supabaseAdmin
    .from("accounts").select("id").eq("clerk_user_id", userId).single();

  if (!account) {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0] || "My Firm";
    const { data: created } = await supabaseAdmin
      .from("accounts")
      .insert({ clerk_user_id: userId, firm_name: `${name}'s Firm`, brand_color: "#F59E0B", plan: "starter" })
      .select("id").single();
    account = created;
  }
  if (!account) return null;

  const [
    { count: ownerCount },
    { count: batchCount },
    { data: recentBatches },
    { data: allBatches },
  ] = await Promise.all([
    supabaseAdmin.from("owners").select("id", { count: "exact", head: true }).eq("account_id", account.id).eq("active", true),
    supabaseAdmin.from("report_batches").select("id", { count: "exact", head: true }).eq("account_id", account.id),
    supabaseAdmin.from("report_batches").select("id, month, status, sent_at, created_at").eq("account_id", account.id).order("created_at", { ascending: false }).limit(6),
    supabaseAdmin.from("report_batches").select("id, month, sent_at").eq("account_id", account.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const batchIds = (allBatches ?? []).map((b) => b.id);
  const { data: reportRows } = batchIds.length
    ? await supabaseAdmin.from("reports").select("batch_id, email_status").in("batch_id", batchIds)
    : { data: [] as Array<{ batch_id: string; email_status: string }> };

  let sentReports = 0;
  let openedReports = 0;
  (reportRows ?? []).forEach((r) => {
    if (r.email_status !== "pending") sentReports++;
    if (r.email_status === "opened") openedReports++;
  });
  const openRate = sentReports > 0 ? Math.round((openedReports / sentReports) * 100) : 0;

  const pendingBatches = (allBatches ?? []).filter((b) => !b.sent_at).length;

  const unopenedByBatch = new Map<string, number>();
  (reportRows ?? []).forEach((r) => {
    if (r.email_status === "sent" || r.email_status === "delivered") {
      unopenedByBatch.set(r.batch_id, (unopenedByBatch.get(r.batch_id) ?? 0) + 1);
    }
  });
  const now = Date.now();
  const alertBatch = (allBatches ?? []).find((b) => {
    if (!b.sent_at) return false;
    if (now - new Date(b.sent_at).getTime() <= 48 * 60 * 60 * 1000) return false;
    return (unopenedByBatch.get(b.id) ?? 0) > 0;
  });

  return {
    ownerCount: ownerCount ?? 0,
    batchCount: batchCount ?? 0,
    sentReports,
    openRate,
    pendingBatches,
    recentBatches: recentBatches ?? [],
    alert: alertBatch
      ? { batchId: alertBatch.id, month: alertBatch.month, count: unopenedByBatch.get(alertBatch.id) ?? 0 }
      : null,
  };
}

const STATUS_MAP: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  sent:       { bg: "#ECFDF5", color: "#047857", dot: "#059669", label: "Sent" },
  ready:      { bg: "#EFF6FF", color: "#1D4ED8", dot: "#2563EB", label: "Ready" },
  processing: { bg: "#FFFBEB", color: "#92400E", dot: "#D97706", label: "Processing" },
  partial:    { bg: "#FEF3C7", color: "#92400E", dot: "#D97706", label: "Partial" },
  pending:    { bg: "#F3F4F6", color: "#4B5563", dot: "#9CA3AF", label: "Pending" },
};

/* ── Async sub-components ── */

async function AlertBanner({ dp }: { dp: ReturnType<typeof getDashboardData> }) {
  const data = await dp;
  if (!data?.alert) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#92400E" }}>
      <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, color: "#D97706" }} />
      <span>
        <strong>{data.alert.count}</strong> owner{data.alert.count !== 1 ? "s" : ""} haven&apos;t opened their {formatMonth(data.alert.month)} report.{" "}
        <Link href={`/dashboard/batches/${data.alert.batchId}`} style={{ fontWeight: 600, textDecoration: "underline" }}>
          View reports →
        </Link>
      </span>
    </div>
  );
}

async function StatsRow({ dp }: { dp: ReturnType<typeof getDashboardData> }) {
  const data = await dp;
  if (!data) return null;

  const stats = [
    { label: "Reports sent this month", value: data.sentReports.toString(), sub: "Total emails delivered", up: null },
    { label: "Active owners",            value: data.ownerCount.toString(),  sub: `${data.ownerCount} profiles active`, up: null },
    { label: "Avg open rate",            value: `${data.openRate}%`,         sub: data.openRate >= 61 ? "↑ Above industry avg" : "Industry avg: 61%", up: data.openRate >= 61 },
    { label: "Unsent reports",            value: data.pendingBatches.toString(), sub: data.pendingBatches > 0 ? "Ready to send" : "All reports sent", up: null },
  ];

  return (
    <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
      {stats.map((s) => (
        <div key={s.label} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "16px 18px", boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 8 }}>{s.label}</div>
          <div style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontSize: 28, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
          {s.sub && (
            <div style={{ fontSize: 12, color: s.up === true ? "#059669" : "#9CA3AF", marginTop: 6 }}>
              {s.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

async function RecentBatchesTable({ dp }: { dp: ReturnType<typeof getDashboardData> }) {
  const data = await dp;
  if (!data) return null;

  return (
    <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Recent reports</span>
        <Link href="/dashboard/batches" prefetch={true} style={{ fontSize: 12, color: "#D97706", textDecoration: "none", fontWeight: 500 }}>View all →</Link>
      </div>

      {data.recentBatches.length === 0 ? (
        <div style={{ padding: "48px 18px", textAlign: "center" }}>
          <UploadCloud style={{ width: 32, height: 32, color: "#D1D5DB", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No reports yet</p>
          <p style={{ fontSize: 13, color: "#9CA3AF" }}>Upload a CSV to generate your first owner reports</p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FAFAFA" }}>
              {["Batch", "Status", "Date", ""].map((h) => (
                <th key={h} style={{ padding: "9px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", borderBottom: "1px solid #F3F4F6" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.recentBatches.map((batch) => {
              const st = STATUS_MAP[batch.status] ?? STATUS_MAP.pending;
              const needsAction = batch.status === "pending" || batch.status === "processing" || batch.status === "partial";
              const isReady = batch.status === "ready";
              return (
                <tr key={batch.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "11px 18px" }}>
                    <Link href={`/dashboard/batches/${batch.id}`} prefetch={true} style={{ fontSize: 13, fontWeight: 500, color: "#111827", textDecoration: "none" }}>
                      {formatMonth(batch.month)}
                    </Link>
                  </td>
                  <td style={{ padding: "11px 18px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 9999, fontSize: 11, fontWeight: 500, padding: "2px 8px", background: st.bg, color: st.color }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot, display: "inline-block" }} />
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: "11px 18px", fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-jetbrains, monospace)" }}>
                    {new Date(batch.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td style={{ padding: "11px 18px" }}>
                    {(needsAction || isReady) && (
                      <Link
                        href={`/dashboard/batches/${batch.id}`}
                        prefetch={true}
                        style={{ fontSize: 12, fontWeight: 600, background: "#F59E0B", color: "#0A0F1E", borderRadius: 6, padding: "4px 12px", textDecoration: "none", display: "inline-block", whiteSpace: "nowrap" }}
                      >
                        {isReady ? "Review →" : "Generate →"}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

async function TotalBatchesDark({ dp }: { dp: ReturnType<typeof getDashboardData> }) {
  const data = await dp;
  return (
    <div style={{ background: "#0A0F1E", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Reports generated</div>
      <div style={{ fontFamily: "var(--font-jetbrains, monospace)", fontSize: 26, color: "#F59E0B", letterSpacing: "-0.02em" }}>{data?.batchCount ?? 0}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4, lineHeight: 1.5 }}>total report runs</div>
    </div>
  );
}

async function OnboardingFlow({ dp }: { dp: ReturnType<typeof getDashboardData> }) {
  const data = await dp;
  if (!data || data.batchCount > 0) return null;

  return (
    <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "28px 32px", display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#0A0F1E", marginBottom: 6, fontFamily: "var(--font-display-serif, serif)" }}>
            Upload your first CSV to get started
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 20 }}>
            Export from AppFolio or Buildium. We detect your owners automatically, generate branded PDFs, and write commentary for each one. No setup required.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/dashboard/upload" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F59E0B", color: "#0A0F1E", borderRadius: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <UploadCloud style={{ width: 14, height: 14 }} /> Upload CSV
            </Link>
            <Link href="/dashboard/owners" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "white", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 500, textDecoration: "none", boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}>
              Manage owners
            </Link>
          </div>
        </div>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
          {[
            { num: "1", text: "Upload CSV export" },
            { num: "2", text: "Review detected owners" },
            { num: "3", text: "Send reports — done" },
          ].map(({ num, text }) => (
            <div key={num} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#374151" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#F59E0B", color: "#0A0F1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{num}</span>
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Skeletons ── */
function StatsSkeleton() {
  return (
    <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "16px 18px", boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }} className="animate-pulse">
          <div style={{ height: 11, width: 120, background: "#F3F4F6", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 28, width: 64, background: "#F3F4F6", borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 12, width: 80, background: "#F3F4F6", borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */
export default async function DashboardPage() {
  const { userId } = await auth();
  const dp = getDashboardData(userId!);

  return (
    <div style={{ flex: 1 }}>
      {/* Header */}
      <div className="px-page" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 32px 20px" }}>
        <DashboardGreeting />
        <Link
          href="/dashboard/upload"
          prefetch={true}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "#F59E0B", color: "#0A0F1E",
            borderRadius: 6, padding: "9px 16px",
            fontSize: 13, fontWeight: 600, textDecoration: "none",
            fontFamily: "var(--font-dm-sans, sans-serif)",
          }}
        >
          <UploadCloud style={{ width: 15, height: 15 }} />
          Upload CSV
        </Link>
      </div>

      <div className="px-page" style={{ padding: "0 32px 32px" }}>
        {/* Onboarding flow (new users only) */}
        <Suspense fallback={null}>
          <OnboardingFlow dp={dp} />
        </Suspense>

        {/* Alert */}
        <Suspense fallback={null}>
          <div style={{ marginBottom: 14 }}>
            <AlertBanner dp={dp} />
          </div>
        </Suspense>

        {/* Stats */}
        <Suspense fallback={<StatsSkeleton />}>
          <div style={{ marginBottom: 20 }}>
            <StatsRow dp={dp} />
          </div>
        </Suspense>

        {/* Two columns */}
        <div className="grid-sidebar-right" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
          {/* Recent batches */}
          <Suspense
            fallback={
              <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, height: 280 }} className="animate-pulse" />
            }
          >
            <RecentBatchesTable dp={dp} />
          </Suspense>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Quick actions */}
            <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 12 }}>Quick actions</div>
              {[
                { href: "/dashboard/upload",   icon: UploadCloud, label: "Upload new CSV" },
                { href: "/dashboard/batches",  icon: Send,        label: "Send reports" },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", background: "#F9FAFB",
                    border: "1px solid #F3F4F6", borderRadius: 6,
                    padding: "9px 12px", marginBottom: 6,
                    fontSize: 13, fontWeight: 500, color: "#374151",
                    textDecoration: "none",
                    fontFamily: "var(--font-dm-sans, sans-serif)",
                    transition: "background 150ms",
                  }}
                >
                  <Icon style={{ width: 15, height: 15, color: "#D97706", flexShrink: 0 }} />
                  {label}
                </Link>
              ))}
            </div>

            {/* Dark stat card */}
            <Suspense
              fallback={
                <div style={{ background: "#0A0F1E", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 16, height: 90 }} />
              }
            >
              <TotalBatchesDark dp={dp} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
