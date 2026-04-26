import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

async function getAccountId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  return data?.id ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const accountId = await getAccountId(userId);
  if (!accountId) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: owner, error } = await supabaseAdmin
    .from("owners")
    .select("*")
    .eq("id", id)
    .eq("account_id", accountId)
    .single();

  if (error || !owner) return NextResponse.json({ error: "Owner not found" }, { status: 404 });

  return NextResponse.json({ owner });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const accountId = await getAccountId(userId);
  if (!accountId) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const body = await req.json();
  const { name, email, property_address, layout, sections_config, pms_type, active } = body;

  const { data: owner, error } = await supabaseAdmin
    .from("owners")
    .update({ name, email, property_address: property_address ?? null, layout, sections_config, pms_type, active })
    .eq("id", id)
    .eq("account_id", accountId)
    .select()
    .single();

  if (error || !owner) return NextResponse.json({ error: "Owner not found or update failed" }, { status: 404 });

  return NextResponse.json({ owner });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const accountId = await getAccountId(userId);
  if (!accountId) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Soft delete
  const { error } = await supabaseAdmin
    .from("owners")
    .update({ active: false })
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
