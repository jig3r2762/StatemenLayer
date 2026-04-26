import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { OwnerHistoryClient } from "@/app/dashboard/owners/[id]/history/OwnerHistoryClient";

type RawReportRow = {
  id: string;
  pdf_url: string | null;
  email_status: "pending" | "sent" | "delivered" | "opened";
  opened_at: string | null;
  batch: { month: string } | { month: string }[] | null;
};

async function getOwnerHistory(userId: string, ownerId: string) {
  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!account) return null;

  const { data: owner } = await supabaseAdmin
    .from("owners")
    .select("id, name, account_id")
    .eq("id", ownerId)
    .single();
  if (!owner || owner.account_id !== account.id) return null;

  const { data: reports } = await supabaseAdmin
    .from("reports")
    .select("id, pdf_url, email_status, opened_at, batch:report_batches(month)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  return {
    ownerName: owner.name,
    reports: (reports ?? []) as RawReportRow[],
  };
}

export default async function OwnerHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  const data = await getOwnerHistory(userId!, id);

  if (!data) notFound();

  return (
    <div style={{ flex: 1 }}>
      <Header title={`Report History — ${data.ownerName}`} />
      <div style={{ padding: "0 32px 32px" }}>
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Past Reports</span>
          </div>

          {data.reports.length === 0 ? (
            <div style={{ padding: "64px 18px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No reports yet</p>
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>This owner has not received any reports.</p>
            </div>
          ) : (
            <OwnerHistoryClient
              rows={data.reports.map((r) => ({
                id: r.id,
                month: (() => {
                  const b = r.batch;
                  if (!b) return null;
                  if (Array.isArray(b)) return b[0]?.month ?? null;
                  return b.month ?? null;
                })(),
                pdfUrl: r.pdf_url,
                emailStatus: r.email_status,
                openedAt: r.opened_at,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
