import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatMonth, formatCurrency } from "@/lib/utils";

function extractStoragePath(pdfUrl: string): string | null {
  if (!pdfUrl.startsWith("http")) return pdfUrl;
  const match = pdfUrl.match(/\/sign\/pdfs\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function getReportByToken(token: string) {
  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("*, owner:owners(*), batch:report_batches(*)")
    .eq("web_token", token)
    .single();

  if (!report) return null;

  if (report.web_token_expires_at && new Date(report.web_token_expires_at) < new Date()) {
    return null;
  }

  // Generate a fresh 24-hour signed URL for the PDF
  let pdfSignedUrl: string | null = null;
  if (report.pdf_url) {
    const storagePath = extractStoragePath(report.pdf_url as string);
    if (storagePath) {
      const { data: signed } = await supabaseAdmin.storage
        .from("pdfs")
        .createSignedUrl(storagePath, 60 * 60 * 24);
      pdfSignedUrl = signed?.signedUrl ?? null;
    }
  }

  return { report, pdfSignedUrl };
}

export default async function WebViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getReportByToken(token);

  if (!result) notFound();

  const { report, pdfSignedUrl } = result;
  const owner = Array.isArray(report.owner) ? report.owner[0] : report.owner;
  const batch = Array.isArray(report.batch) ? report.batch[0] : report.batch;
  const parsed = report.parsed_data as {
    total_income?: number;
    total_expenses?: number;
    net_to_owner?: number;
    management_fee?: number;
  } | null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Owner Statement</p>
          <h1 className="text-2xl font-bold text-gray-900">{owner?.name ?? "Owner"}</h1>
          {batch?.month && (
            <p className="text-gray-500 mt-0.5">{formatMonth(batch.month)}</p>
          )}
        </div>

        {/* AI Commentary */}
        {report.ai_commentary && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
            <p className="text-sm font-semibold text-blue-700 mb-2">From your property manager</p>
            <p className="text-gray-700 leading-relaxed">{report.ai_commentary}</p>
          </div>
        )}

        {/* Key figures */}
        {parsed && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-4">Financial Summary</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Total Income",    value: parsed.total_income },
                { label: "Total Expenses",  value: parsed.total_expenses },
                { label: "Management Fee",  value: parsed.management_fee },
                { label: "Net to Owner",    value: parsed.net_to_owner },
              ].map(({ label, value }) => value != null && (
                <div key={label}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-lg font-semibold text-gray-900 mt-0.5">
                    {formatCurrency(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF download */}
        {pdfSignedUrl && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Full Statement PDF</p>
              <p className="text-sm text-gray-500 mt-0.5">Download your complete statement</p>
            </div>
            <a
              href={pdfSignedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Download PDF
            </a>
          </div>
        )}

        <p className="text-xs text-center text-gray-400 mt-8">
          Powered by StatementLayer · This link expires in 90 days
        </p>
      </div>
    </div>
  );
}
