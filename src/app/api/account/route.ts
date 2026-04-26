import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account, error } = await supabaseAdmin
    .from("accounts")
    .select("id, firm_name, logo_url, brand_color, plan, from_name, reply_to_email, created_at")
    .eq("clerk_user_id", userId)
    .single();

  if (error || !account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({ account });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { firm_name, brand_color, logo_url, from_name, reply_to_email } = await req.json();

  const updates: Record<string, string | null> = {};
  if (firm_name !== undefined) updates.firm_name = firm_name;
  if (brand_color !== undefined) updates.brand_color = brand_color;
  if (logo_url !== undefined) updates.logo_url = logo_url;
  if (from_name !== undefined) updates.from_name = from_name || null;
  if (reply_to_email !== undefined) updates.reply_to_email = reply_to_email || null;

  const { data: account, error } = await supabaseAdmin
    .from("accounts")
    .update(updates)
    .eq("clerk_user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ account });
}
