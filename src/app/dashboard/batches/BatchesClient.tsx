"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { formatMonth } from "@/lib/utils";

type BatchRow = {
  id: string;
  month: string;
  source_file: string;
  status: string;
  reportCount: number;
  openedCount: number;
  sentCount: number;
  created_at: string;
};

const STATUS_MAP: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  sent:       { bg: "#ECFDF5", color: "#047857", dot: "#059669", label: "Sent" },
  ready:      { bg: "#EFF6FF", color: "#1D4ED8", dot: "#2563EB", label: "Ready" },
  processing: { bg: "#FFFBEB", color: "#92400E", dot: "#D97706", label: "Processing" },
  partial:    { bg: "#FEF3C7", color: "#92400E", dot: "#D97706", label: "Partial" },
  pending:    { bg: "#F3F4F6", color: "#4B5563", dot: "#9CA3AF", label: "Draft" },
};

function StatusBadge({ status }: { status: string }) {
  const st = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 9999, fontSize: 11, fontWeight: 500, padding: "2px 8px", background: st.bg, color: st.color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot }} />
      {st.label}
    </span>
  );
}

export function BatchesClient({ rows, availableMonths }: { rows: BatchRow[]; availableMonths: string[] }) {
  const router = useRouter();
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = useCallback(async (batchId: string, batchMonth: string) => {
    setDownloadingId(batchId);
    try {
      const res = await fetch(`/api/batches/${batchId}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string }).error ?? "Download failed — try regenerating the batch.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `batch-${batchMonth}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Network error — please try again.");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  useEffect(() => {
    rows.slice(0, 5).forEach((batch) => router.prefetch(`/dashboard/batches/${batch.id}`));
  }, [router, rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (month !== "all" && r.month !== month) return false;
    if (status !== "all" && r.status !== status) return false;
    return true;
  }), [rows, month, status]);

  const selectStyle: React.CSSProperties = {
    fontSize: 13, color: "#374151", background: "white",
    border: "1px solid #E5E7EB", borderRadius: 6,
    padding: "7px 10px", outline: "none",
    fontFamily: "var(--font-dm-sans, sans-serif)",
    cursor: "pointer",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <select style={selectStyle} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All months</option>
          {availableMonths.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        <select style={selectStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="processing">Processing</option>
          <option value="ready">Ready</option>
          <option value="sent">Sent</option>
          <option value="partial">Partial</option>
        </select>
        <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: "auto", alignSelf: "center" }}>
          {filtered.length} batch{filtered.length !== 1 ? "es" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "48px 18px", textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>
          No matching batches
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFAFA" }}>
                {["Batch", "Source file", "Owners", "Sent", "Status", "Date", ""].map((h, i) => (
                  <th key={i} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", borderBottom: "1px solid #F3F4F6", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((batch) => (
                <tr
                  key={batch.id}
                  style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}
                  onClick={() => router.push(`/dashboard/batches/${batch.id}`)}
                >
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{formatMonth(batch.month)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#6B7280", fontFamily: "var(--font-jetbrains, monospace)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{batch.source_file}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151" }}>{batch.reportCount}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: batch.sentCount > 0 ? "#059669" : "#374151" }}>
                    {batch.sentCount > 0 ? batch.sentCount : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={batch.status} /></td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-jetbrains, monospace)", whiteSpace: "nowrap" }}>
                    {new Date(batch.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                    {batch.status === "pending" ? (
                      <Link href={`/dashboard/batches/${batch.id}`} style={{ fontSize: 12, fontWeight: 600, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "5px 12px", textDecoration: "none", display: "inline-block" }}>
                        Generate →
                      </Link>
                    ) : batch.status === "processing" || batch.status === "partial" ? (
                      <Link href={`/dashboard/batches/${batch.id}`} style={{ fontSize: 12, fontWeight: 600, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "5px 12px", textDecoration: "none", display: "inline-block" }}>
                        Generate →
                      </Link>
                    ) : batch.status === "ready" ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Link href={`/dashboard/batches/${batch.id}`} style={{ fontSize: 12, fontWeight: 600, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "5px 12px", textDecoration: "none", display: "inline-block" }}>
                          Review →
                        </Link>
                        <button
                          onClick={() => handleDownload(batch.id, batch.month)}
                          disabled={downloadingId === batch.id}
                          style={{ fontSize: 12, color: "#6B7280", background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                        >
                          {downloadingId === batch.id
                            ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                            : <Download style={{ width: 12, height: 12 }} />
                          }
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
