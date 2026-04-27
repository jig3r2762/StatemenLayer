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

function groupByDescription(lineItems: LineItem[]): Array<{ label: string; total: number; count: number }> {
  const groups = new Map<string, { total: number; count: number }>();

  for (const item of lineItems) {
    const key = item.raw_category?.trim() || item.description.trim() || "Uncategorized";
    const current = groups.get(key) ?? { total: 0, count: 0 };
    current.total += item.amount;
    current.count += 1;
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([label, value]) => ({ label, total: value.total, count: value.count }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

function buildGroupTable(
  title: string,
  groups: Array<{ label: string; total: number; count: number }>,
  numberFormat: Owner["sections_config"]["number_format"],
  brandColor: string
): string {
  if (groups.length === 0) {
    return `<section class="section"><h2>${escapeHtml(title)}</h2><p class="empty">No items recorded for this section.</p></section>`;
  }

  const rows = groups
    .map(
      (group) => `<tr>
        <td>${escapeHtml(group.label)}</td>
        <td>${group.count}</td>
        <td>${formatAmount(group.total, numberFormat)}</td>
      </tr>`
    )
    .join("");

  return `<section class="section">
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead style="--thead-brand: ${brandColor}">
        <tr>
          <th>Category</th>
          <th>Entries</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
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
  const { report, owner, account, trendData = [] } = params;
  const { sections_config: config } = owner;
  const incomeGroups = groupByDescription(report.line_items.filter((item) => item.category === "income"));
  const expenseGroups = groupByDescription(report.line_items.filter((item) => item.category === "expense"));
  const feeGroups = groupByDescription(report.line_items.filter((item) => item.category === "fee"));

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
        return buildGroupTable("Income by Category", incomeGroups, config.number_format, account.brand_color);
      }

      if (section === "expenses" && config.show_expenses) {
        return buildGroupTable("Expenses by Category", expenseGroups, config.number_format, account.brand_color);
      }

      if (section === "fee" && config.show_management_fee) {
        return buildGroupTable("Management Fee Details", feeGroups, config.number_format, account.brand_color);
      }

      if (section === "net") {
        return `<section class="section">
          <h2>Net Summary</h2>
          <div class="callout">
            <p>The property finished ${escapeHtml(formatMonth(report.report_month))} with net owner proceeds of <strong>${formatAmount(report.net_to_owner, config.number_format)}</strong>.</p>
            <p>${report.line_items.length} transaction${report.line_items.length === 1 ? "" : "s"} were included in this reporting period.</p>
          </div>
        </section>`;
      }

      return "";
    })
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(account.firm_name)} Standard Statement</title>
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

      .page {
        min-height: calc(11in - 1.5in);
        display: flex;
        flex-direction: column;
        page-break-after: always;
      }

      .page:last-of-type {
        page-break-after: auto;
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

      .overview {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 16px;
        flex: 1;
      }

      .panel,
      .section {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 18px;
      }

      .panel h2,
      .section h2 {
        margin: 0 0 12px;
        color: var(--brand);
        font-size: 16px;
      }

      .panel p {
        margin: 0 0 12px;
        line-height: 1.6;
        color: #334155;
      }

      .quick-stats {
        display: grid;
        gap: 12px;
      }

      .quick-stat {
        border-top: 1px solid var(--line);
        padding-top: 12px;
      }

      .quick-stat:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .quick-stat strong {
        display: block;
        font-size: 18px;
      }

      .section-list {
        display: grid;
        gap: 16px;
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
      }

      .callout p:last-child {
        margin-bottom: 0;
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
    <section class="page">
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
            <span class="hero-value">Standard Report</span>
          </div>
        </div>
      </section>

      <section class="metrics">${metrics}</section>

      ${buildChartHtml(trendData, account.brand_color)}

      <section class="overview">
        <article class="panel">
          <h2>Portfolio Snapshot</h2>
          <p>This statement provides a category-level view of the property's monthly activity, highlighting how income, expenses, and fees shaped the owner distribution.</p>
          <p>The standard layout summarizes each section without listing every transaction individually, making it easier to review the month at a glance.</p>
        </article>

        <aside class="panel">
          <h2>Quick Facts</h2>
          <div class="quick-stats">
            <div class="quick-stat">
              <span class="hero-label">Transactions</span>
              <strong>${report.line_items.length}</strong>
            </div>
            <div class="quick-stat">
              <span class="hero-label">Income Groups</span>
              <strong>${incomeGroups.length}</strong>
            </div>
            <div class="quick-stat">
              <span class="hero-label">Expense Groups</span>
              <strong>${expenseGroups.length}</strong>
            </div>
          </div>
        </aside>
      </section>

      <footer class="footer">
        <span>Generated by ${escapeHtml(account.firm_name)}</span>
        <span>Page <span class="page-number"></span></span>
      </footer>
    </section>

    <section class="page">
      <div class="section-list">${orderedSections}</div>

      <footer class="footer">
        <span>Generated by ${escapeHtml(account.firm_name)}</span>
        <span>Page <span class="page-number"></span></span>
      </footer>
    </section>
  </body>
</html>`;
}
