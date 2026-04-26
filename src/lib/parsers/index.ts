import type { ParseResult, PmsSource, ColumnMappingInput } from "@/types/parsers";
import { isAppFolioFile, parseAppFolioFile, detectColumns as afDetect } from "./appfolio";
import { isBuildiumFile, parseBuildiumFile, detectColumns as bdDetect } from "./buildium";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────
// Sniff the PMS type by reading row 1 headers from the file
// ─────────────────────────────────────────────────────────────
export function detectPmsType(
  fileContent: string | ArrayBuffer,
  fileName: string
): PmsSource {
  let headers: string[] = [];
  try {
    if (fileName.match(/\.(xlsx|xls)$/i)) {
      const wb = XLSX.read(fileContent as ArrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
      headers = ((raw[0] as string[]) ?? []).map(String);
    } else {
      const parsed = Papa.parse<string[]>(fileContent as string, {
        header: false,
        preview: 1,
      });
      headers = ((parsed.data[0] as string[]) ?? []).map(String);
    }
  } catch {
    return "unknown";
  }

  if (isAppFolioFile(headers)) return "appfolio";
  if (isBuildiumFile(headers)) return "buildium";
  return "unknown";
}

// ─────────────────────────────────────────────────────────────
// Main entry point — auto-detects PMS and routes to correct parser
// ─────────────────────────────────────────────────────────────
export function parseFile(
  fileContent: string | ArrayBuffer,
  fileName: string,
  savedMapping?: Partial<ColumnMappingInput>,
  forcePms?: PmsSource
): ParseResult {
  const pms = forcePms ?? detectPmsType(fileContent, fileName);

  switch (pms) {
    case "appfolio":
      return parseAppFolioFile(fileContent, fileName, savedMapping);
    case "buildium":
      return parseBuildiumFile(fileContent, fileName, savedMapping);
    default:
      // Unknown PMS — try both and return whichever produces more reports
      const afResult = parseAppFolioFile(fileContent, fileName, savedMapping);
      const bdResult = parseBuildiumFile(fileContent, fileName, savedMapping);

      if (afResult.reports.length >= bdResult.reports.length && afResult.reports.length > 0) {
        return afResult;
      }
      if (bdResult.reports.length > 0) return bdResult;

      // Both failed — return requires_mapping state with all headers
      return {
        success: false,
        pms_detected: "unknown",
        reports: [],
        errors: [
          "Could not automatically detect the file format. Please select the column mapping manually.",
        ],
        raw_headers: afResult.raw_headers,
        requires_mapping: true,
        column_suggestions: afResult.column_suggestions,
      };
  }
}

export { afDetect as detectAppFolioColumns, bdDetect as detectBuildiumColumns };
export { APPFOLIO_FINGERPRINTS } from "./appfolio";
export { BUILDIUM_FINGERPRINTS } from "./buildium";
