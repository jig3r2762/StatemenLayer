import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { pms_type, mapping } = await req.json();

  if (!pms_type || !mapping) {
    return NextResponse.json({ error: "pms_type and mapping are required" }, { status: 400 });
  }

  // Upsert — one mapping per account + PMS type
  const { error } = await supabaseAdmin
    .from("column_mappings")
    .upsert(
      {
        account_id: account.id,
        pms_type,
        mapping,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id,pms_type" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ saved: true });
}
