"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2, AlertTriangle, X } from "lucide-react";
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendErrors, setSendErrors] = useState<string[]>([]);

  const isReady = batch.status === "ready" || batch.status === "partial";
  const isSent  = batch.status === "sent" || localDone;
  const allMissing = missingEmailCount === totalReports;

  if (!isReady && !isSent) return null;

  const isSelective = selectedReportIds && selectedReportIds.length > 0;
  const sendCount = isSelective ? selectedReportIds.length : totalReports - missingEmailCount;

  async function confirmSend() {
    setShowConfirm(false);
    setSending(true);
    setSendErrors([]);
    try {
      const body: { reportIds?: string[] } = {};
      if (isSelective) body.reportIds = selectedReportIds;

      const res = await fetch(`/api/batches/${batch.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { sent?: number; failed?: number; errors?: string[] };
      if (data.errors && data.errors.length > 0) {
        setSendErrors(data.errors);
      }
      if (res.ok && (!data.failed || data.failed === 0)) {
        setLocalDone(true);
      }
      router.refresh();
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
              onClick={() => setShowConfirm(true)}
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

      {/* Send errors */}
      {sendErrors.length > 0 && (
        <div style={{ padding: "10px 32px 14px", borderTop: "1px solid #FEE2E2", background: "#FFF5F5" }}>
          {sendErrors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: "#DC2626", display: "flex", alignItems: "flex-start", gap: 6, marginTop: i > 0 ? 4 : 0 }}>
              <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,15,30,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: 12, padding: "28px 32px", width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(10,15,30,0.18)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: "#FEF3C7", borderRadius: 8, padding: 8, display: "flex" }}>
                  <Send style={{ width: 18, height: 18, color: "#D97706" }} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#0A0F1E", fontFamily: "var(--font-dm-sans, sans-serif)" }}>
                  Confirm send
                </span>
              </div>
              <button onClick={() => setShowConfirm(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9CA3AF" }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: "#374151", margin: "0 0 6px", lineHeight: 1.5 }}>
              {isSelective
                ? <>Send reports to <strong>{sendCount} selected owner{sendCount !== 1 ? "s" : ""}</strong>?</>
                : <>Send reports to <strong>{sendCount} owner{sendCount !== 1 ? "s" : ""}</strong>?</>
              }
            </p>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 24px" }}>
              Owners will receive an email with their PDF attached. This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ padding: "9px 18px", fontSize: 13, fontWeight: 600, background: "white", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSend}
                style={{ padding: "9px 18px", fontSize: 13, fontWeight: 700, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)" }}
              >
                Yes, send reports
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
