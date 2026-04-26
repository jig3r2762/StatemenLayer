import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/stripe/client";
import type { Plan } from "@/types/database";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("include_inactive") === "true";

  let query = supabaseAdmin
    .from("owners")
    .select("*")
    .eq("account_id", account.id)
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("active", true);

  const { data: owners, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ owners: owners ?? [] });
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

  // Enforce plan limits
  const limits = PLAN_LIMITS[account.plan as Plan];
  if (limits.max_owners !== null) {
    const { count } = await supabaseAdmin
      .from("owners")
      .select("id", { count: "exact", head: true })
      .eq("account_id", account.id)
      .eq("active", true);

    if ((count ?? 0) >= limits.max_owners) {
      return NextResponse.json(
        { error: `Your ${account.plan} plan allows up to ${limits.max_owners} active owner profiles. Upgrade to add more.` },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const { name, email, property_address, layout, sections_config, pms_type } = body;

  if (!name || !email || !pms_type) {
    return NextResponse.json({ error: "name, email, and pms_type are required" }, { status: 400 });
  }

  const { data: owner, error } = await supabaseAdmin
    .from("owners")
    .insert({
      account_id: account.id,
      name,
      email,
      property_address: property_address ?? null,
      layout: layout ?? "standard",
      sections_config: sections_config ?? {
        show_income: true,
        show_expenses: true,
        show_management_fee: true,
        show_line_items: true,
        show_attachments: true,
        number_format: "comma",
        section_order: ["income", "expenses", "fee", "net"],
      },
      pms_type,
      active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ owner }, { status: 201 });
}
