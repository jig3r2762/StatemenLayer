import type { Account, MonthlyTrend, Owner } from "@/types/database";
import type { NormalizedReport } from "@/types/parsers";

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
  const totalTransactions = report.line_items.length;
  const expenseCount = report.line_items.filter((item) => item.category === "expense").length;
  const incomeCount = report.line_items.filter((item) => item.category === "income").length;

  const summaryRows = [
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

  const sectionCards = [
    config.show_income
      ? `<section class="card"><h2>Income Overview</h2><p>${incomeCount} income item${incomeCount === 1 ? "" : "s"} were recorded for the period, totaling ${formatAmount(report.total_income, config.number_format)}.</p></section>`
      : "",
    config.show_expenses
      ? `<section class="card"><h2>Expense Overview</h2><p>${expenseCount} expense item${expenseCount === 1 ? "" : "s"} were recorded for the period, totaling ${formatAmount(report.total_expenses, config.number_format)}.</p></section>`
      : "",
    config.show_management_fee
      ? `<section class="card"><h2>Management Fee</h2><p>The monthly management fee recorded for this property was ${formatAmount(report.management_fee, config.number_format)}.</p></section>`
      : "",
    `<section class="card"><h2>Net Result</h2><p>The property closed ${formatMonth(report.report_month)} with a net owner distribution of ${formatAmount(report.net_to_owner, config.number_format)} across ${totalTransactions} total transaction${totalTransactions === 1 ? "" : "s"}.</p></section>`,
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(account.firm_name)} Statement Summary</title>
    <style>
      :root {
        --brand: ${account.brand_color};
        --ink: #0f172a;
        --muted: #64748b;
        --line: #dbe4ee;
        --panel: #f8fafc;
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
        background: white;
      }

      main {
        min-height: calc(11in - 1.5in);
        display: flex;
        flex-direction: column;
      }

      .header {
        background: linear-gradient(135deg, var(--brand), #0f172a);
        color: white;
        padding: 24px 28px;
        border-radius: 20px;
      }

      .firm {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
      }

      .meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        margin-top: 18px;
      }

      .meta-label {
        display: block;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.8;
      }

      .meta-value {
        display: block;
        margin-top: 4px;
        font-size: 18px;
        font-weight: 700;
      }

      .summary-box {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin: 22px 0;
      }

      .metric {
        padding: 18px;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
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
        border-color: rgba(15, 23, 42, 0.12);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        flex: 1;
      }

      .card {
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 16px;
      }

      .card h2 {
        margin: 0 0 10px;
        color: var(--brand);
        font-size: 15px;
      }

      .card p {
        margin: 0;
        color: #334155;
        line-height: 1.6;
        font-size: 14px;
      }

      .footer {
        margin-top: 24px;
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
    <main>
      <section class="header">
        ${account.logo_url ? `<img src="${escapeHtml(account.logo_url)}" alt="${escapeHtml(account.firm_name)}" style="height:40px;max-width:180px;object-fit:contain;margin-bottom:10px;display:block;" />` : ""}
        <h1 class="firm">${escapeHtml(account.firm_name)}</h1>
        <div class="meta">
          <div>
            <span class="meta-label">Owner</span>
            <span class="meta-value">${escapeHtml(owner.name)}</span>
          </div>
          <div>
            <span class="meta-label">Property</span>
            <span class="meta-value">${escapeHtml(report.property_address)}</span>
          </div>
          <div>
            <span class="meta-label">Statement Month</span>
            <span class="meta-value">${escapeHtml(formatMonth(report.report_month))}</span>
          </div>
          <div>
            <span class="meta-label">Layout</span>
            <span class="meta-value">Summary Statement</span>
          </div>
        </div>
      </section>

      <section class="summary-box">${summaryRows}</section>

      ${buildChartHtml(trendData, account.brand_color)}

      <section class="grid">${sectionCards}</section>

      <footer class="footer">
        <span>Generated by ${escapeHtml(account.firm_name)}</span>
        <span>Page <span class="page-number"></span></span>
      </footer>
    </main>
  </body>
</html>`;
}
