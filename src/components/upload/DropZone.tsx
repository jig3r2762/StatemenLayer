"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, AlertCircle } from "lucide-react";

interface DropZoneProps {
  onFile: (file: File) => void;
  isLoading?: boolean;
}

const ACCEPTED = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
};

export function DropZone({ onFile, isLoading = false }: DropZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      setSizeError(null);
      const file = accepted[0];
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) { setSizeError("File exceeds the 25 MB limit."); return; }
      setSelectedFile(file);
      onFile(file);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    disabled: isLoading,
  });

  const zoneBorder = isDragReject ? "#EF4444" : isDragActive ? "#F59E0B" : "#D1D5DB";
  const zoneBg     = isDragReject ? "#FEF2F2"  : isDragActive ? "#FFFBEB" : "#FAFAFA";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${zoneBorder}`,
          borderRadius: 8,
          padding: "40px 24px",
          textAlign: "center",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "all 150ms",
          background: zoneBg,
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        <input {...getInputProps()} />
        <Upload style={{ width: 36, height: 36, color: "#9CA3AF", margin: "0 auto 12px" }} />
        {isDragActive ? (
          <p style={{ fontSize: 14, fontWeight: 600, color: "#92400E" }}>Drop your file here</p>
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
              Drag & drop your AppFolio or Buildium export
            </p>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>
              CSV, XLS, or XLSX — up to 25 MB
            </p>
          </>
        )}
      </div>

      {sizeError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 6, padding: "8px 12px" }}>
          <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
          {sizeError}
        </div>
      )}

      {selectedFile && !sizeError && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 12px", fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#374151" }}>
            <FileText style={{ width: 14, height: 14, color: "#F59E0B" }} />
            <span style={{ fontWeight: 500 }}>{selectedFile.name}</span>
            <span style={{ color: "#9CA3AF" }}>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          {!isLoading && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", display: "flex", alignItems: "center", padding: 4 }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
