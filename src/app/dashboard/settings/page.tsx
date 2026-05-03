"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Loader2, CheckCircle2 } from "lucide-react";

const PLAN_DESC: Record<string, string> = {
  starter: "Up to 75 doors · 10 owner profiles · Email support",
  growth:  "Up to 200 doors · Unlimited profiles · White-label branding",
  agency:  "Unlimited doors · 5 user seats · Custom email domain",
};

const tabs = [
  { id: "branding", label: "Branding" },
  { id: "email",    label: "Email" },
  { id: "plan",     label: "Plan & billing" },
];

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #E5E7EB",
  borderRadius: 6, fontSize: 14, fontFamily: "var(--font-dm-sans, sans-serif)",
  outline: "none", color: "#111827", boxSizing: "border-box", background: "white",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: "#111827", display: "block", marginBottom: 5,
};

export default function SettingsPage() {
  const [tab, setTab] = useState("branding");
  const [firmName, setFirmName] = useState("");
  const [brandColor, setBrandColor] = useState("#0A0F1E");
  const [plan, setPlan] = useState("starter");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [fromName, setFromName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [upgrading, setUpgrading] = useState<"growth" | "agency" | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/account").then((r) => r.json()).then((d) => {
      if (d.account) {
        setFirmName(d.account.firm_name ?? "");
        setBrandColor(d.account.brand_color ?? "#0A0F1E");
        setPlan(d.account.plan ?? "starter");
        setLogoUrl(d.account.logo_url ?? null);
        setFromName(d.account.from_name ?? "");
        setReplyToEmail(d.account.reply_to_email ?? "");
      }
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]); setSuccess(false);
    if (!firmName.trim()) { setErrors(["Firm name is required."]); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firm_name: firmName.trim(), brand_color: brandColor }) });
      const data = await res.json();
      if (!res.ok) { setErrors([data.error ?? "Save failed"]); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { setErrors(["Network error — please try again."]); }
    finally { setSaving(false); }
  }

  async function handleLogoUpload(file: File) {
    setErrors([]);
    if (file.size > 2 * 1024 * 1024) { setErrors(["Logo exceeds the 2MB limit."]); return; }
    if (!["image/jpeg", "image/png"].includes(file.type)) { setErrors(["Logo must be a JPG or PNG."]); return; }
    setLogoUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/account/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setErrors([data.error ?? "Logo upload failed"]); return; }
      setLogoUrl(data.logo_url ?? null);
    } catch { setErrors(["Network error — please try again."]); }
    finally { setLogoUploading(false); }
  }

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]); setSuccess(false);
    if (replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail.trim())) {
      setErrors(["Enter a valid Reply-to email address."]); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from_name: fromName.trim(), reply_to_email: replyToEmail.trim() }) });
      const data = await res.json();
      if (!res.ok) { setErrors([data.error ?? "Save failed"]); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { setErrors(["Network error — please try again."]); }
    finally { setSaving(false); }
  }

  async function handleManageBilling() {
    setErrors([]); setBillingLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setErrors([data.error ?? "Failed to open billing portal"]); return; }
      if (data.renewal_date) setRenewalDate(data.renewal_date);
      if (data.url) window.location.href = data.url;
    } catch { setErrors(["Network error — please try again."]); }
    finally { setBillingLoading(false); }
  }

  async function handleUpgrade(target: "growth" | "agency") {
    setErrors([]); setUpgrading(target);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: target }) });
      const data = await res.json();
      if (!res.ok) { setErrors([data.error ?? "Failed to start checkout"]); return; }
      if (data.url) window.location.href = data.url;
    } catch { setErrors(["Network error — please try again."]); }
    finally { setUpgrading(null); }
  }

  const COLORS = ["#0A0F1E", "#1D4ED8", "#059669", "#D97706", "#7C3AED", "#DC2626"];

  return (
    <div style={{ flex: 1 }}>
      <Header title="Settings" />
      <div className="px-page" style={{ padding: "0 32px 32px" }}>
        {errors.length > 0 && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#B91C1C", marginBottom: 16 }}>
            {errors.join(" ")}
          </div>
        )}

        <div className="grid-settings" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, alignItems: "flex-start" }}>
          {/* Tab sidebar */}
          <div className="settings-tabs" style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", padding: 8, display: "flex", flexDirection: "column" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  width: "100%", background: tab === t.id ? "#FFFBEB" : "transparent",
                  color: tab === t.id ? "#92400E" : "#6B7280",
                  fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                  fontFamily: "var(--font-dm-sans, sans-serif)", transition: "all 150ms",
                  textAlign: "left",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content panel */}
          <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>

            {/* Branding tab */}
            {tab === "branding" && (
              <div>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Report branding</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Customize how your reports look to property owners.</div>
                </div>
                <form onSubmit={handleSave} style={{ padding: 24 }}>
                  {/* Logo */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Company logo</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F3F4F6", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {logoUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", lineHeight: 1.3 }}>No logo</span>
                        }
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: "7px 14px", cursor: "pointer", marginBottom: 6 }}>
                          {logoUploading ? "Uploading…" : "Upload new logo"}
                          <input type="file" accept="image/png,image/jpeg" style={{ display: "none" }} disabled={logoUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoUpload(f); }} />
                        </label>
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>PNG or JPG · max 2MB</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 4 }}>
                    <div>
                      <label style={labelStyle}>Company name</label>
                      <input style={fieldStyle} value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Acorn Properties" />
                    </div>
                  </div>

                  {/* Color picker */}
                  <div style={{ marginBottom: 16, marginTop: 16 }}>
                    <label style={labelStyle}>Brand color</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {COLORS.map((c) => (
                        <div key={c} onClick={() => setBrandColor(c)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: "pointer", border: brandColor === c ? "2px solid #F59E0B" : "2px solid transparent", transition: "all 150ms" }} />
                      ))}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} style={{ width: 28, height: 28, borderRadius: 6, border: "2px dashed #D1D5DB", cursor: "pointer", padding: 1 }} />
                        <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-jetbrains, monospace)" }}>{brandColor}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      type="submit"
                      disabled={saving || logoUploading}
                      style={{ background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", display: "inline-flex", alignItems: "center", gap: 6, opacity: saving ? 0.7 : 1 }}
                    >
                      {saving ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Saving…</> : "Save branding"}
                    </button>
                    {success && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#059669", fontWeight: 500 }}>
                        <CheckCircle2 style={{ width: 14, height: 14 }} /> Saved
                      </span>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Email tab */}
            {tab === "email" && (
              <div>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Email settings</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Customize how report emails appear to your owners.</div>
                </div>
                <form onSubmit={handleSaveEmail} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={labelStyle}>From name</label>
                    <input style={fieldStyle} value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Acorn Properties" />
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Shown as the sender name in owner inboxes. Defaults to your company name.</div>
                  </div>
                  <div>
                    <label style={labelStyle}>Reply-to email</label>
                    <input type="email" style={fieldStyle} value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} placeholder="reports@yourfirm.com" />
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>When owners reply to a report email, it goes here. Leave blank to use your account email.</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{ background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", display: "inline-flex", alignItems: "center", gap: 6, opacity: saving ? 0.7 : 1 }}
                    >
                      {saving ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Saving…</> : "Save email settings"}
                    </button>
                    {success && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#059669", fontWeight: 500 }}>
                        <CheckCircle2 style={{ width: 14, height: 14 }} /> Saved
                      </span>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Plan & Billing tab */}
            {tab === "plan" && (
              <div>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Plan & billing</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Manage your subscription and payment method.</div>
                </div>
                <div style={{ padding: 24 }}>
                  {/* Current plan card */}
                  <div style={{ background: "#0A0F1E", borderRadius: 8, padding: 20, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Current plan</div>
                        <div style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: 24, color: "white", letterSpacing: "-0.01em", textTransform: "capitalize" }}>{plan}</div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                          {PLAN_DESC[plan]}
                        </div>
                        {renewalDate && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Renews {new Date(renewalDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
                      </div>
                      <span style={{ background: "#F59E0B", color: "#0A0F1E", borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: "3px 10px", textTransform: "capitalize" }}>{plan}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                    style={{ background: "white", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 6, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}
                  >
                    {billingLoading ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Loading…</> : "Manage billing"}
                  </button>

                  {plan === "starter" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {(["growth", "agency"] as const).map((tier) => (
                        <div key={tier} style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", textTransform: "capitalize" }}>Upgrade to {tier} — {tier === "growth" ? "$149" : "$299"}/mo</div>
                            <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{PLAN_DESC[tier]}</div>
                          </div>
                          <div style={{ padding: "14px 20px" }}>
                            <button
                              onClick={() => handleUpgrade(tier)}
                              disabled={upgrading !== null}
                              style={{ background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", display: "inline-flex", alignItems: "center", gap: 6, opacity: upgrading !== null ? 0.7 : 1 }}
                            >
                              {upgrading === tier ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Redirecting…</> : "Upgrade now"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
