"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BatchStickyBar } from "./BatchStickyBar";
import { ReportsTableClient } from "./ReportsTableClient";
import type { Report, ReportBatch } from "@/types/database";
import { formatMonth } from "@/lib/utils";

interface Stat {
  label: string;
  value: string;
  mono: boolean;
  extra: React.ReactNode;
}

interface Props {
  batch: ReportBatch;
  reports: Report[];
  sentCount: number;
  missingEmailCount: number;
  stats: Stat[];
  unopenedCount: number;
}

export function BatchDetailClient({ batch, reports, sentCount, missingEmailCount, stats, unopenedCount }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pendingCount = reports.filter((r) => r.email_status === "pending").length;
  const month = formatMonth(batch.month);

  return (
    <>
      <BatchStickyBar
        batch={batch}
        totalReports={reports.length}
        sentCount={sentCount}
        missingEmailCount={missingEmailCount}
        selectedReportIds={selectedIds.length > 0 ? selectedIds : undefined}
      />

      <div style={{ padding: "0 32px 32px", maxWidth: 860 }}>
        {unopenedCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#92400E", marginBottom: 20, marginTop: 20 }}>
            <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, color: "#F59E0B" }} />
            <span><strong>{unopenedCount}</strong> owner{unopenedCount !== 1 ? "s" : ""} haven&apos;t opened after 48 hours.</span>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20, marginTop: unopenedCount > 0 ? 0 : 20 }}>
          {stats.map(({ label, value, mono, extra }) => (
            <div key={label} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px", boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", fontFamily: mono ? "var(--font-jetbrains, monospace)" : "inherit" }}>
                {extra}{value}
              </div>
            </div>
          ))}
        </div>

        {/* Reports table with selection */}
        <ReportsTableClient
          reports={reports}
          month={month}
          pendingCount={pendingCount}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          batchStatus={batch.status}
        />
      </div>
    </>
  );
}
