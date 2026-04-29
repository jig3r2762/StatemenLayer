import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("accounts")
    .select("id, clerk_user_id, firm_name, plan")
    .eq("clerk_user_id", userId)
    .single();

  return NextResponse.json({
    clerkUserId: userId,
    accountFound: Boolean(data),
    account: data ?? null,
    supabaseError: error ? { code: error.code, message: error.message } : null,
  });
}
