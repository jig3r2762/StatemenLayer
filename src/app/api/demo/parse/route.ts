import { NextResponse } from "next/server";
import { parseFile } from "@/lib/parsers";

export const maxDuration = 20;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 5MB limit for demo" }, { status: 400 });
  }

  const fileName = file.name;
  const isExcel = /\.(xlsx|xls)$/i.test(fileName);
  const fileContent = isExcel ? await file.arrayBuffer() : await file.text();

  const result = parseFile(fileContent, fileName);

  if (result.requires_mapping) {
    return NextResponse.json({ error: "Could not auto-detect this file format. Use the full product to map columns." }, { status: 422 });
  }
  if (!result.success) {
    return NextResponse.json({ error: result.errors[0] ?? "Parse failed" }, { status: 422 });
  }
  if (result.reports.length === 0) {
    return NextResponse.json({ error: "No owner data found in this file." }, { status: 422 });
  }

  // Return only first 5 owners for demo purposes
  return NextResponse.json({ ...result, reports: result.reports.slice(0, 5) });
}
