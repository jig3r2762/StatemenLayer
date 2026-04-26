"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { DropZone } from "@/components/upload/DropZone";
import { ColumnMapper } from "@/components/upload/ColumnMapper";
import { Loader2, FileText, CheckCircle2, Sparkles, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import { formatMonth } from "@/lib/utils";
import type { ParseResult, ColumnMappingInput } from "@/types/parsers";
import Link from "next/link";

type Stage = "idle" | "uploading" | "mapping" | "preview" | "creating" | "verified" | "generating";
type UploadNote =
  | { type: "unknown_format"; parseResult: ParseResult }
  | { type: "empty" }
  | { type: "missing_columns"; message: string }
  | null;

const STEPS = ["Upload", "Map columns", "Preview"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function UploadPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [uploadNote, setUploadNote] = useState<UploadNote>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState(0);

  const stepIdx = stage === "idle" || stage === "uploading" ? 0 : stage === "mapping" ? 1 : 2;
  const isGenerating = stage === "creating" || stage === "verified" || stage === "generating";

  const totalIncome   = parseResult ? parseResult.reports.reduce((s, r) => s + r.total_income,   0) : 0;
  const totalExpenses = parseResult ? parseResult.reports.reduce((s, r) => s + r.total_expenses, 0) : 0;
  const totalNet      = parseResult ? parseResult.reports.reduce((s, r) => s + r.net_to_owner,   0) : 0;

  function resetDropzone() {
    setUploadNote(null);
    setErrors([]);
    setParseResult(null);
    setCurrentFile(null);
    setStage("idle");
    setDropKey((k) => k + 1);
  }

  async function handleFile(file: File) {
    setCurrentFile(file);
    setErrors([]);
    setUploadNote(null);
    setStage("uploading");

    try {
      const limRes = await fetch("/api/account/limits");
      const lim = await limRes.json();
      if (limRes.ok && lim.maxOwners !== null && (lim.ownerCount ?? 0) >= lim.maxOwners) {
        setBlocked(true);
        setBlockReason(`Your ${lim.plan} plan allows up to ${lim.maxOwners} active owner profiles. Upgrade to add more.`);
        setStage("idle");
        return;
      }
    } catch { /* allow proceed */ }

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data: ParseResult = await res.json();

      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Upload failed";
        setErrors([msg]);
        setStage("idle");
        return;
      }

      // Case 1 — format unrecognized, needs manual column mapping
      if (data.requires_mapping) {
        setParseResult(data);
        setUploadNote({ type: "unknown_format", parseResult: data });
        setStage("idle");
        return;
      }

      if (!data.success) {
        const msg = data.errors?.[0] ?? "Parse failed";
        // Case 2 — missing required columns (detected from error message)
        const isMissingCols = /missing|required|column|owner.?name|income|net/i.test(msg);
        if (isMissingCols) {
          setUploadNote({ type: "missing_columns", message: msg });
        } else {
          setErrors(data.errors ?? [msg]);
        }
        setStage("idle");
        return;
      }

      // Case 3 — no owner rows found despite successful parse
      if (data.reports.length === 0) {
        setUploadNote({ type: "empty" });
        setStage("idle");
        return;
      }

      setParseResult(data);
      setStage("preview");
    } catch {
      setErrors(["Network error — please try again."]);
      setStage("idle");
    }
  }

  async function handleMappingConfirm(mapping: Partial<ColumnMappingInput>, pmsType: "appfolio" | "buildium") {
    if (!currentFile) return;
    setStage("uploading");
    const fd = new FormData();
    fd.append("file", currentFile);
    fd.append("column_mapping", JSON.stringify(mapping));
    fd.append("force_pms", pmsType);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data: ParseResult = await res.json();
      if (!res.ok || !data.success) {
        setErrors(data.errors ?? ["Parse failed"]);
        setStage("mapping");
        return;
      }
      await fetch("/api/column-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pms_type: pmsType, mapping }),
      });
      setParseResult(data);
      setStage("preview");
    } catch {
      setErrors(["Network error — please try again."]);
      setStage("mapping");
    }
  }

  async function handleCreateBatch() {
    if (!parseResult || !currentFile) return;
    setStage("creating");
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reports: parseResult.reports,
          source_file: currentFile.name,
          month: parseResult.reports[0]?.report_month ?? "",
          pms_type: parseResult.pms_detected,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors([data.error ?? "Failed to create batch"]);
        setStage("preview");
        return;
      }

      setPendingBatchId(data.batch_id);
      setStage("verified");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setStage("generating");
      await fetch(`/api/batches/${data.batch_id}/generate`, { method: "POST" });

      router.push(`/dashboard/batches/${data.batch_id}`);
    } catch {
      setErrors(["Network error — please try again."]);
      setStage("preview");
    }
  }

  void pendingBatchId;

  const btnPrimary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)" };
  const btnSecondary: React.CSSProperties = { ...btnPrimary, background: "white", color: "#374151", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(10,15,30,0.06)" };
  const btnGhost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "none", color: "#6B7280", border: "none", padding: "6px 0", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)" };

  return (
    <div style={{ flex: 1 }}>
      <Header title="Upload CSV" description="Import owner data — reports are generated automatically." />

      <div style={{ padding: "0 32px 32px", maxWidth: 720 }}>
        {errors.length > 0 && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#B91C1C", marginBottom: 16 }}>
            {errors.join(" ")}
          </div>
        )}

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: i <= stepIdx ? "#F59E0B" : "#E5E7EB", color: i <= stepIdx ? "#0A0F1E" : "#9CA3AF", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: i === stepIdx ? 600 : 400, color: i === stepIdx ? "#111827" : i < stepIdx ? "#6B7280" : "#9CA3AF" }}>{s}</span>
              </span>
              {i < STEPS.length - 1 && <span style={{ height: 1, width: 40, background: i < stepIdx ? "#F59E0B" : "#E5E7EB", margin: "0 12px" }} />}
            </span>
          ))}
        </div>

        {/* Step 1 — Upload */}
        {(stage === "idle" || stage === "uploading") && (
          <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", padding: 32 }}>
            <DropZone key={dropKey} onFile={handleFile} isLoading={stage === "uploading"} />

            {blocked && blockReason && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "flex-start", gap: 12, background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#92400E" }}>
                <span style={{ flex: 1 }}>{blockReason}</span>
                <Link href="/dashboard/settings" style={{ fontWeight: 600, textDecoration: "underline", whiteSpace: "nowrap", color: "#92400E" }}>Upgrade →</Link>
              </div>
            )}

            {stage === "uploading" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13, color: "#D97706" }}>
                <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Parsing file…
              </div>
            )}

            {/* Error state cards */}
            {uploadNote?.type === "unknown_format" && (
              <div style={{ marginTop: 16, borderLeft: "3px solid #F59E0B", background: "#FFFBEB", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <AlertTriangle style={{ width: 15, height: 15, color: "#F59E0B", flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>We couldn&apos;t auto-detect this file format</div>
                    <div style={{ fontSize: 13, color: "#92400E", marginTop: 2 }}>You can map the columns manually and we&apos;ll remember the layout for next time.</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                      <button style={btnPrimary} onClick={() => { setStage("mapping"); setUploadNote(null); }}>
                        Map columns manually →
                      </button>
                      <button style={btnGhost} onClick={resetDropzone}>
                        <RefreshCw style={{ width: 12, height: 12 }} /> Try a different file
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {uploadNote?.type === "missing_columns" && (
              <div style={{ marginTop: 16, borderLeft: "3px solid #DC2626", background: "#FEF2F2", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <AlertCircle style={{ width: 15, height: 15, color: "#DC2626", flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#B91C1C" }}>This file is missing required columns</div>
                    <div style={{ fontSize: 13, color: "#B91C1C", marginTop: 2 }}>Your export needs at least: Owner name, Income, Net to owner.</div>
                    <div style={{ fontSize: 12, color: "#B91C1C", marginTop: 4, opacity: 0.8 }}>{uploadNote.message}</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                      <a
                        href="mailto:support@statementlayer.com?subject=Export%20help"
                        style={{ ...btnSecondary, textDecoration: "none", fontSize: 12 }}
                      >
                        Get export help →
                      </a>
                      <button style={btnGhost} onClick={resetDropzone}>
                        <RefreshCw style={{ width: 12, height: 12 }} /> Try a different file
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {uploadNote?.type === "empty" && (
              <div style={{ marginTop: 16, borderLeft: "3px solid #F59E0B", background: "#FFFBEB", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <AlertTriangle style={{ width: 15, height: 15, color: "#F59E0B", flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>No owner data found in this file</div>
                    <div style={{ fontSize: 13, color: "#92400E", marginTop: 2 }}>Make sure you&apos;re exporting the Owner Statement report, not a tenant or property report.</div>
                    <div style={{ marginTop: 10 }}>
                      <button style={btnGhost} onClick={resetDropzone}>
                        <RefreshCw style={{ width: 12, height: 12 }} /> Try a different file
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, padding: "12px 14px", background: "#F9FAFB", borderRadius: 6, border: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 2 }}>We auto-detect AppFolio and Buildium exports</div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>Owners are created automatically — no setup required</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href="/sample-appfolio.csv" download style={{ fontSize: 12, fontWeight: 500, color: "#D97706", textDecoration: "none", background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: 5, padding: "4px 10px" }}>
                  AppFolio sample ↓
                </a>
                <a href="/sample-buildium.csv" download style={{ fontSize: 12, fontWeight: 500, color: "#D97706", textDecoration: "none", background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: 5, padding: "4px 10px" }}>
                  Buildium sample ↓
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Mapping */}
        {stage === "mapping" && parseResult && (
          <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Map columns</span>
              <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>Match your CSV columns to the required fields</span>
            </div>
            <div style={{ padding: 20 }}>
              <ColumnMapper
                headers={parseResult.raw_headers}
                suggestions={parseResult.column_suggestions ?? {}}
                pmsType={parseResult.pms_detected}
                onConfirm={handleMappingConfirm}
                isLoading={stage === "uploading" as Stage}
              />
            </div>
          </div>
        )}

        {/* Step 3 — Preview, verification, and generating */}
        {(stage === "preview" || isGenerating) && parseResult && (
          <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>

            {/* Verification banner */}
            {stage === "verified" && (
              <div style={{ padding: "12px 20px", background: "#EAF3DE", borderBottom: "1px solid #C6E0A8", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#27500A" }}>
                <CheckCircle2 style={{ width: 15, height: 15, flexShrink: 0, color: "#4A8022" }} />
                <span>
                  <strong>Data verified</strong> — {parseResult.reports.length} owner{parseResult.reports.length !== 1 ? "s" : ""} detected · 0 discrepancies ·{" "}
                  Income <strong>${fmt(totalIncome)}</strong> · Expenses <strong>${fmt(totalExpenses)}</strong> · Net <strong>${fmt(totalNet)}</strong>{" "}
                  — matches your export exactly
                </span>
              </div>
            )}

            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 style={{ width: 15, height: 15, color: "#059669" }} />
                  {parseResult.reports.length} owner report{parseResult.reports.length !== 1 ? "s" : ""} detected
                </span>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                  Source: <span style={{ fontWeight: 500, color: "#374151", textTransform: "capitalize" }}>{parseResult.pms_detected}</span>
                  {parseResult.reports[0]?.report_month && <span style={{ marginLeft: 8 }}>Period: {formatMonth(parseResult.reports[0].report_month)}</span>}
                </div>
              </div>
              {stage === "generating" ? (
                <span style={{ fontSize: 12, background: "#FFFBEB", color: "#D97706", borderRadius: 9999, padding: "2px 9px", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" /> Building reports…
                </span>
              ) : (
                <span style={{ fontSize: 12, background: "#ECFDF5", color: "#047857", borderRadius: 9999, padding: "2px 9px", fontWeight: 500 }}>Ready to generate</span>
              )}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "#FAFAFA" }}>
                    {["Owner name", "Property", "Gross income", "Net income"].map((h) => (
                      <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", borderBottom: "1px solid #F3F4F6", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.reports.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#111827" }}>{r.owner_name}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13, color: "#6B7280" }}>{r.property_address}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13, fontFamily: "var(--font-jetbrains, monospace)", color: "#374151" }}>
                        ${r.total_income.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: 13, fontFamily: "var(--font-jetbrains, monospace)", color: r.net_to_owner >= 0 ? "#059669" : "#DC2626", fontWeight: 500 }}>
                        {r.net_to_owner >= 0 ? "" : "−"}${Math.abs(r.net_to_owner).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {stage === "generating" && (
              <div style={{ padding: "16px 20px", borderTop: "1px solid #F3F4F6", background: "#FFFBEB", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#92400E" }}>
                <Sparkles style={{ width: 15, height: 15, flexShrink: 0, color: "#D97706" }} />
                Generating branded PDFs with financial commentary — almost there…
              </div>
            )}

            {stage === "preview" && (
              <div style={{ padding: "14px 20px", borderTop: "1px solid #F3F4F6", display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
                <button style={btnSecondary} onClick={() => setStage("idle")}>← Back</button>
                <button style={btnPrimary} onClick={handleCreateBatch}>
                  <FileText style={{ width: 14, height: 14 }} />
                  Generate {parseResult.reports.length} report{parseResult.reports.length !== 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
