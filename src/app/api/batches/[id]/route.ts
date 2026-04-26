import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: batch, error } = await supabaseAdmin
    .from("report_batches")
    .select("*")
    .eq("id", id)
    .eq("account_id", account.id)
    .single();

  if (error || !batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const { data: reports } = await supabaseAdmin
    .from("reports")
    .select("*, owner:owners(*)")
    .eq("batch_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ batch, reports: reports ?? [] });
}
