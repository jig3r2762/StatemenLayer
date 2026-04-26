import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ParseResult, NormalizedReport, LineItem, ColumnMappingInput } from "@/types/parsers";
import {
  normalizeCategory,
  parseAmount,
  normalizeDate,
  extractMonth,
  computeTotals,
  blankReport,
} from "./normalize";

// ─────────────────────────────────────────────────────────────
// AppFolio column signatures
// These are the known header names AppFolio exports use.
// Matching is case-insensitive and partial.
// ─────────────────────────────────────────────────────────────
const AF_SIGNATURES = {
  owner_name: ["owner", "owner name", "property owner"],
  property_address: ["property", "property address", "unit address", "address"],
  report_month: ["month", "period", "statement month", "statement date"],
  total_income: ["total income", "gross income", "total receipts"],
  total_expenses: ["total expenses", "total disbursements", "total expense"],
  management_fee: ["management fee", "mgmt fee", "management"],
  net_to_owner: ["net to owner", "net owner", "owner net", "owner distribution", "net proceeds"],
  line_item_date: ["date", "trans date", "transaction date", "post date"],
  line_item_description: ["description", "memo", "transaction description", "notes"],
  line_item_category: ["category", "type", "account", "gl account", "transaction type"],
  line_item_amount: ["amount", "total", "debit", "credit", "charge", "payment"],
};

// Known AppFolio-specific header fingerprints (row 1 contains these)
export const APPFOLIO_FINGERPRINTS = [
  "appfolio",
  "owner statement",
  "owner distribution",
  "management fee",
  "net to owner",
];

export function isAppFolioFile(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const combined = lower.join(" ");
  return APPFOLIO_FINGERPRINTS.some((fp) => combined.includes(fp));
}

// ─────────────────────────────────────────────────────────────
// Auto-detect which column maps to which internal field
// Returns a best-guess ColumnMappingInput (field → actual header)
// ─────────────────────────────────────────────────────────────
export function detectColumns(headers: string[]): {
  mapping: Partial<ColumnMappingInput>;
  unmatched: string[];
} {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const mapping: Partial<ColumnMappingInput> = {};
  const matched = new Set<number>();

  for (const [field, candidates] of Object.entries(AF_SIGNATURES)) {
    for (let i = 0; i < lower.length; i++) {
      if (matched.has(i)) continue;
      if (candidates.some((c) => lower[i].includes(c) || c.includes(lower[i]))) {
        mapping[field as keyof ColumnMappingInput] = headers[i];
        matched.add(i);
        break;
      }
    }
  }

  const unmatched = headers.filter((_, i) => !matched.has(i));
  return { mapping, unmatched };
}

// ─────────────────────────────────────────────────────────────
// Main parse function
// Handles both CSV (papaparse) and XLSX (xlsx library)
// ─────────────────────────────────────────────────────────────
export function parseAppFolioFile(
  fileContent: string | ArrayBuffer,
  fileName: string,
  savedMapping?: Partial<ColumnMappingInput>
): ParseResult {
  let rows: Record<string, string>[] = [];
  let headers: string[] = [];

  try {
    if (fileName.match(/\.(xlsx|xls)$/i)) {
      const wb = XLSX.read(fileContent as ArrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
      if (raw.length < 2) {
        return errorResult("File appears empty — no data rows found.");
      }
      headers = (raw[0] as string[]).map(String);
      rows = raw.slice(1).map((row) =>
        Object.fromEntries(headers.map((h, i) => [h, String((row as string[])[i] ?? "")]))
      );
    } else {
      const parsed = Papa.parse<Record<string, string>>(fileContent as string, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });
      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        return errorResult(`CSV parse error: ${parsed.errors[0].message}`);
      }
      headers = parsed.meta.fields ?? [];
      rows = parsed.data;
    }
  } catch (err) {
    return errorResult(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (headers.length === 0) {
    return errorResult("No column headers found in file.");
  }

  // Determine column mapping
  const { mapping: autoMapping } = detectColumns(headers);
  const mapping = { ...autoMapping, ...savedMapping };

  // Check if critical fields are mapped
  const criticalFields: (keyof ColumnMappingInput)[] = [
    "owner_name",
    "property_address",
    "line_item_date",
    "line_item_description",
    "line_item_amount",
  ];
  const missingCritical = criticalFields.filter((f) => !mapping[f]);

  if (missingCritical.length > 0 && !savedMapping) {
    return {
      success: false,
      pms_detected: "appfolio",
      reports: [],
      errors: [],
      raw_headers: headers,
      requires_mapping: true,
      column_suggestions: buildSuggestions(headers, AF_SIGNATURES),
    };
  }

  // Group rows by owner + property
  const ownerMap = new Map<string, NormalizedReport>();

  for (const row of rows) {
    const ownerName = getField(row, mapping.owner_name)?.trim();
    const address = getField(row, mapping.property_address)?.trim();
    if (!ownerName && !address) continue;

    const key = `${ownerName}||${address}`;
    if (!ownerMap.has(key)) {
      const report = blankReport("appfolio");
      report.owner_name = ownerName ?? "Unknown Owner";
      report.property_address = address ?? "Unknown Address";
      ownerMap.set(key, report);
    }

    const report = ownerMap.get(key)!;

    // Set report month from first row that has it
    if (!report.report_month && mapping.report_month) {
      const monthRaw = getField(row, mapping.report_month);
      if (monthRaw) report.report_month = extractMonth(monthRaw);
    }

    // Parse line item
    const dateRaw = getField(row, mapping.line_item_date) ?? "";
    const desc = getField(row, mapping.line_item_description) ?? "";
    const catRaw = getField(row, mapping.line_item_category) ?? "";
    const amountRaw = getField(row, mapping.line_item_amount) ?? "0";

    if (!desc && !amountRaw) continue;

    const amount = parseAmount(amountRaw);
    const category = catRaw ? normalizeCategory(catRaw) : amount >= 0 ? "income" : "expense";

    const lineItem: LineItem = {
      date: normalizeDate(dateRaw),
      description: desc,
      category,
      amount,
      raw_category: catRaw || undefined,
    };
    report.line_items.push(lineItem);

    // Try to read summary totals if columns exist
    if (mapping.total_income && !report.total_income) {
      const v = parseAmount(getField(row, mapping.total_income) ?? "");
      if (v) report.total_income = v;
    }
    if (mapping.total_expenses && !report.total_expenses) {
      const v = parseAmount(getField(row, mapping.total_expenses) ?? "");
      if (v) report.total_expenses = v;
    }
    if (mapping.management_fee && !report.management_fee) {
      const v = parseAmount(getField(row, mapping.management_fee) ?? "");
      if (v) report.management_fee = v;
    }
    if (mapping.net_to_owner && !report.net_to_owner) {
      const v = parseAmount(getField(row, mapping.net_to_owner) ?? "");
      if (v) report.net_to_owner = v;
    }
  }

  const reports = Array.from(ownerMap.values());

  // If no summary totals were in the file, compute from line items
  for (const report of reports) {
    if (!report.total_income && !report.total_expenses) {
      const computed = computeTotals(report.line_items);
      Object.assign(report, computed);
    }

    // Warn if report_month is missing
    if (!report.report_month) {
      // Try to infer from line item dates
      const firstDate = report.line_items.find((li) => li.date)?.date;
      if (firstDate) {
        report.report_month = firstDate.slice(0, 7);
        report.parse_warnings.push("Report month inferred from first transaction date.");
      } else {
        report.parse_warnings.push("Report month could not be determined.");
      }
    }
  }

  if (reports.length === 0) {
    return errorResult("No owner data found. Check that the file contains owner name and property columns.");
  }

  return {
    success: true,
    pms_detected: "appfolio",
    reports,
    errors: [],
    raw_headers: headers,
    requires_mapping: false,
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function getField(row: Record<string, string>, colName?: string): string | undefined {
  if (!colName) return undefined;
  return row[colName];
}

function errorResult(message: string): ParseResult {
  return {
    success: false,
    pms_detected: "appfolio",
    reports: [],
    errors: [message],
    raw_headers: [],
    requires_mapping: false,
  };
}

function buildSuggestions(
  headers: string[],
  signatures: Record<string, string[]>
): Record<string, string[]> {
  const suggestions: Record<string, string[]> = {};
  for (const [field, candidates] of Object.entries(signatures)) {
    const lower = headers.map((h) => h.toLowerCase().trim());
    suggestions[field] = headers.filter((_, i) =>
      candidates.some((c) => lower[i].includes(c) || c.includes(lower[i]))
    );
    if (suggestions[field].length === 0) suggestions[field] = headers;
  }
  return suggestions;
}
