import type { LineItem, NormalizedReport, PmsSource } from "@/types/parsers";

// ─────────────────────────────────────────────────────────────
// Category normalization
// Maps free-text categories from AppFolio/Buildium to our three
// canonical categories: income | expense | fee
// ─────────────────────────────────────────────────────────────
const INCOME_KEYWORDS = [
  "rent", "income", "deposit", "late fee", "laundry", "parking",
  "storage", "pet fee", "application fee", "utility reimbursement",
  "nsf fee", "lease renewal", "move-in", "move in", "payment",
];

const FEE_KEYWORDS = [
  "management fee", "management", "mgmt fee", "mgmt", "property management",
  "leasing fee", "leasing commission", "admin fee", "administration fee",
];

const EXPENSE_KEYWORDS = [
  "repair", "maintenance", "plumbing", "electrical", "hvac", "roofing",
  "landscaping", "cleaning", "supplies", "insurance", "tax", "utility",
  "water", "gas", "electric", "sewer", "trash", "vendor", "contractor",
  "advertising", "vacancy", "legal", "accounting", "inspection",
];

export function normalizeCategory(raw: string): LineItem["category"] {
  const lower = raw.toLowerCase().trim();
  if (FEE_KEYWORDS.some((k) => lower.includes(k))) return "fee";
  if (INCOME_KEYWORDS.some((k) => lower.includes(k))) return "income";
  if (EXPENSE_KEYWORDS.some((k) => lower.includes(k))) return "expense";
  // Default: if amount is positive → income, will be resolved by caller
  return "expense";
}

// ─────────────────────────────────────────────────────────────
// Amount parsing
// Handles "$1,234.56", "(1,234.56)", "-1234.56", "1234.56"
// ─────────────────────────────────────────────────────────────
export function parseAmount(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const str = String(raw).trim();
  // Parentheses = negative
  const negative = str.startsWith("(") && str.endsWith(")");
  const cleaned = str.replace(/[$,()]/g, "").trim();
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return negative ? -Math.abs(value) : value;
}

// ─────────────────────────────────────────────────────────────
// Date normalization
// Returns ISO date string "YYYY-MM-DD" or best-effort string
// ─────────────────────────────────────────────────────────────
export function normalizeDate(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // MM/DD/YYYY or M/D/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // MM-DD-YYYY
  const mdyDashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdyDashMatch) {
    const [, m, d, y] = mdyDashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return trimmed;
}

// ─────────────────────────────────────────────────────────────
// Month extraction
// Returns "YYYY-MM" from various date strings
// ─────────────────────────────────────────────────────────────
export function extractMonth(raw: string): string {
  const iso = normalizeDate(raw);
  if (iso.length >= 7) return iso.slice(0, 7);
  return "";
}

// ─────────────────────────────────────────────────────────────
// Compute totals from line items when summary rows are absent
// ─────────────────────────────────────────────────────────────
export function computeTotals(items: LineItem[]): {
  total_income: number;
  total_expenses: number;
  management_fee: number;
  net_to_owner: number;
} {
  const total_income = items
    .filter((i) => i.category === "income")
    .reduce((s, i) => s + Math.abs(i.amount), 0);
  const management_fee = items
    .filter((i) => i.category === "fee")
    .reduce((s, i) => s + Math.abs(i.amount), 0);
  const total_expenses = items
    .filter((i) => i.category === "expense")
    .reduce((s, i) => s + Math.abs(i.amount), 0);
  const net_to_owner = total_income - total_expenses - management_fee;
  return { total_income, total_expenses, management_fee, net_to_owner };
}

// ─────────────────────────────────────────────────────────────
// Build a blank NormalizedReport shell
// ─────────────────────────────────────────────────────────────
export function blankReport(pms_source: PmsSource): NormalizedReport {
  return {
    owner_name: "",
    property_address: "",
    report_month: "",
    total_income: 0,
    total_expenses: 0,
    management_fee: 0,
    net_to_owner: 0,
    line_items: [],
    pms_source,
    parse_warnings: [],
  };
}
