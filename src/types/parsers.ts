export type PmsSource = "appfolio" | "buildium" | "unknown";

export interface LineItem {
  date: string;
  description: string;
  category: "income" | "expense" | "fee";
  amount: number;
  raw_category?: string;
  unit?: string;
  payee?: string;
}

export interface NormalizedReport {
  owner_name: string;
  property_address: string;
  report_month: string; // "2026-04"
  total_income: number;
  total_expenses: number;
  management_fee: number;
  net_to_owner: number;
  line_items: LineItem[];
  pms_source: PmsSource;
  parse_warnings: string[];
}

export interface ParseResult {
  success: boolean;
  pms_detected: PmsSource;
  reports: NormalizedReport[];
  errors: string[];
  raw_headers: string[];
  requires_mapping: boolean;
  // present when requires_mapping is true
  column_suggestions?: Record<string, string[]>;
}

export interface ColumnMappingInput {
  owner_name: string;
  property_address: string;
  report_month: string;
  total_income: string;
  total_expenses: string;
  management_fee: string;
  net_to_owner: string;
  line_item_date: string;
  line_item_description: string;
  line_item_category: string;
  line_item_amount: string;
  unit?: string;
  payee?: string;
}
