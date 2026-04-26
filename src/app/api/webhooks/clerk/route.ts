import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabaseAdmin } from "@/lib/supabase/server";

interface ClerkUserCreatedEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name: string | null;
    last_name: string | null;
  };
}

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let event: ClerkUserCreatedEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserCreatedEvent;
  } catch {
    return new NextResponse("Invalid webhook signature", { status: 400 });
  }

  if (event.type === "user.created") {
    const { id: clerk_user_id, email_addresses, first_name, last_name } = event.data;
    const email = email_addresses[0]?.email_address ?? "";
    const name = [first_name, last_name].filter(Boolean).join(" ") || email.split("@")[0];

    // Check if account already exists (idempotent)
    const { data: existing } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", clerk_user_id)
      .single();

    if (!existing) {
      await supabaseAdmin.from("accounts").insert({
        clerk_user_id,
        firm_name: `${name}'s Firm`,
        brand_color: "#2563EB",
        plan: "starter",
      });
    }
  }

  return NextResponse.json({ received: true });
}
