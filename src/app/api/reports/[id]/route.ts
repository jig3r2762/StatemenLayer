import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateWebToken } from "@/lib/utils";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { ai_commentary?: string | null; web_token?: string | null }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  // Verify ownership via batch → account
  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("id, batch:report_batches(account_id)")
    .eq("id", id)
    .single();

  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  const batch = Array.isArray(report.batch) ? report.batch[0] : report.batch;
  if (!account || batch?.account_id !== account.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if ("ai_commentary" in body) updates.ai_commentary = body.ai_commentary ?? null;
  if ("web_token" in body) updates.web_token = body.web_token ?? generateWebToken();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("reports")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ report: updated });
}
