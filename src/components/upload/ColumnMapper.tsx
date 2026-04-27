"use client";
import { useState } from "react";
import type { ColumnMappingInput } from "@/types/parsers";

interface ColumnMapperProps {
  headers: string[];
  suggestions: Record<string, string[]>;
  pmsType: "appfolio" | "buildium" | "unknown";
  onConfirm: (mapping: Partial<ColumnMappingInput>, pmsType: "appfolio" | "buildium") => void;
  isLoading?: boolean;
}

const FIELD_LABELS: Record<keyof ColumnMappingInput, { label: string; required: boolean }> = {
  owner_name:            { label: "Owner Name",            required: false },
  property_address:      { label: "Property Address",      required: true },
  report_month:          { label: "Report Month / Period", required: false },
  total_income:          { label: "Total Income",          required: false },
  total_expenses:        { label: "Total Expenses",        required: false },
  management_fee:        { label: "Management Fee",        required: false },
  net_to_owner:          { label: "Net to Owner",          required: false },
  line_item_date:        { label: "Line Item Date",        required: true },
  line_item_description: { label: "Line Item Description", required: true },
  line_item_category:    { label: "Line Item Category / GL Account", required: false },
  line_item_amount:      { label: "Line Item Amount",      required: true },
  unit:                  { label: "Unit / Suite",          required: false },
  payee:                 { label: "Payee / Payer",         required: false },
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4,
};

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #E5E7EB", borderRadius: 6,
  fontSize: 13, fontFamily: "var(--font-dm-sans, sans-serif)", outline: "none",
  color: "#111827", background: "white", cursor: "pointer", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
};

export function ColumnMapper({ headers, suggestions, pmsType, onConfirm, isLoading = false }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Partial<ColumnMappingInput>>(() => {
    const initial: Partial<ColumnMappingInput> = {};
    for (const field of Object.keys(FIELD_LABELS) as (keyof ColumnMappingInput)[]) {
      const top = suggestions[field]?.[0];
      const isStrongMatch = top && headers.some(
        (h) => h.toLowerCase().includes(top.toLowerCase()) || top.toLowerCase().includes(h.toLowerCase())
      );
      if (top && isStrongMatch && top !== headers[0]) initial[field] = top;
      else if (top && suggestions[field]?.length === 1 && suggestions[field][0] !== headers[0]) initial[field] = top;
    }
    return initial;
  });

  const [selectedPms, setSelectedPms] = useState<"appfolio" | "buildium">(
    pmsType !== "unknown" ? pmsType : "appfolio"
  );

  const requiredFields = (Object.keys(FIELD_LABELS) as (keyof ColumnMappingInput)[]).filter(
    (f) => FIELD_LABELS[f].required
  );
  const allRequiredMapped = requiredFields.every((f) => mapping[f]);
  const missingRequired = requiredFields.filter((f) => !mapping[f]);

  function handleChange(field: keyof ColumnMappingInput, value: string) {
    setMapping((prev) => ({ ...prev, [field]: value === "__none__" ? undefined : value }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#92400E" }}>
        <strong>Column mapping required.</strong> We couldn&apos;t automatically detect all columns.
        Map each field below — this will be saved and auto-applied to future uploads.
      </div>

      {/* PMS type selector */}
      <div>
        <label style={labelStyle}>Source System</label>
        <select
          style={{ ...selectStyle, width: 200 }}
          value={selectedPms}
          onChange={(e) => setSelectedPms(e.target.value as "appfolio" | "buildium")}
        >
          <option value="appfolio">AppFolio</option>
          <option value="buildium">Buildium</option>
        </select>
      </div>

      {/* Field mapping grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {(Object.keys(FIELD_LABELS) as (keyof ColumnMappingInput)[]).map((field) => {
          const { label, required } = FIELD_LABELS[field];
          const missing = required && !mapping[field];
          return (
            <div key={field}>
              <label style={labelStyle}>
                {label}{" "}
                {required
                  ? <span style={{ color: "#EF4444" }}>*</span>
                  : <span style={{ color: "#9CA3AF", fontSize: 11 }}>(optional)</span>
                }
              </label>
              <select
                style={{ ...selectStyle, borderColor: missing ? "#FCA5A5" : "#E5E7EB" }}
                value={mapping[field] ?? "__none__"}
                onChange={(e) => handleChange(field, e.target.value)}
              >
                {!required && <option value="__none__">— Not in this file —</option>}
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}{suggestions[field]?.[0] === h ? " (suggested)" : ""}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {missingRequired.map((f) => (
            <span key={f} style={{ fontSize: 11, fontWeight: 500, background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FEE2E2", borderRadius: 9999, padding: "2px 8px" }}>
              {FIELD_LABELS[f].label} required
            </span>
          ))}
        </div>
        <button
          onClick={() => onConfirm(mapping, selectedPms)}
          disabled={!allRequiredMapped || isLoading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)", opacity: (!allRequiredMapped || isLoading) ? 0.5 : 1 }}
        >
          {isLoading ? "Processing…" : "Confirm Mapping & Parse"}
        </button>
      </div>
    </div>
  );
}
