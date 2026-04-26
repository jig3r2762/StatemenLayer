import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabaseAdmin } from "@/lib/supabase/server";

type ResendEvent = {
  type: string;
  data: {
    tags?: Array<{ name: string; value: string }>;
  };
};

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);

  let event: ResendEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendEvent;
  } catch {
    return new NextResponse("Invalid webhook signature", { status: 400 });
  }

  const reportId = event.data.tags?.find((tag) => tag.name === "report_id")?.value;

  if (!reportId) return NextResponse.json({ ok: true });

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("id, batch:report_batches(id)")
    .eq("id", reportId)
    .single();

  const batch = Array.isArray(report?.batch) ? report.batch[0] : report?.batch;
  if (!report || !batch?.id) return NextResponse.json({ ok: true });

  switch (event.type) {
    case "email.delivered": {
      await supabaseAdmin.from("reports").update({ email_status: "delivered" }).eq("id", reportId);
      break;
    }
    case "email.opened":
    case "email.clicked": {
      await supabaseAdmin
        .from("reports")
        .update({
          email_status: "opened",
          opened_at: new Date().toISOString(),
        })
        .eq("id", reportId);
      break;
    }
    case "email.bounced":
    case "email.complained": {
      console.error(`[resend-webhook] report=${reportId} event=${event.type}`);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
