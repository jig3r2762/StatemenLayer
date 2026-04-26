"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Link2 } from "lucide-react";
import { EmailStatusBadge } from "@/components/batches/EmailStatusBadge";
import { formatMonth } from "@/lib/utils";

type Row = {
  id: string;
  month: string | null;
  pdfUrl: string | null;
  emailStatus: "pending" | "sent" | "delivered" | "opened";
  openedAt: string | null;
};

const btnSecondary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "white", color: "#374151", border: "1px solid #E5E7EB",
  borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 500,
  cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)",
};

export function OwnerHistoryClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend(reportId: string) {
    setError(null);
    setSendingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}/resend`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(data?.error ?? "Failed to re-send report.");
    } finally {
      setSendingId(null);
    }
  }

  async function regenerateLink(reportId: string) {
    setError(null);
    setRegeneratingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ web_token: null }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) setError(data?.error ?? "Failed to regenerate link.");
      else router.refresh();
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ padding: "10px 16px", fontSize: 13, color: "#B91C1C", background: "#FEF2F2", borderBottom: "1px solid #FEE2E2" }}>{error}</div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#FAFAFA" }}>
            {["Month", "PDF", "Email Status", "Opened At", ""].map((h) => (
              <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", borderBottom: "1px solid #F3F4F6", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
              <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500, color: "#111827" }}>
                {r.month ? formatMonth(r.month) : "—"}
              </td>
              <td style={{ padding: "11px 16px" }}>
                {r.pdfUrl ? (
                  <a href={r.pdfUrl} style={{ fontSize: 12, fontWeight: 500, color: "#F59E0B", textDecoration: "none" }} target="_blank" rel="noreferrer">Download</a>
                ) : (
                  <span style={{ fontSize: 12, color: "#D1D5DB" }}>Not generated</span>
                )}
              </td>
              <td style={{ padding: "11px 16px" }}>
                <EmailStatusBadge status={r.emailStatus} />
              </td>
              <td style={{ padding: "11px 16px", fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-jetbrains, monospace)" }}>
                {r.openedAt ? new Date(r.openedAt).toLocaleString() : "—"}
              </td>
              <td style={{ padding: "11px 16px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    disabled={regeneratingId === r.id}
                    style={{ ...btnSecondary, opacity: regeneratingId === r.id ? 0.7 : 1 }}
                    onClick={() => void regenerateLink(r.id)}
                  >
                    {regeneratingId === r.id
                      ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                      : <Link2 style={{ width: 12, height: 12 }} />
                    }
                    Regenerate Link
                  </button>

                  <button
                    type="button"
                    disabled={!r.pdfUrl || sendingId === r.id}
                    style={{ ...btnSecondary, opacity: (!r.pdfUrl || sendingId === r.id) ? 0.5 : 1 }}
                    onClick={() => void resend(r.id)}
                  >
                    {sendingId === r.id
                      ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                      : <RotateCcw style={{ width: 12, height: 12 }} />
                    }
                    Re-send
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
