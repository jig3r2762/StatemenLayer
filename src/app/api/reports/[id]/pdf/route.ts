import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

function extractStoragePath(pdfUrl: string): string | null {
  if (!pdfUrl.startsWith("http")) return pdfUrl;
  const match = pdfUrl.match(/\/sign\/pdfs\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("id, pdf_url, batch_id, owner:owners(name)")
    .eq("id", id)
    .single();

  if (!report || !report.pdf_url) {
    return NextResponse.json({ error: "PDF not found — generate the batch first" }, { status: 404 });
  }

  // Verify this report belongs to the authenticated account
  const { data: batch } = await supabaseAdmin
    .from("report_batches")
    .select("id")
    .eq("id", report.batch_id)
    .eq("account_id", account.id)
    .single();

  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const storagePath = extractStoragePath(report.pdf_url as string);
  if (!storagePath) return NextResponse.json({ error: "Invalid PDF record" }, { status: 500 });

  const { data: signed, error } = await supabaseAdmin.storage
    .from("pdfs")
    .createSignedUrl(storagePath, 60 * 60); // 1-hour fresh URL

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate download link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
