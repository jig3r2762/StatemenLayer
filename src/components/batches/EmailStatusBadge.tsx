import type { EmailStatus } from "@/types/database";

const CONFIG: Record<EmailStatus, { label: string; bg: string; color: string; dot: string }> = {
  pending:   { label: "Pending",   bg: "#F3F4F6", color: "#4B5563", dot: "#9CA3AF" },
  sent:      { label: "Sent",      bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  delivered: { label: "Delivered", bg: "#F0F9FF", color: "#0369A1", dot: "#0EA5E9" },
  opened:    { label: "Opened",    bg: "#ECFDF5", color: "#047857", dot: "#059669" },
};

export function EmailStatusBadge({ status }: { status: EmailStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, borderRadius: 9999, padding: "2px 8px", background: cfg.bg, color: cfg.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}
