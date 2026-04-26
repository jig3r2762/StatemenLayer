"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

export function ReviewBatchClient({
  batchId,
  reportsCount,
}: {
  batchId: string;
  reportsCount: number;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendAll() {
    setError(null);
    if (!confirm(`Send reports to all ${reportsCount} owners? This cannot be undone.`)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/batches/${batchId}/send`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setError(data?.error ?? "Failed to send batch."); return; }
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {error && <span style={{ fontSize: 13, color: "#B91C1C" }}>{error}</span>}
      <button
        onClick={handleSendAll}
        disabled={sending}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", opacity: sending ? 0.7 : 1 }}
      >
        {sending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Send style={{ width: 14, height: 14 }} />}
        Send All
      </button>
    </div>
  );
}
