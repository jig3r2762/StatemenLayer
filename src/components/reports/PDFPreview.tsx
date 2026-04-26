"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";

interface PDFPreviewProps {
  pdfUrl: string | null;
  filename?: string;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function PDFPreview({ pdfUrl, filename = "report.pdf" }: PDFPreviewProps) {
  const isMobile = useIsMobile();
  const [iframeFailed, setIframeFailed] = useState(false);

  useEffect(() => { setIframeFailed(false); }, [pdfUrl]);

  const downloadHref = useMemo(() => pdfUrl ?? undefined, [pdfUrl]);

  if (!pdfUrl) {
    return (
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 6, background: "#F9FAFB", color: "#9CA3AF", fontSize: 13, padding: 16, textAlign: "center" }}>
        PDF not yet generated
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!isMobile && !iframeFailed && (
        <iframe
          src={pdfUrl}
          style={{ width: "100%", height: 600, border: "1px solid #E5E7EB", borderRadius: 6 }}
          onError={() => setIframeFailed(true)}
          title={filename}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{filename}</span>
        <a
          href={downloadHref}
          target="_blank"
          rel="noreferrer"
          download
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "white", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 500, textDecoration: "none", fontFamily: "var(--font-dm-sans, sans-serif)" }}
        >
          <FileDown style={{ width: 14, height: 14 }} /> Download
        </a>
      </div>

      {iframeFailed && !isMobile && (
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
          Inline preview unavailable — use the download link above.
        </div>
      )}
    </div>
  );
}
