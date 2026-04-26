import Stripe from "stripe";

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
}

export const PLAN_PRICES: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  growth: process.env.STRIPE_PRICE_GROWTH!,
  agency: process.env.STRIPE_PRICE_AGENCY!,
};

export const PLAN_LIMITS = {
  starter: { max_owners: 10, max_doors: 75, history_days: 30 },
  growth: { max_owners: null, max_doors: 200, history_days: 365 },
  agency: { max_owners: null, max_doors: null, history_days: 365 },
} as const;
