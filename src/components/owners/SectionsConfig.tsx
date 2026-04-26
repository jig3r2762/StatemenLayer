"use client";
import type { SectionsConfig } from "@/types/database";

interface SectionsConfigProps {
  value: SectionsConfig;
  onChange: (value: SectionsConfig) => void;
}

const TOGGLES: { key: keyof SectionsConfig; label: string }[] = [
  { key: "show_income",         label: "Show Income section" },
  { key: "show_expenses",       label: "Show Expenses section" },
  { key: "show_management_fee", label: "Show Management Fee" },
  { key: "show_line_items",     label: "Show Line Items table" },
  { key: "show_attachments",    label: "Show Repair Photos / Attachments" },
];

export function SectionsConfigEditor({ value, onChange }: SectionsConfigProps) {
  function toggle(key: keyof SectionsConfig) {
    onChange({ ...value, [key]: !value[key] });
  }

  function setNumberFormat(fmt: "comma" | "plain") {
    onChange({ ...value, number_format: fmt });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Sections to include</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TOGGLES.map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={!!value[key]}
                onChange={() => toggle(key)}
                style={{ width: 16, height: 16, accentColor: "#F59E0B", cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Number format</div>
        <div style={{ display: "flex", gap: 16 }}>
          {(["comma", "plain"] as const).map((fmt) => (
            <label key={fmt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
              <input
                type="radio"
                name="number_format"
                value={fmt}
                checked={value.number_format === fmt}
                onChange={() => setNumberFormat(fmt)}
                style={{ width: 16, height: 16, accentColor: "#F59E0B", cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, color: "#374151", fontFamily: "var(--font-jetbrains, monospace)" }}>
                {fmt === "comma" ? "$1,234.56" : "$1234.56"}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
