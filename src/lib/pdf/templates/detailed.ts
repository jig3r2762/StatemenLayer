import type { Account, MonthlyTrend, Owner } from "@/types/database";
import type { LineItem, NormalizedReport } from "@/types/parsers";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMonth(reportMonth: string): string {
  const [year, month] = reportMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatAmount(amount: number, numberFormat: Owner["sections_config"]["number_format"]): string {
  if (numberFormat === "plain") {
    return `$${amount.toFixed(2)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function groupTransactions(lineItems: LineItem[]): Array<{ title: string; items: LineItem[]; total: number }> {
  const groups = new Map<string, LineItem[]>();

  for (const item of lineItems) {
    const key = item.raw_category?.trim() || item.description.trim() || "Uncategorized";
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .map(([title, items]) => ({
      title,
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
    }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

function buildTransactionSection(params: {
  heading: string;
  groups: Array<{ title: string; items: LineItem[]; total: number }>;
  numberFormat: Owner["sections_config"]["number_format"];
  brandColor: string;
}): string {
  const { heading, groups, numberFormat, brandColor } = params;

  if (groups.length === 0) {
    return `<section class="section"><h2>${escapeHtml(heading)}</h2><p class="empty">No transactions recorded for this section.</p></section>`;
  }

  const content = groups
    .map((group) => {
      const hasUnit = group.items.some((item) => item.unit);
      const rows = group.items
        .map(
          (item) => `<tr>
            <td>${escapeHtml(item.date)}</td>
            ${hasUnit ? `<td>${escapeHtml(item.unit ?? "—")}</td>` : ""}
            <td>${escapeHtml(item.description)}</td>
            <td>${formatAmount(item.amount, numberFormat)}</td>
          </tr>`
        )
        .join("");

      return `<article class="group">
        <div class="group-header">
          <div>
            <h3>${escapeHtml(group.title)}</h3>
            <p>${group.items.length} item${group.items.length === 1 ? "" : "s"}</p>
          </div>
          <strong>${formatAmount(group.total, numberFormat)}</strong>
        </div>
        <table>
          <thead style="--thead-brand: ${brandColor}">
            <tr>
              <th>Date</th>
              ${hasUnit ? "<th>Unit</th>" : ""}
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </article>`;
    })
    .join("");

  return `<section class="section">
    <h2>${escapeHtml(heading)}</h2>
    ${content}
  </section>`;
}

function buildAttachmentSection(attachmentUrls: string[]): string {
  if (attachmentUrls.length === 0) {
    return "";
  }

  const items = attachmentUrls
    .map((url, index) => {
      const safeUrl = escapeHtml(url);
      const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);

      return `<article class="attachment-card">
        <div class="attachment-meta">
          <h3>Attachment ${index + 1}</h3>
          <a href="${safeUrl}" target="_blank" rel="noreferrer">Open source file</a>
        </div>
        ${
          isImage
            ? `<img src="${safeUrl}" alt="Attachment ${index + 1}" />`
            : `<div class="attachment-placeholder">PDF or document attachment available via the source link above.</div>`
        }
      </article>`;
    })
    .join("");

  return `<section class="section">
    <h2>Matched Attachments</h2>
    <div class="attachment-grid">${items}</div>
  </section>`;
}

function buildChartHtml(trendData: MonthlyTrend[], brandColor: string): string {
  if (trendData.length < 2) return "";

  const labels = JSON.stringify(
    trendData.map((t) => {
      const [year, month] = t.month.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    })
  );
  const incomeData = JSON.stringify(trendData.map((t) => t.income));
  const expensesData = JSON.stringify(trendData.map((t) => t.expenses));
  const netData = JSON.stringify(trendData.map((t) => t.net));

  return `
    <div style="margin:22px 0;padding:18px;background:#fff;border:1px solid #dbe4ee;border-radius:16px;">
      <p style="font-family:Arial,sans-serif;font-size:11px;color:#64748b;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.08em;">
        Income · Expenses · Net — Last ${trendData.length} Months
      </p>
      <canvas id="trendChart" width="660" height="160"></canvas>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
    <script>
      new Chart(document.getElementById('trendChart'),{
        type:'bar',
        data:{
          labels:${labels},
          datasets:[
            {label:'Income',data:${incomeData},backgroundColor:'${brandColor}cc'},
            {label:'Expenses',data:${expensesData},backgroundColor:'#EF444466'},
            {label:'Net',data:${netData},backgroundColor:'#10B98166'}
          ]
        },
        options:{
          responsive:false,
          plugins:{legend:{position:'bottom',labels:{font:{size:10}}}},
          scales:{
            y:{ticks:{callback:(v)=>'$'+Number(v).toLocaleString(),font:{size:9}}},
            x:{ticks:{font:{size:10}}}
          }
        }
      });
    </script>
  `;
}

export function buildHtml(params: {
  report: NormalizedReport;
  owner: Owner;
  account: Account;
  attachmentUrls?: string[];
  trendData?: MonthlyTrend[];
}): string {
  const { report, owner, account, attachmentUrls = [], trendData = [] } = params;
  const { sections_config: config } = owner;
  const incomeGroups = groupTransactions(report.line_items.filter((item) => item.category === "income"));
  const expenseGroups = groupTransactions(report.line_items.filter((item) => item.category === "expense"));
  const feeGroups = groupTransactions(report.line_items.filter((item) => item.category === "fee"));

  const metrics = [
    config.show_income
      ? `<div class="metric"><span>Total Income</span><strong>${formatAmount(report.total_income, config.number_format)}</strong></div>`
      : "",
    config.show_expenses
      ? `<div class="metric"><span>Total Expenses</span><strong>${formatAmount(report.total_expenses, config.number_format)}</strong></div>`
      : "",
    config.show_management_fee
      ? `<div class="metric"><span>Management Fee</span><strong>${formatAmount(report.management_fee, config.number_format)}</strong></div>`
      : "",
    `<div class="metric metric-net"><span>Net to Owner</span><strong>${formatAmount(report.net_to_owner, config.number_format)}</strong></div>`,
  ]
    .filter(Boolean)
    .join("");

  const orderedSections = config.section_order
    .map((section) => {
      if (section === "income" && config.show_income) {
        return buildTransactionSection({
          heading: "Income Transactions",
          groups: incomeGroups,
          numberFormat: config.number_format,
          brandColor: account.brand_color,
        });
      }

      if (section === "expenses" && config.show_expenses) {
        return buildTransactionSection({
          heading: "Expense Transactions",
          groups: expenseGroups,
          numberFormat: config.number_format,
          brandColor: account.brand_color,
        });
      }

      if (section === "fee" && config.show_management_fee) {
        return buildTransactionSection({
          heading: "Management Fee Transactions",
          groups: feeGroups,
          numberFormat: config.number_format,
          brandColor: account.brand_color,
        });
      }

      if (section === "net") {
        return `<section class="section">
          <h2>Net Summary</h2>
          <div class="callout">
            <p>${escapeHtml(owner.name)}'s property at ${escapeHtml(report.property_address)} closed ${escapeHtml(
              formatMonth(report.report_month)
            )} with net proceeds of <strong>${formatAmount(report.net_to_owner, config.number_format)}</strong>.</p>
            <p>This detailed layout includes every recorded transaction for review and audit support.</p>
          </div>
        </section>`;
      }

      return "";
    })
    .filter(Boolean)
    .join("");

  const attachmentsSection =
    config.show_attachments && attachmentUrls.length > 0
      ? buildAttachmentSection(attachmentUrls)
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(account.firm_name)} Detailed Statement</title>
    <style>
      :root {
        --brand: ${account.brand_color};
        --ink: #0f172a;
        --muted: #64748b;
        --line: #dbe4ee;
        --surface: #f8fafc;
      }

      * {
        box-sizing: border-box;
      }

      @page {
        size: Letter;
        margin: 0.75in;
      }

      body {
        margin: 0;
        color: var(--ink);
        font-family: Arial, Helvetica, sans-serif;
      }

      .hero {
        background: linear-gradient(135deg, var(--brand), #0f172a);
        color: white;
        padding: 28px;
        border-radius: 20px;
      }

      .hero h1 {
        margin: 0;
        font-size: 30px;
      }

      .hero-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 18px;
      }

      .hero-label {
        display: block;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.8;
      }

      .hero-value {
        display: block;
        margin-top: 6px;
        font-size: 18px;
        font-weight: 700;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin: 22px 0;
      }

      .metric {
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--surface);
        padding: 18px;
      }

      .metric span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .metric strong {
        display: block;
        margin-top: 8px;
        font-size: 22px;
      }

      .metric-net {
        background: rgba(15, 23, 42, 0.04);
      }

      .content {
        display: grid;
        gap: 18px;
      }

      .section {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 18px;
        break-inside: avoid;
      }

      .section h2 {
        margin: 0 0 14px;
        color: var(--brand);
        font-size: 17px;
      }

      .group {
        margin-bottom: 18px;
      }

      .group:last-child {
        margin-bottom: 0;
      }

      .group-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 12px;
        margin-bottom: 10px;
      }

      .group-header h3 {
        margin: 0;
        font-size: 15px;
      }

      .group-header p {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 12px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      thead tr {
        background: color-mix(in srgb, var(--thead-brand) 10%, white);
      }

      th,
      td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        font-size: 13px;
        vertical-align: top;
      }

      th {
        color: #334155;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.08em;
      }

      .callout {
        background: var(--surface);
        border-radius: 14px;
        padding: 16px;
      }

      .callout p {
        margin: 0 0 10px;
        color: #334155;
        line-height: 1.6;
      }

      .callout p:last-child {
        margin-bottom: 0;
      }

      .attachment-grid {
        display: grid;
        gap: 14px;
      }

      .attachment-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        overflow: hidden;
        background: white;
      }

      .attachment-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: var(--surface);
      }

      .attachment-meta h3 {
        margin: 0;
        font-size: 14px;
      }

      .attachment-meta a {
        color: var(--brand);
        font-size: 12px;
        text-decoration: none;
      }

      .attachment-card img {
        display: block;
        width: 100%;
        max-height: 480px;
        object-fit: contain;
        background: white;
      }

      .attachment-placeholder {
        padding: 24px 16px;
        color: var(--muted);
        font-size: 13px;
      }

      .empty {
        margin: 0;
        color: var(--muted);
      }

      .footer {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
        color: var(--muted);
        font-size: 12px;
        display: flex;
        justify-content: space-between;
      }

      .page-number::after {
        content: counter(page);
      }
    </style>
  </head>
  <body>
    <section class="hero">
      ${account.logo_url ? `<img src="${escapeHtml(account.logo_url)}" alt="${escapeHtml(account.firm_name)}" style="height:44px;max-width:200px;object-fit:contain;margin-bottom:14px;display:block;" />` : ""}
      <h1>${escapeHtml(account.firm_name)}</h1>
      <div class="hero-grid">
        <div>
          <span class="hero-label">Owner</span>
          <span class="hero-value">${escapeHtml(owner.name)}</span>
        </div>
        <div>
          <span class="hero-label">Property</span>
          <span class="hero-value">${escapeHtml(report.property_address)}</span>
        </div>
        <div>
          <span class="hero-label">Month</span>
          <span class="hero-value">${escapeHtml(formatMonth(report.report_month))}</span>
        </div>
        <div>
          <span class="hero-label">Statement Type</span>
          <span class="hero-value">Detailed Report</span>
        </div>
      </div>
    </section>

    <section class="metrics">${metrics}</section>

    ${buildChartHtml(trendData, account.brand_color)}

    <main class="content">
      ${orderedSections}
      ${attachmentsSection}
    </main>

    <footer class="footer">
      <span>Generated by ${escapeHtml(account.firm_name)}</span>
      <span>Page <span class="page-number"></span></span>
    </footer>
  </body>
</html>`;
}
