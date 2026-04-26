import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/stripe/client";
import type { Plan } from "@/types/database";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, plan")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const limits = PLAN_LIMITS[account.plan as Plan];

  const { count: ownerCount } = await supabaseAdmin
    .from("owners")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.id)
    .eq("active", true);

  return NextResponse.json({
    plan: account.plan,
    ownerCount: ownerCount ?? 0,
    maxOwners: limits.max_owners,
  });
}

