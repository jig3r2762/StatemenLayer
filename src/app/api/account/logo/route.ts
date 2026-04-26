import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds the 2MB limit." }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const storagePath = `${account.id}/logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("logos")
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: pub } = supabaseAdmin.storage.from("logos").getPublicUrl(storagePath);
  const logo_url = pub.publicUrl;

  const { error: updateError } = await supabaseAdmin
    .from("accounts")
    .update({ logo_url })
    .eq("id", account.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ logo_url });
}

