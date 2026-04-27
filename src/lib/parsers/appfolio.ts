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
  findHeaderRow,
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
  unit: ["unit", "unit number", "suite", "apt"],
  payee: ["payee", "payer", "payee/payer", "vendor", "tenant", "paid to", "paid by"],
};

// Flat keyword list used for header-row detection (defined after AF_SIGNATURES)
const AF_KEYWORDS = Object.values(AF_SIGNATURES).flat();

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
  if (APPFOLIO_FINGERPRINTS.some((fp) => combined.includes(fp))) return true;
  // GL-style export: Property + Account + Balance columns together = AppFolio GL format
  const hasProperty = lower.some((h) => h === "property");
  const hasAccount = lower.some((h) => h === "account");
  const hasBalance = lower.some((h) => h === "balance");
  return hasProperty && hasAccount && hasBalance;
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

  // Priority-first: iterate candidates in order (most specific first),
  // then scan headers for each candidate. This prevents loose partial
  // matches (e.g. "property owner".includes("property")) from stealing
  // the wrong column and gives higher-priority candidates precedence.
  for (const [field, candidates] of Object.entries(AF_SIGNATURES)) {
    let found = false;
    for (const candidate of candidates) {
      if (found) break;
      for (let i = 0; i < lower.length; i++) {
        if (matched.has(i)) continue;
        if (lower[i].includes(candidate)) {
          mapping[field as keyof ColumnMappingInput] = headers[i];
          matched.add(i);
          found = true;
          break;
        }
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

  let skippedRows = 0;
  try {
    if (fileName.match(/\.(xlsx|xls)$/i)) {
      const wb = XLSX.read(fileContent as ArrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawXlsx = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
      if (rawXlsx.length < 2) {
        return errorResult("File appears empty — no data rows found.");
      }
      const rawRows = rawXlsx.map((r) => (r as string[]).map(String));
      const headerIdx = findHeaderRow(rawRows, AF_KEYWORDS);
      skippedRows = headerIdx;
      const rawHeaders = rawRows[headerIdx].map((h) => h.trim());
      const validCols = rawHeaders.map((h, i) => ({ h, i })).filter(({ h }) => h.length > 0);
      headers = validCols.map(({ h }) => h);
      rows = rawRows
        .slice(headerIdx + 1)
        .filter((row) => row.some((c) => c.trim().length > 0))
        .map((row) => Object.fromEntries(validCols.map(({ h, i }) => [h, String(row[i] ?? "")])));
    } else {
      const rawParsed = Papa.parse<string[]>(fileContent as string, {
        header: false,
        skipEmptyLines: false,
      });
      if (rawParsed.errors.length > 0 && rawParsed.data.length === 0) {
        return errorResult(`CSV parse error: ${rawParsed.errors[0].message}`);
      }
      const rawRows = (rawParsed.data as string[][]).map((r) => r.map(String));
      const headerIdx = findHeaderRow(rawRows, AF_KEYWORDS);
      skippedRows = headerIdx;
      const rawHeaders = rawRows[headerIdx].map((h) => h.trim());
      const validCols = rawHeaders.map((h, i) => ({ h, i })).filter(({ h }) => h.length > 0);
      headers = validCols.map(({ h }) => h);
      rows = rawRows
        .slice(headerIdx + 1)
        .filter((row) => row.some((c) => c.trim().length > 0))
        .map((row) => Object.fromEntries(validCols.map(({ h, i }) => [h, String(row[i] ?? "")])));
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

  // Check if critical fields are mapped (owner_name is optional — GL-style exports omit it)
  const criticalFields: (keyof ColumnMappingInput)[] = [
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
      report.property_address = address ?? "Unknown Address";
      // GL-style exports have no owner column — fall back to property name
      report.owner_name = ownerName || address || "Unknown Owner";
      if (!ownerName && address) {
        report.parse_warnings.push("Owner name not found — using property name.");
      }
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
    const unitRaw = getField(row, mapping.unit)?.trim();
    const payeeRaw = getField(row, mapping.payee)?.trim();

    if (!desc && !amountRaw) continue;

    const amount = parseAmount(amountRaw);
    // Use sign of amount as fallback category when no category column present
    const category = catRaw ? normalizeCategory(catRaw) : amount >= 0 ? "income" : "expense";

    const lineItem: LineItem = {
      date: normalizeDate(dateRaw),
      description: desc,
      category,
      amount,
      raw_category: catRaw || undefined,
      unit: unitRaw && unitRaw.toLowerCase() !== "all" ? unitRaw : undefined,
      payee: payeeRaw || undefined,
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

  for (const report of reports) {
    if (skippedRows > 0) {
      report.parse_warnings.push(`Skipped ${skippedRows} metadata row(s) before headers.`);
    }
  }

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
