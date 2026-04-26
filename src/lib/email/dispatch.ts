import { Resend } from "resend";
import { formatMonth } from "@/lib/utils";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildButton(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">${escapeHtml(
    label
  )}</a>`;
}

function buildEmailHtml(params: {
  ownerName: string;
  propertyAddress: string;
  reportMonth: string;
  pdfUrl: string | null;
  webViewUrl: string | null;
  firmName: string;
}): string {
  const buttons = [
    params.webViewUrl ? buildButton("View Your Statement", params.webViewUrl) : "",
    params.pdfUrl ? buildButton("Download PDF", params.pdfUrl) : "",
  ]
    .filter(Boolean)
    .join('<span style="display:inline-block;width:12px;"></span>');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(params.firmName)} Statement</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 20px;background:linear-gradient(135deg,#1d4ed8,#0f172a);color:#ffffff;">
                <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Monthly Property Statement</p>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${escapeHtml(formatMonth(params.reportMonth))} for ${escapeHtml(
                  params.propertyAddress
                )}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(params.ownerName)},</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(
                  params.firmName
                )} has prepared your latest property statement for ${escapeHtml(
                  params.propertyAddress
                )}. You can review it online, download the PDF, or both using the links below.</p>
                ${
                  buttons
                    ? `<div style="margin:24px 0 20px;">${buttons}</div>`
                    : `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">Your statement is ready, but no online or PDF link was available at send time. Please reply to this email if you need a copy.</p>`
                }
                <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">If you have any questions about this month’s activity, reply directly and our team will be happy to help.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 6px;">${escapeHtml(params.firmName)}</p>
                <p style="margin:0;">You are receiving this because you are listed as the statement recipient for this property. Contact your property manager to stop these emails.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendOwnerEmail(params: {
  ownerEmail: string;
  ownerName: string;
  propertyAddress: string;
  reportMonth: string;
  pdfUrl: string | null;
  webViewUrl: string | null;
  fromEmail: string;
  firmName: string;
  reportId?: string;
}): Promise<{ id: string } | { error: string }> {
  const { data, error } = await getResend().emails.send({
    from: `${params.firmName} <${params.fromEmail}>`,
    to: params.ownerEmail,
    subject: `Your ${formatMonth(params.reportMonth)} Property Statement - ${params.propertyAddress}`,
    html: buildEmailHtml(params),
    tags: params.reportId ? [{ name: "report_id", value: params.reportId }] : undefined,
  });

  if (error || !data?.id) {
    return { error: error?.message ?? "Failed to send email" };
  }

  return { id: data.id };
}
