"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, Download, CheckCircle2 } from "lucide-react";
import type { ReportBatch } from "@/types/database";

const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#F59E0B", color: "#0A0F1E", border: "none",
  borderRadius: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)",
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: "white", color: "#374151",
  border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(10,15,30,0.06)",
};

type Progress = { done: number; total: number; lastOwner?: string };

export function BatchActions({ batch, reportsCount }: { batch: ReportBatch; reportsCount: number }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    setProgress({ done: 0, total: reportsCount });
    const firstErrors: string[] = [];
    try {
      const res = await fetch(`/api/batches/${batch.id}/generate`, { method: "POST" });
      if (!res.body) { router.refresh(); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string; done?: number; total?: number; ownerName?: string;
              status?: string; message?: string;
            };
            if (event.type === "progress" && event.done != null && event.total != null) {
              setProgress({ done: event.done, total: event.total, lastOwner: event.ownerName });
              router.refresh();
            }
            if (event.type === "error" && event.message && firstErrors.length < 1) {
              firstErrors.push(event.message);
            }
            if (event.type === "complete") {
              if (firstErrors.length > 0) setGenerateError(firstErrors[0]);
              router.refresh();
            }
          } catch { /* malformed chunk — skip */ }
        }
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/batches/${batch.id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError((data as { error?: string }).error ?? "Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `batch-${batch.month}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Network error — please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {(batch.status === "pending" || batch.status === "processing" || batch.status === "partial") && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <button onClick={handleGenerate} disabled={generating} style={{ ...btnSecondary, opacity: generating ? 0.85 : 1 }}>
            {generating
              ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
              : <Zap style={{ width: 14, height: 14 }} />}
            {generating && progress
              ? `${progress.done} of ${progress.total} ready…`
              : "Generate PDFs"}
          </button>
          {generating && progress && progress.done > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#059669" }}>
              <CheckCircle2 style={{ width: 11, height: 11 }} />
              {progress.lastOwner}&apos;s report ready
            </div>
          )}
          {!generating && generateError && (
            <div style={{ fontSize: 12, color: "#DC2626", maxWidth: 320 }}>
              Error: {generateError}
            </div>
          )}
        </div>
      )}

      {(batch.status === "ready" || batch.status === "partial") && !generating && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <button onClick={handleDownload} disabled={downloading} style={{ ...btnSecondary, opacity: downloading ? 0.7 : 1 }}>
            {downloading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Download style={{ width: 14, height: 14 }} />}
            {downloading ? "Preparing…" : "Download ZIP"}
          </button>
          {downloadError && (
            <div style={{ fontSize: 12, color: "#DC2626" }}>{downloadError}</div>
          )}
        </div>
      )}
    </div>
  );
}
