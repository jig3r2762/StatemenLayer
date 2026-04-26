"use client";
import { useState, useEffect, useCallback } from "react";
import { Eye, X, Download } from "lucide-react";
import { EmailStatusBadge } from "@/components/batches/EmailStatusBadge";
import type { Report } from "@/types/database";

interface Props {
  reports: Report[];
  month: string;
  pendingCount: number;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  batchStatus: string;
}

export function ReportsTableClient({ reports, month, pendingCount, selectedIds, onSelectionChange, batchStatus }: Props) {
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [previewOwner, setPreviewOwner] = useState<string>("");

  const closeModal = useCallback(() => setPreviewReportId(null), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    if (previewReportId) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewReportId, closeModal]);

  const pdfHref = previewReportId ? `/api/reports/${previewReportId}/pdf` : "";

  // Show checkboxes only when batch is in a sendable state
  const showSelect = ["ready", "partial", "sent"].includes(batchStatus);
  const selectableReports = reports.filter((r) => r.owner?.email);
  const allSelected = selectableReports.length > 0 && selectableReports.every((r) => selectedIds.includes(r.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(selectableReports.map((r) => r.id));
    }
  }

  function toggleOne(id: string) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  return (
    <>
      {/* Preview modal */}
      {previewReportId && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 10,
              width: "100%", maxWidth: 900, height: "90vh",
              overflow: "hidden", display: "flex", flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid #E5E7EB",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{previewOwner}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{month}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <a
                  href={pdfHref}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 500, color: "#374151",
                    background: "white", border: "1px solid #E5E7EB",
                    borderRadius: 6, padding: "6px 12px", textDecoration: "none",
                  }}
                >
                  <Download style={{ width: 12, height: 12 }} /> Download PDF
                </a>
                <button
                  onClick={closeModal}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 30, borderRadius: 6,
                    background: "white", border: "1px solid #E5E7EB",
                    cursor: "pointer", color: "#6B7280",
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>

            {/* PDF iframe */}
            <iframe
              src={pdfHref}
              style={{ width: "100%", border: "none", flex: 1, minHeight: 0 }}
              title={`PDF preview — ${previewOwner}`}
            />
          </div>
        </div>
      )}

      {/* Reports table */}
      <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Owner reports</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {showSelect && selectedIds.length > 0 && (
              <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600 }}>
                {selectedIds.length} selected
              </span>
            )}
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{pendingCount} pending</span>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FAFAFA" }}>
              {showSelect && (
                <th style={{ padding: "9px 12px 9px 16px", width: 36, borderBottom: "1px solid #F3F4F6" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    style={{ cursor: "pointer", accentColor: "#F59E0B", width: 14, height: 14 }}
                    title="Select all"
                  />
                </th>
              )}
              {["Owner", "Email", "Preview", "Status"].map((h) => (
                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", borderBottom: "1px solid #F3F4F6", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const ownerName  = report.owner?.name  ?? (report.parsed_data as { owner_name?: string } | null)?.owner_name ?? "—";
              const ownerEmail = report.owner?.email ?? "—";
              const initials   = ownerName.charAt(0).toUpperCase();
              const hasEmail   = !!report.owner?.email;
              const isSelected = selectedIds.includes(report.id);

              return (
                <tr
                  key={report.id}
                  style={{
                    borderBottom: "1px solid #F3F4F6",
                    background: isSelected ? "#FFFBEB" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {showSelect && (
                    <td style={{ padding: "11px 12px 11px 16px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => hasEmail && toggleOne(report.id)}
                        disabled={!hasEmail}
                        style={{ cursor: hasEmail ? "pointer" : "not-allowed", accentColor: "#F59E0B", width: 14, height: 14, opacity: hasEmail ? 1 : 0.3 }}
                        title={hasEmail ? "Select owner" : "No email — add one to include"}
                      />
                    </td>
                  )}
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FEF3C7", color: "#92400E", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{ownerName}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#6B7280" }}>{ownerEmail}</td>
                  <td style={{ padding: "11px 16px" }}>
                    {report.pdf_url ? (
                      <button
                        onClick={() => {
                          setPreviewOwner(ownerName);
                          setPreviewReportId(report.id);
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 12, fontWeight: 500, color: "#F59E0B",
                          background: "none", border: "none", cursor: "pointer",
                          padding: 0, fontFamily: "inherit",
                        }}
                      >
                        <Eye style={{ width: 13, height: 13 }} /> Preview
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "#D1D5DB" }}>Not generated</span>
                    )}
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <EmailStatusBadge status={report.email_status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
