import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | {
        matched_report_id?: string | null;
        matched_date?: string | null;
        matched_amount?: number | null;
        confirmed?: boolean;
      }
    | null;

  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: attachment } = await supabaseAdmin
    .from("attachments")
    .select("id, account_id")
    .eq("id", id)
    .single();

  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  if (attachment.account_id !== account.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if ("matched_report_id" in body) updates.matched_report_id = body.matched_report_id ?? null;
  if ("matched_date" in body) updates.matched_date = body.matched_date ?? null;
  if ("matched_amount" in body) updates.matched_amount = body.matched_amount ?? null;
  if ("confirmed" in body) updates.confirmed = body.confirmed ?? false;

  const { data: updated, error } = await supabaseAdmin
    .from("attachments")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attachment: updated });
}

