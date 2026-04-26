"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

interface CommentaryEditorProps {
  reportId: string;
  initialCommentary: string | null;
  ownerName: string;
  onSaved?: () => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function CommentaryEditor({
  reportId,
  initialCommentary,
  ownerName,
  onSaved,
}: CommentaryEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialCommentary ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setValue(initialCommentary ?? ""); }, [initialCommentary]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const t = window.setTimeout(() => setSaveState("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [saveState]);

  const charCount = value.length;
  const guidance = useMemo(() => {
    if (charCount === 0) return "Target 300–500 characters for 3–5 sentences.";
    if (charCount < 300) return "A bit short — aim for 300–500 characters.";
    if (charCount > 500) return "A bit long — consider trimming to ~500 characters.";
    return "Great length — 300–500 characters.";
  }, [charCount]);

  async function handleSave() {
    setError(null);
    setSaveState("saving");
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_commentary: value }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setError(data?.error ?? "Failed to save commentary."); setSaveState("error"); return; }
      setSaveState("saved");
      onSaved?.();
      router.refresh();
    } catch {
      setError("Failed to save commentary. Please try again.");
      setSaveState("error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>Commentary</div>
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>For {ownerName}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>{charCount} chars · {guidance}</div>
          {saveState === "saved" && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#059669", marginTop: 2 }}>
              <CheckCircle2 style={{ width: 12, height: 12 }} /> Saved
            </div>
          )}
        </div>
      </div>

      {initialCommentary === null && (
        <div style={{ fontSize: 13, color: "#1D4ED8", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "8px 12px" }}>
          AI commentary not yet generated. Generate PDFs first.
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Write 3–5 sentences summarizing the month for the owner…"
        rows={5}
        style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, fontFamily: "var(--font-dm-sans, sans-serif)", outline: "none", color: "#111827", resize: "vertical", boxSizing: "border-box", background: "white" }}
      />

      {error && <div style={{ fontSize: 13, color: "#B91C1C" }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === "saving"}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", opacity: saveState === "saving" ? 0.7 : 1 }}
        >
          {saveState === "saving" && <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}
