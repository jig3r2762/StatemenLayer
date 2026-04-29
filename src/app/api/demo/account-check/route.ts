import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";

  // Raw fetch test — bypasses supabase-js to see exact network error
  let rawResult: unknown = null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/accounts?clerk_user_id=eq.${userId}&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: "application/json",
      },
    });
    rawResult = { status: res.status, ok: res.ok, body: await res.text() };
  } catch (e) {
    rawResult = { fetchError: String(e), cause: (e as NodeJS.ErrnoException)?.cause ? String((e as NodeJS.ErrnoException).cause) : undefined };
  }

  // Also try supabase-js
  const { data, error } = await supabaseAdmin
    .from("accounts")
    .select("id, clerk_user_id, firm_name, plan")
    .eq("clerk_user_id", userId)
    .single();

  return NextResponse.json({
    clerkUserId: userId,
    supabaseUrl: supabaseUrl.slice(0, 50),
    serviceKeyOk: serviceKey.startsWith("eyJ"),
    rawFetch: rawResult,
    accountFound: Boolean(data),
    supabaseError: error ? { code: error.code, message: error.message } : null,
  });
}
