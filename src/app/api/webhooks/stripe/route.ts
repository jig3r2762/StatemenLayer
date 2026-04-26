import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Plan } from "@/types/database";

function planFromPriceId(priceId: string): Plan {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_GROWTH) return "growth";
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return "agency";
  return "starter";
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function updatePlanByCustomer(customerId: string | null, plan: Plan) {
  if (!customerId) return;
  await supabaseAdmin.from("accounts").update({ plan }).eq("stripe_id", customerId);
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      await updatePlanByCustomer(getCustomerId(subscription.customer), planFromPriceId(priceId ?? ""));
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await updatePlanByCustomer(getCustomerId(subscription.customer), "starter");
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = getCustomerId(session.customer);
      const accountId =
        session.metadata?.account_id ??
        (typeof session.customer_details?.email === "string" ? undefined : undefined);

      if (accountId && customerId) {
        await supabaseAdmin
          .from("accounts")
          .update({ stripe_id: customerId })
          .eq("id", accountId);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
