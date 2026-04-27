"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatMonth } from "@/lib/utils";
import type { ReportBatch } from "@/types/database";
import Link from "next/link";

interface Props {
  batch: ReportBatch;
  totalReports: number;
  sentCount: number;
  missingEmailCount: number;
  selectedReportIds?: string[];
}

export function BatchStickyBar({ batch, totalReports, sentCount, missingEmailCount, selectedReportIds }: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [localDone, setLocalDone] = useState(false);

  const isReady = batch.status === "ready" || batch.status === "partial";
  const isSent  = batch.status === "sent" || localDone;
  const allMissing = missingEmailCount === totalReports;

  if (!isReady && !isSent) return null;

  const isSelective = selectedReportIds && selectedReportIds.length > 0;
  const sendCount = isSelective ? selectedReportIds.length : totalReports - missingEmailCount;

  async function handleSend() {
    const label = isSelective
      ? `Send reports to ${sendCount} selected owner${sendCount !== 1 ? "s" : ""}?`
      : `Send reports to ${sendCount} owner${sendCount !== 1 ? "s" : ""}? This cannot be undone.`;
    if (!confirm(label)) return;

    setSending(true);
    try {
      const body: { reportIds?: string[] } = {};
      if (isSelective) body.reportIds = selectedReportIds;

      const res = await fetch(`/api/batches/${batch.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setLocalDone(true);
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  }

  if (isSent) {
    return (
      <div style={{ borderBottom: "1px solid #D1FAE5", background: "#ECFDF5", padding: "14px 32px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#047857" }}>
        <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
        <span><strong>{totalReports - missingEmailCount} reports sent</strong> — check your email tracking below</span>
      </div>
    );
  }

  return (
    <div style={{ borderBottom: "1px solid #E5E7EB", background: "#FAF8F4" }}>
      {/* Missing email warning */}
      {missingEmailCount > 0 && (
        <div style={{ padding: "10px 32px", background: "#FFFBEB", borderBottom: "1px solid #FEF3C7", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#92400E" }}>
          <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, color: "#D97706" }} />
          <span>
            <strong>{missingEmailCount} owner{missingEmailCount !== 1 ? "s" : ""}</strong> {missingEmailCount !== 1 ? "have" : "has"} no email address and will be skipped.{" "}
            <Link href="/dashboard/owners" style={{ fontWeight: 600, color: "#92400E", textDecoration: "underline" }}>
              Add emails →
            </Link>
          </span>
        </div>
      )}

      <div className="px-page" style={{ padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
            {formatMonth(batch.month)} · {totalReports} report{totalReports !== 1 ? "s" : ""} ready to send
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>
            All PDFs generated · {sentCount} of {totalReports} sent
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          {allMissing ? (
            <Link
              href="/dashboard/owners"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F59E0B", color: "#0A0F1E", borderRadius: 6, padding: "10px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "var(--font-dm-sans, sans-serif)" }}
            >
              Add owner emails to send →
            </Link>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#F59E0B", color: "#0A0F1E", border: "none",
                borderRadius: 6, padding: "10px 22px", fontSize: 14, fontWeight: 700,
                cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1,
                fontFamily: "var(--font-dm-sans, sans-serif)",
              }}
            >
              {sending
                ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Sending…</>
                : isSelective
                  ? <><Send style={{ width: 15, height: 15 }} /> Send {sendCount} selected →</>
                  : <><Send style={{ width: 15, height: 15 }} /> Send {sendCount} report{sendCount !== 1 ? "s" : ""} →</>
              }
            </button>
          )}
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
            {isSelective
              ? `${sendCount} of ${totalReports} owners selected · uncheck to send all`
              : "Check boxes below to send to specific owners only"
            }
          </div>
        </div>
      </div>
    </div>
  );
}
