import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const batchId = form.get("batch_id");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof batchId !== "string" || !batchId) {
    return NextResponse.json({ error: "batch_id is required" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds the 10MB limit." }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: batch } = await supabaseAdmin
    .from("report_batches")
    .select("id, account_id")
    .eq("id", batchId)
    .single();
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.account_id !== account.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const safeName = (file.name || "attachment")
    .replace(/[^\w.\-()+ ]+/g, "_")
    .slice(0, 120);
  const storagePath = `${account.id}/${batchId}/${randomUUID()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { data: upload, error: uploadError } = await supabaseAdmin.storage
    .from("attachments")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError || !upload) {
    return NextResponse.json({ error: uploadError?.message ?? "Upload failed" }, { status: 500 });
  }

  const { data: signed } = await supabaseAdmin.storage
    .from("attachments")
    .createSignedUrl(upload.path, 60 * 60 * 24 * 7);

  const fileUrl = signed?.signedUrl ?? upload.path;
  const fileType = file.type === "application/pdf" ? "pdf" : "image";

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("attachments")
    .insert({
      account_id: account.id,
      batch_id: batchId,
      file_url: fileUrl,
      file_name: file.name || safeName,
      file_type: fileType,
    })
    .select("id, file_url")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ attachment_id: inserted.id, file_url: inserted.file_url });
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const batchId = url.searchParams.get("batch_id");
  if (!batchId) return NextResponse.json({ error: "batch_id is required" }, { status: 400 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const { data: batch } = await supabaseAdmin
    .from("report_batches")
    .select("id, account_id")
    .eq("id", batchId)
    .single();
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.account_id !== account.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: attachments, error } = await supabaseAdmin
    .from("attachments")
    .select("*")
    .eq("batch_id", batchId)
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attachments: attachments ?? [] });
}

