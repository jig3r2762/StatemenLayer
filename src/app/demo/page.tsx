"use client";
import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle2, Loader2, AlertCircle, ArrowRight, Lock, Clock } from "lucide-react";
import Link from "next/link";
import type { NormalizedReport } from "@/types/parsers";

type Stage = "idle" | "uploading" | "done" | "error";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatMonth(iso: string) {
  if (!iso) return "";
  const [year, month] = iso.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function ReportCard({ report, month }: { report: NormalizedReport; month: string }) {
  const net = report.net_to_owner;
  const isPos = net >= 0;

  return (
    <div style={{
      background: "white", border: "1px solid #E5E7EB", borderRadius: 10,
      overflow: "hidden", boxShadow: "0 1px 4px rgba(10,15,30,0.07)",
    }}>
      {/* Card header */}
      <div style={{ background: "#0A0F1E", padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Owner Statement</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "white", fontFamily: "var(--font-display-serif, serif)" }}>{report.owner_name}</div>
            {report.property_address && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{report.property_address}</div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Period</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-jetbrains, monospace)" }}>{month}</div>
          </div>
        </div>
      </div>

      {/* Financials */}
      <div style={{ padding: "18px 22px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {[
              { label: "Gross Income",    value: report.total_income,    color: "#059669" },
              { label: "Total Expenses",  value: -report.total_expenses, color: "#DC2626" },
              { label: "Management Fee",  value: -report.management_fee, color: "#6B7280" },
            ].map(({ label, value, color }) => (
              <tr key={label} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "9px 0", fontSize: 13, color: "#6B7280" }}>{label}</td>
                <td style={{ padding: "9px 0", fontSize: 13, color, fontFamily: "var(--font-jetbrains, monospace)", textAlign: "right", fontWeight: 500 }}>
                  {value >= 0 ? "" : "−"}{fmt(Math.abs(value))}
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: "12px 0 4px", fontSize: 14, fontWeight: 700, color: "#111827" }}>Net to Owner</td>
              <td style={{ padding: "12px 0 4px", fontSize: 14, fontWeight: 700, color: isPos ? "#059669" : "#DC2626", fontFamily: "var(--font-jetbrains, monospace)", textAlign: "right" }}>
                {isPos ? "" : "−"}{fmt(Math.abs(net))}
              </td>
            </tr>
          </tbody>
        </table>

        {report.line_items.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 8 }}>Line items</div>
            {report.line_items.slice(0, 4).map((li, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #F9FAFB" }}>
                <span style={{ fontSize: 12, color: "#6B7280", flex: 1, marginRight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{li.description}</span>
                <span style={{ fontSize: 12, fontFamily: "var(--font-jetbrains, monospace)", color: li.category === "income" ? "#059669" : "#374151", flexShrink: 0 }}>
                  {li.amount >= 0 ? "" : "−"}{fmt(Math.abs(li.amount))}
                </span>
              </div>
            ))}
            {report.line_items.length > 4 && (
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>+{report.line_items.length - 4} more line items in the full PDF</div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 22px", borderTop: "1px solid #F3F4F6", background: "#FAFAFA", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>StatementLayer · Demo preview</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#D1D5DB" }}>
          <Lock style={{ width: 10, height: 10 }} /> PDF delivery locked
        </div>
      </div>
    </div>
  );
}

function DemoDropzone({ onFile, isLoading }: { onFile: (f: File) => void; isLoading: boolean }) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) onFile(accepted[0]);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    maxFiles: 1,
    disabled: isLoading,
  });

  const border = isDragActive ? "#F59E0B" : "#D1D5DB";
  const bg = isDragActive ? "#FFFBEB" : "#FAFAFA";

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${border}`, borderRadius: 10, padding: "52px 32px",
        textAlign: "center", cursor: isLoading ? "not-allowed" : "pointer",
        transition: "all 150ms", background: bg, opacity: isLoading ? 0.7 : 1,
      }}
    >
      <input {...getInputProps()} />
      {isLoading ? (
        <Loader2 style={{ width: 36, height: 36, color: "#F59E0B", margin: "0 auto 14px" }} className="animate-spin" />
      ) : (
        <Upload style={{ width: 36, height: 36, color: "#9CA3AF", margin: "0 auto 14px" }} />
      )}
      <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
        {isLoading ? "Parsing your file…" : isDragActive ? "Drop to parse" : "Drop your AppFolio or Buildium export here"}
      </p>
      {!isLoading && (
        <p style={{ fontSize: 13, color: "#9CA3AF" }}>CSV, XLS, or XLSX · Up to 5 MB · No signup needed</p>
      )}
    </div>
  );
}

export default function DemoPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [reports, setReports] = useState<NormalizedReport[]>([]);
  const [month, setMonth] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const startRef = useRef<number>(0);

  async function handleFile(file: File) {
    setStage("uploading");
    setErrorMsg("");
    startRef.current = Date.now();
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/demo/parse", { method: "POST", body: fd });
      const data = await res.json();
      setElapsedMs(Date.now() - startRef.current);
      if (!res.ok) {
        setErrorMsg(data.error ?? "Parse failed");
        setStage("error");
        return;
      }
      setReports(data.reports);
      setMonth(formatMonth(data.reports[0]?.report_month ?? ""));
      setStage("done");
    } catch {
      setErrorMsg("Network error — please try again.");
      setStage("error");
    }
  }

  const btnAmber: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: "#F59E0B", color: "#0A0F1E", border: "none",
    borderRadius: 8, padding: "12px 24px", fontSize: 15, fontWeight: 700,
    cursor: "pointer", textDecoration: "none", fontFamily: "var(--font-dm-sans, sans-serif)",
  };

  const btnDisabled: React.CSSProperties = {
    ...btnAmber, background: "#E5E7EB", color: "#9CA3AF", cursor: "not-allowed",
  };

  const totalNet = reports.reduce((s, r) => s + r.net_to_owner, 0);
  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  return (
    <div style={{ minHeight: "100vh", background: "#FAF8F4", fontFamily: "var(--font-dm-sans, sans-serif)" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #E5E7EB", background: "white", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ textDecoration: "none", fontFamily: "var(--font-display-serif, serif)", fontSize: 18, fontWeight: 700, color: "#0A0F1E" }}>
          StatementLayer
        </Link>
        <Link href="/sign-up" style={{ ...btnAmber, padding: "8px 18px", fontSize: 13 }}>
          Start free trial
        </Link>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "52px 24px 80px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ display: "inline-block", background: "#FEF3C7", color: "#92400E", fontSize: 12, fontWeight: 600, borderRadius: 99, padding: "4px 14px", marginBottom: 16, letterSpacing: "0.04em" }}>
            LIVE DEMO · NO SIGNUP REQUIRED
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 700, color: "#0A0F1E", fontFamily: "var(--font-display-serif, serif)", lineHeight: 1.15, marginBottom: 12 }}>
            Upload your export →<br />owner reports ready instantly
          </h1>
          <p style={{ fontSize: 17, color: "#6B7280", maxWidth: 520, margin: "0 auto" }}>
            Drop in a real AppFolio or Buildium CSV. See exactly what your owners will receive — no signup, no setup, no Excel.
          </p>
        </div>

        {/* Upload area */}
        {(stage === "idle" || stage === "uploading" || stage === "error") && (
          <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: 32, boxShadow: "0 1px 4px rgba(10,15,30,0.07)", marginBottom: 20 }}>
            <DemoDropzone onFile={handleFile} isLoading={stage === "uploading"} />

            {stage === "error" && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "flex-start", gap: 10, background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 8, padding: "12px 16px" }}>
                <AlertCircle style={{ width: 15, height: 15, color: "#DC2626", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#B91C1C" }}>Could not parse this file</div>
                  <div style={{ fontSize: 13, color: "#B91C1C", marginTop: 2 }}>{errorMsg}</div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 18, textAlign: "center", fontSize: 13, color: "#9CA3AF" }}>
              Don&apos;t have a file?{" "}
              <a href="/sample-appfolio.csv" download style={{ color: "#F59E0B", fontWeight: 600, textDecoration: "none" }}>
                Download sample CSV ↓
              </a>
            </div>
          </div>
        )}

        {/* Results */}
        {stage === "done" && (
          <>
            {/* Value metrics banner */}
            <div style={{ background: "#0A0F1E", borderRadius: 12, padding: "20px 28px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 style={{ width: 20, height: 20, color: "#F59E0B", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>
                    {reports.length} owner report{reports.length !== 1 ? "s" : ""} generated in {elapsedSec}s
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                    This replaces 6–10 hours of Excel work every month
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#F59E0B", fontFamily: "var(--font-jetbrains, monospace)" }}>{fmt(totalNet)}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>total net to owners</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 18, fontWeight: 700, color: "#F59E0B", fontFamily: "var(--font-jetbrains, monospace)", justifyContent: "center" }}>
                    <Clock style={{ width: 15, height: 15 }} />{elapsedSec}s
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>vs hours in Excel</div>
                </div>
              </div>
            </div>

            {/* Month + try again */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{month} · {reports.length} reports</span>
              <button
                onClick={() => { setStage("idle"); setReports([]); }}
                style={{ fontSize: 12, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
              >
                Try another file
              </button>
            </div>

            {/* Report cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
              {reports.map((r, i) => <ReportCard key={i} report={r} month={month} />)}
            </div>

            {/* Conversion CTA */}
            <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 12, padding: "32px 36px", boxShadow: "0 1px 4px rgba(10,15,30,0.07)" }}>
              {/* Disabled send button */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, paddingBottom: 24, borderBottom: "1px solid #F3F4F6", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>Ready to send these to your owners?</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF" }}>Sign up and hit send — each owner gets their own private, branded PDF.</div>
                </div>
                <div title="Sign up to send real reports" style={{ display: "inline-block" }}>
                  <button disabled style={btnDisabled}>
                    <Lock style={{ width: 14, height: 14 }} />
                    Send {reports.length} report{reports.length !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>

              {/* Value prop + sign up */}
              <div className="grid-sidebar-right" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", fontFamily: "var(--font-display-serif, serif)", marginBottom: 8 }}>
                    Stop opening Excel for this every month.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      `Generated ${reports.length} reports in ${elapsedSec} seconds`,
                      "Sends branded PDFs to every owner in one click",
                      "Tracks who opened — follows up automatically",
                    ].map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
                        <CheckCircle2 style={{ width: 14, height: 14, color: "#059669", flexShrink: 0 }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <Link href="/sign-up" style={btnAmber}>
                    Start free trial <ArrowRight style={{ width: 16, height: 16 }} />
                  </Link>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>14 days free · no card needed</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Stats grid — idle state only */}
        {stage === "idle" && (
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 28 }}>
            {[
              { n: "< 2 min", label: "upload to sent", sub: "for a full batch of owner reports" },
              { n: "8–10 hrs", label: "saved per month", sub: "vs. manual Excel formatting" },
              { n: "$79/mo",   label: "starter plan",    sub: "costs less than 1 hour of your time" },
            ].map(({ n, label, sub }) => (
              <div key={n} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 10, padding: "18px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#F59E0B", fontFamily: "var(--font-jetbrains, monospace)" }}>{n}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginTop: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
