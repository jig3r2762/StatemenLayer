import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PLAN_PRICES, getStripe } from "@/lib/stripe/client";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { plan?: "growth" | "agency" } | null;
  if (!body?.plan) return NextResponse.json({ error: "plan is required" }, { status: 400 });
  if (body.plan !== "growth" && body.plan !== "agency") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, stripe_id, firm_name, plan")
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

  const price = PLAN_PRICES[body.plan];
  if (!price) return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });

  const baseUrl = process.env.BASE_URL ?? "";
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${baseUrl}/dashboard/settings?checkout=success`,
    cancel_url: `${baseUrl}/dashboard/settings?checkout=cancel`,
    subscription_data: {
      metadata: { account_id: account.id, target_plan: body.plan },
    },
    metadata: { account_id: account.id, target_plan: body.plan },
  });

  return NextResponse.json({ url: session.url });
}

