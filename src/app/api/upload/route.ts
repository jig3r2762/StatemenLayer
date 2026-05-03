import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseFile, detectPmsType } from "@/lib/parsers";
import type { ColumnMappingInput } from "@/types/parsers";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Look up account
  const { data: account, error: accountErr } = await supabaseAdmin
    .from("accounts")
    .select("id, plan")
    .eq("clerk_user_id", userId)
    .single();

  if (accountErr || !account) {
    console.error("[upload] account lookup failed", { userId, code: accountErr?.code, msg: accountErr?.message });
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const savedMappingRaw = formData.get("column_mapping") as string | null;
  const forcePms = formData.get("force_pms") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const fileName = file.name;
  if (!/\.(csv|xlsx|xls)$/i.test(fileName)) {
    return NextResponse.json({ error: "Only CSV and Excel files are supported" }, { status: 400 });
  }

  // Size check: 25MB
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 25MB limit" }, { status: 400 });
  }

  const isExcel = /\.(xlsx|xls)$/i.test(fileName);

  let fileContent: string | ArrayBuffer;
  if (isExcel) {
    fileContent = await file.arrayBuffer();
  } else {
    fileContent = await file.text();
  }

  // Load saved column mapping for this account + PMS
  let savedMapping: Partial<ColumnMappingInput> | undefined;
  if (savedMappingRaw) {
    try {
      savedMapping = JSON.parse(savedMappingRaw);
    } catch {
      // ignore malformed JSON
    }
  } else {
    const pmsType = forcePms ?? detectPmsType(fileContent, fileName);
    if (pmsType !== "unknown") {
      const { data: cm } = await supabaseAdmin
        .from("column_mappings")
        .select("mapping")
        .eq("account_id", account.id)
        .eq("pms_type", pmsType)
        .single();
      if (cm?.mapping) savedMapping = cm.mapping as Partial<ColumnMappingInput>;
    }
  }

  const result = parseFile(
    fileContent,
    fileName,
    savedMapping,
    (forcePms as "appfolio" | "buildium" | undefined) ?? undefined
  );

  // If requires_mapping, return headers + suggestions so UI can show the mapper
  if (result.requires_mapping) {
    return NextResponse.json(result, { status: 200 });
  }

  if (!result.success) {
    return NextResponse.json({ error: result.errors[0] ?? "Parse failed" }, { status: 422 });
  }

  return NextResponse.json(result, { status: 200 });
}
