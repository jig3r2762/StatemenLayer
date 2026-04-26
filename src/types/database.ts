export type Plan = "starter" | "growth" | "agency";
export type PmsType = "appfolio" | "buildium";
export type LayoutType = "summary" | "standard" | "detailed";
export type BatchStatus = "pending" | "processing" | "ready" | "sent" | "partial";
export type EmailStatus = "pending" | "sent" | "delivered" | "opened";

export interface Account {
  id: string;
  firm_name: string;
  logo_url: string | null;
  brand_color: string;
  plan: Plan;
  stripe_id: string | null;
  clerk_user_id: string;
  from_name: string | null;
  reply_to_email: string | null;
  created_at: string;
}

export interface Owner {
  id: string;
  account_id: string;
  name: string;
  email: string;
  property_address: string | null;
  layout: LayoutType;
  sections_config: SectionsConfig;
  pms_type: PmsType;
  active: boolean;
  created_at: string;
}

export interface SectionsConfig {
  show_income: boolean;
  show_expenses: boolean;
  show_management_fee: boolean;
  show_line_items: boolean;
  show_attachments: boolean;
  number_format: "comma" | "plain";
  section_order: string[];
}

export interface PrevMonthFigures {
  income: number;
  expenses: number;
  net: number;
  line_items: Array<{ description: string; amount: number; category: string }>;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface ReportBatch {
  id: string;
  account_id: string;
  month: string;
  source_file: string;
  status: BatchStatus;
  created_at: string;
  sent_at: string | null;
  prev_month_data: Record<string, PrevMonthFigures> | null;
}

export interface Report {
  id: string;
  batch_id: string;
  owner_id: string;
  pdf_url: string | null;
  web_token: string;
  ai_commentary: string | null;
  parsed_data?: Record<string, unknown> | null;
  email_status: EmailStatus;
  opened_at: string | null;
  created_at: string;
  // joined fields
  owner?: Owner;
}

export interface ColumnMapping {
  id: string;
  account_id: string;
  pms_type: PmsType;
  mapping: Record<string, string>;
  created_at: string;
  updated_at: string;
}
