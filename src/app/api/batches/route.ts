import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateWebToken } from "@/lib/utils";
import type { NormalizedReport } from "@/types/parsers";
import type { PrevMonthFigures } from "@/types/database";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: batches, error } = await supabaseAdmin
    .from("report_batches")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ batches });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, plan")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { reports, source_file, month, pms_type } = (await req.json()) as {
    reports: NormalizedReport[];
    source_file: string;
    month: string;
    pms_type: string;
  };

  if (!reports?.length || !source_file || !month) {
    return NextResponse.json({ error: "reports, source_file, and month are required" }, { status: 400 });
  }

  // Look up the most recent previous batch for variance comparison
  const { data: prevBatch } = await supabaseAdmin
    .from("report_batches")
    .select("id")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let prevMonthData: Record<string, PrevMonthFigures> = {};

  if (prevBatch) {
    const { data: prevReports } = await supabaseAdmin
      .from("reports")
      .select("owner_id, parsed_data")
      .eq("batch_id", prevBatch.id);

    for (const pr of prevReports ?? []) {
      if (!pr.owner_id || !pr.parsed_data) continue;
      const d = pr.parsed_data as NormalizedReport;
      prevMonthData[pr.owner_id] = {
        income: d.total_income,
        expenses: d.total_expenses,
        net: d.net_to_owner,
        line_items: (d.line_items ?? []).map((li) => ({
          description: li.description,
          amount: li.amount,
          category: li.category,
        })),
      };
    }
  }

  // Create the batch
  const { data: batch, error: batchErr } = await supabaseAdmin
    .from("report_batches")
    .insert({
      account_id: account.id,
      month,
      source_file,
      status: "processing",
      prev_month_data: prevMonthData,
    })
    .select()
    .single();

  if (batchErr || !batch) {
    return NextResponse.json({ error: batchErr?.message ?? "Failed to create batch" }, { status: 500 });
  }

  // Match parsed reports to owner profiles, auto-creating any that don't exist yet
  const { data: owners } = await supabaseAdmin
    .from("owners")
    .select("*")
    .eq("account_id", account.id)
    .eq("active", true);

  const ownerMap = new Map((owners ?? []).map((o) => [o.name.toLowerCase().trim(), o]));

  // Auto-create owners for any name not found in the DB
  const uniqueOwnerNames = [...new Set(reports.map((r) => r.owner_name))];
  const missingNames = uniqueOwnerNames.filter((name) => !ownerMap.has(name.toLowerCase().trim()));

  if (missingNames.length > 0) {
    const defaultSections = {
      show_income: true,
      show_expenses: true,
      show_management_fee: true,
      show_line_items: true,
      show_attachments: false,
      number_format: "comma" as const,
      section_order: ["income", "expenses", "management_fee", "line_items"],
    };
    const validPmsType = pms_type === "buildium" ? "buildium" : "appfolio";

    const { data: created } = await supabaseAdmin
      .from("owners")
      .insert(
        missingNames.map((name) => {
          const match = reports.find((r) => r.owner_name === name);
          return {
            account_id: account.id,
            name,
            email: "",
            property_address: match?.property_address ?? null,
            layout: "standard",
            sections_config: defaultSections,
            pms_type: validPmsType,
            active: true,
          };
        })
      )
      .select();

    for (const o of created ?? []) {
      ownerMap.set(o.name.toLowerCase().trim(), o);
    }
  }

  // Create report rows — one per parsed report
  const reportInserts = reports.map((r) => {
    const matchedOwner = ownerMap.get(r.owner_name.toLowerCase().trim());
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 90);

    return {
      batch_id: batch.id,
      owner_id: matchedOwner?.id ?? null,
      parsed_data: r,
      web_token: generateWebToken(),
      web_token_expires_at: tokenExpiry.toISOString(),
      ai_commentary: null,
      email_status: "pending" as const,
    };
  });

  const { error: reportsErr } = await supabaseAdmin.from("reports").insert(reportInserts);

  if (reportsErr) {
    // Roll back batch
    await supabaseAdmin.from("report_batches").delete().eq("id", batch.id);
    return NextResponse.json({ error: reportsErr.message }, { status: 500 });
  }

  // Reports inserted; PDFs not yet generated — mark as pending so user clicks Generate
  await supabaseAdmin
    .from("report_batches")
    .update({ status: "pending" })
    .eq("id", batch.id);

  return NextResponse.json({ batch_id: batch.id }, { status: 201 });
}
