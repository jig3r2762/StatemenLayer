"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionsConfigEditor } from "./SectionsConfig";
import { Loader2 } from "lucide-react";
import type { Owner, SectionsConfig, LayoutType, PmsType } from "@/types/database";

const DEFAULT_SECTIONS: SectionsConfig = {
  show_income: true,
  show_expenses: true,
  show_management_fee: true,
  show_line_items: true,
  show_attachments: true,
  number_format: "comma",
  section_order: ["income", "expenses", "fee", "net"],
};

interface OwnerFormProps {
  initialData?: Partial<Owner>;
  ownerId?: string;
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #E5E7EB",
  borderRadius: 6, fontSize: 14, fontFamily: "var(--font-dm-sans, sans-serif)",
  outline: "none", color: "#111827", boxSizing: "border-box", background: "white",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: "#111827", display: "block", marginBottom: 5,
};

const selectStyle: React.CSSProperties = {
  ...fieldStyle, cursor: "pointer", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};

export function OwnerForm({ initialData, ownerId }: OwnerFormProps) {
  const router = useRouter();
  const isEdit = !!ownerId;

  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [propertyAddress, setPropertyAddress] = useState(initialData?.property_address ?? "");
  const [layout, setLayout] = useState<LayoutType>(initialData?.layout ?? "standard");
  const [pmsType, setPmsType] = useState<PmsType>(initialData?.pms_type ?? "appfolio");
  const [sectionsConfig, setSectionsConfig] = useState<SectionsConfig>(
    initialData?.sections_config ?? DEFAULT_SECTIONS
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];
    if (!name.trim()) validationErrors.push("Name is required.");
    if (!email.trim()) validationErrors.push("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      validationErrors.push("Enter a valid email address.");
    if (validationErrors.length) { setErrors(validationErrors); return; }

    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/owners/${ownerId}` : "/api/owners", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), property_address: propertyAddress.trim() || null, layout, sections_config: sectionsConfig, pms_type: pmsType }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors([data.error ?? "Save failed"]); return; }
      router.push("/dashboard/owners");
      router.refresh();
    } catch {
      setErrors(["Network error — please try again."]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
      {errors.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#B91C1C" }}>
          {errors.join(" ")}
        </div>
      )}

      {/* Owner details card */}
      <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Owner Details</span>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input type="email" style={fieldStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Property Address</label>
            <input style={fieldStyle} value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} placeholder="123 Oak Street, Austin TX 78701" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>PMS System</label>
              <select style={selectStyle} value={pmsType} onChange={(e) => setPmsType(e.target.value as PmsType)}>
                <option value="appfolio">AppFolio</option>
                <option value="buildium">Buildium</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Report Layout</label>
              <select style={selectStyle} value={layout} onChange={(e) => setLayout(e.target.value as LayoutType)}>
                <option value="summary">Summary (1 page)</option>
                <option value="standard">Standard (2 pages)</option>
                <option value="detailed">Detailed (full transactions)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Report config card */}
      <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Report Configuration</span>
        </div>
        <div style={{ padding: 20 }}>
          <SectionsConfigEditor value={sectionsConfig} onChange={setSectionsConfig} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="submit"
          disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", opacity: saving ? 0.7 : 1 }}
        >
          {saving && <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />}
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Owner"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "white", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 6, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
