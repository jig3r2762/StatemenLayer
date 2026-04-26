"use client";

import { useCallback, useMemo, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { ValidationErrors } from "@/components/upload/ValidationErrors";
import { formatCurrency } from "@/lib/utils";

interface AttachmentMatcherProps {
  batchId: string;
  reports: Array<{
    id: string;
    ownerName: string;
    lineItems: Array<{ date: string; description: string; amount: number }>;
  }>;
}

type UploadItem = {
  localId: string;
  file: File;
  uploading: boolean;
  attachmentId: string | null;
  fileUrl: string | null;
  error: string | null;
  matchedKey: string | null;
  confirmed: boolean;
  confirming: boolean;
};

type Option = {
  key: string;
  reportId: string;
  ownerName: string;
  date: string;
  description: string;
  amount: number;
  label: string;
  scoreTokens: string[];
};

function bytesLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function normalizeTokens(str: string) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

function bestMatchForFilename(filename: string, options: Option[]) {
  const tokens = normalizeTokens(filename);
  if (tokens.length === 0) return null;
  let best: { key: string; score: number } | null = null;
  for (const opt of options) {
    let score = 0;
    for (const t of tokens) { if (opt.scoreTokens.includes(t)) score += 1; }
    if (!best || score > best.score) best = { key: opt.key, score };
  }
  if (!best || best.score === 0) return null;
  return best.key;
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #E5E7EB", borderRadius: 6,
  fontSize: 12, fontFamily: "var(--font-dm-sans, sans-serif)", outline: "none",
  color: "#111827", background: "white", cursor: "pointer",
};

export function AttachmentMatcher({ batchId, reports }: AttachmentMatcherProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const options = useMemo<Option[]>(() => {
    const all: Option[] = [];
    reports.forEach((r) => {
      r.lineItems.forEach((li, idx) => {
        const key = `${r.id}|${li.date}|${li.amount}|${idx}`;
        const amountStr = Math.abs(li.amount).toFixed(2);
        const label = `${r.ownerName} · ${li.date} · ${formatCurrency(li.amount)} · ${li.description}`;
        const scoreTokens = Array.from(new Set([
          ...normalizeTokens(r.ownerName),
          ...normalizeTokens(li.description),
          ...normalizeTokens(li.date),
          ...normalizeTokens(amountStr),
        ]));
        all.push({ key, reportId: r.id, ownerName: r.ownerName, date: li.date, description: li.description, amount: li.amount, label, scoreTokens });
      });
    });
    return all;
  }, [reports]);

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      const nextErrors: string[] = [];
      rejected.forEach(({ file, errors }) => {
        const code = errors[0]?.code;
        if (code === "file-too-large") nextErrors.push(`${file.name} exceeds the 10MB limit.`);
        else if (code === "file-invalid-type") nextErrors.push(`${file.name} is not a supported type.`);
        else nextErrors.push(`${file.name} could not be added.`);
      });
      setErrors(nextErrors);

      const newItems: UploadItem[] = accepted.map((file) => {
        const localId = typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
        return { localId, file, uploading: true, attachmentId: null, fileUrl: null, error: null, matchedKey: bestMatchForFilename(file.name, options), confirmed: false, confirming: false };
      });

      if (newItems.length === 0) return;
      setItems((prev) => [...newItems, ...prev]);
      newItems.forEach((it) => void uploadOne(it.localId, it.file));
    },
    [options]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  async function uploadOne(localId: string, file: File) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("batch_id", batchId);
      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { attachment_id?: string; file_url?: string; error?: string } | null;
      if (!res.ok || !data?.attachment_id) throw new Error(data?.error ?? "Upload failed");
      setItems((prev) => prev.map((p) => p.localId === localId ? { ...p, uploading: false, attachmentId: data.attachment_id!, fileUrl: data.file_url ?? null } : p));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setItems((prev) => prev.map((p) => p.localId === localId ? { ...p, uploading: false, error: message } : p));
    }
  }

  async function confirmOne(localId: string) {
    const item = items.find((i) => i.localId === localId);
    if (!item?.attachmentId || !item.matchedKey) return;
    const opt = options.find((o) => o.key === item.matchedKey);
    if (!opt) return;

    setItems((prev) => prev.map((p) => p.localId === localId ? { ...p, confirming: true } : p));
    try {
      const res = await fetch(`/api/attachments/${item.attachmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matched_report_id: opt.reportId, matched_date: opt.date, matched_amount: opt.amount, confirmed: true }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to confirm match");
      setItems((prev) => prev.map((p) => p.localId === localId ? { ...p, confirmed: true, confirming: false } : p));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to confirm match";
      setItems((prev) => prev.map((p) => p.localId === localId ? { ...p, confirming: false, error: message } : p));
    }
  }

  const zoneBorder = isDragReject ? "#EF4444" : isDragActive ? "#F59E0B" : "#D1D5DB";
  const zoneBg     = isDragReject ? "#FEF2F2"  : isDragActive ? "#FFFBEB" : "#FAFAFA";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        {...getRootProps()}
        style={{ border: `2px dashed ${zoneBorder}`, borderRadius: 8, padding: "36px 24px", textAlign: "center", cursor: "pointer", transition: "all 150ms", background: zoneBg }}
      >
        <input {...getInputProps()} />
        <Upload style={{ width: 32, height: 32, color: "#9CA3AF", margin: "0 auto 10px" }} />
        {isDragActive ? (
          <p style={{ fontSize: 14, fontWeight: 600, color: "#92400E" }}>Drop your files here</p>
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>Upload repair photos or invoices</p>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>JPG, PNG, or PDF — up to 10MB each</p>
          </>
        )}
      </div>

      <ValidationErrors errors={errors} />

      {items.length === 0 ? (
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "48px 18px", textAlign: "center", color: "#9CA3AF" }}>
          <p style={{ fontWeight: 500, color: "#374151", marginBottom: 4 }}>No attachments uploaded</p>
          <p style={{ fontSize: 13 }}>Drag and drop files above, then match each to an expense line item.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => {
            const isPdf = it.file.type === "application/pdf";
            const canConfirm = !!it.attachmentId && !!it.matchedKey && !it.confirmed;
            const matched = options.find((o) => o.key === it.matchedKey) ?? null;

            const borderColor = it.confirmed ? "#A7F3D0" : "#E5E7EB";

            return (
              <div key={it.localId} style={{ background: "white", border: `1px solid ${borderColor}`, borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 6, border: "1px solid #E5E7EB", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                      {!isPdf ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={URL.createObjectURL(it.file)} alt={it.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <FileText style={{ width: 20, height: 20, color: "#9CA3AF" }} />
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.file.name}</span>
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{bytesLabel(it.file.size)}</span>
                        {it.confirmed ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, background: "#ECFDF5", color: "#047857", borderRadius: 9999, padding: "2px 7px" }}>
                            <CheckCircle2 style={{ width: 11, height: 11 }} /> Confirmed
                          </span>
                        ) : it.matchedKey ? (
                          <span style={{ fontSize: 11, fontWeight: 500, background: "#EFF6FF", color: "#1D4ED8", borderRadius: 9999, padding: "2px 7px" }}>Matched</span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, background: "#FFFBEB", color: "#92400E", borderRadius: 9999, padding: "2px 7px" }}>
                            <AlertTriangle style={{ width: 11, height: 11 }} /> Unmatched
                          </span>
                        )}
                      </div>
                      {matched && (
                        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {matched.ownerName} · {matched.date} · {formatCurrency(matched.amount)} · {matched.description}
                        </div>
                      )}
                      {it.error && <div style={{ fontSize: 12, color: "#B91C1C", marginTop: 4 }}>{it.error}</div>}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 320, flexShrink: 0 }}>
                    <select
                      style={{ ...selectStyle, opacity: (it.uploading || it.confirmed) ? 0.5 : 1 }}
                      value={it.matchedKey ?? ""}
                      disabled={it.uploading || it.confirmed}
                      onChange={(e) => setItems((prev) => prev.map((p) => p.localId === it.localId ? { ...p, matchedKey: e.target.value || null } : p))}
                    >
                      <option value="">Match to expense…</option>
                      {options.length === 0
                        ? <option disabled>No expense line items available</option>
                        : options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)
                      }
                    </select>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                      {it.uploading && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9CA3AF" }}>
                          <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> Uploading…
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void confirmOne(it.localId)}
                        disabled={!canConfirm || it.confirming}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", opacity: (!canConfirm || it.confirming) ? 0.5 : 1 }}
                      >
                        {it.confirming && <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />}
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
