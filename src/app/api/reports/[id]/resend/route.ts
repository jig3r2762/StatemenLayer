import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendOwnerEmail } from "@/lib/email/dispatch";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, firm_name, from_name, reply_to_email")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select(
      "id, pdf_url, web_token, parsed_data, owner:owners(id, name, email), batch:report_batches(id, account_id, month)"
    )
    .eq("id", id)
    .single();

  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const batch = Array.isArray(report.batch) ? report.batch[0] : report.batch;
  if (!batch || batch.account_id !== account.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const owner = Array.isArray(report.owner) ? report.owner[0] : report.owner;
  if (!owner?.email) return NextResponse.json({ error: "Owner email not set" }, { status: 400 });

  const baseUrl = process.env.BASE_URL ?? "";
  const webViewUrl = report.web_token ? `${baseUrl}/r/${report.web_token}` : null;

  try {
    const result = await sendOwnerEmail({
      ownerEmail: owner.email,
      ownerName: owner.name,
      propertyAddress:
        typeof report.parsed_data === "object" &&
        report.parsed_data !== null &&
        "property_address" in report.parsed_data &&
        typeof report.parsed_data.property_address === "string"
          ? report.parsed_data.property_address
          : "Property statement",
      reportMonth: batch.month,
      pdfUrl: report.pdf_url,
      webViewUrl,
      fromEmail: process.env.RESEND_FROM_EMAIL ?? "noreply@statementlayer.local",
      firmName: account.from_name?.trim() || account.firm_name,
      replyTo: account.reply_to_email ?? undefined,
      reportId: report.id,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("reports")
    .update({ email_status: "sent", opened_at: null })
    .eq("id", report.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
