import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, stripe_id, firm_name")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  let customerId = account.stripe_id;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      name: account.firm_name,
      metadata: { account_id: account.id },
    });
    customerId = customer.id;
    await supabaseAdmin.from("accounts").update({ stripe_id: customerId }).eq("id", account.id);
  }

  const baseUrl = process.env.BASE_URL ?? "";
  const portal = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/dashboard/settings`,
  });

  const subs = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  const active = subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status));
  const currentPeriodEnd = active ? (active as unknown as { current_period_end?: number }).current_period_end : undefined;
  const renewal_date = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null;

  return NextResponse.json({ url: portal.url, renewal_date });
}

