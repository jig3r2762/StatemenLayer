import Anthropic from "@anthropic-ai/sdk";
import type { NormalizedReport } from "@/types/parsers";
import type { PrevMonthFigures } from "@/types/database";

const SYSTEM_PROMPT =
  "You are a professional property management financial advisor writing to a real estate investor. " +
  "Your job: identify every income or expense line item that changed more than 10% vs the previous month, " +
  "and explain each flagged item in one specific sentence. " +
  "Then write a 2-sentence overall summary of the month. " +
  "Total response: under 150 words. " +
  "Tone: professional, warm, advisor. " +
  "Never repeat raw numbers verbatim — interpret them. " +
  "If no previous month data is available, write a standard 3-sentence summary instead.";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatMonth(reportMonth: string): string {
  const [year, month] = reportMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function buildUserMessage(report: NormalizedReport, prevFigures?: PrevMonthFigures): string {
  const expenseLines = report.line_items
    .filter((li) => li.category === "expense")
    .map((li) => {
      const prev = prevFigures?.line_items.find(
        (p) => p.description.toLowerCase() === li.description.toLowerCase()
      );
      if (prev && prev.amount !== 0) {
        const pct = (((li.amount - prev.amount) / Math.abs(prev.amount)) * 100).toFixed(1);
        const direction = li.amount > prev.amount ? "up" : "down";
        return `- ${li.description}: ${formatCurrency(li.amount)} (${direction} ${Math.abs(Number(pct))}% vs prior month)`;
      }
      return `- ${li.description}: ${formatCurrency(li.amount)}`;
    })
    .join("\n");

  const prevSummary = prevFigures
    ? [
        "",
        "Previous Month:",
        `- Total Income: ${formatCurrency(prevFigures.income)}`,
        `- Total Expenses: ${formatCurrency(prevFigures.expenses)}`,
        `- Net to Owner: ${formatCurrency(prevFigures.net)}`,
      ].join("\n")
    : "";

  return [
    `Owner: ${report.owner_name}`,
    `Property: ${report.property_address}`,
    `Month: ${formatMonth(report.report_month)}`,
    "",
    "This Month:",
    `- Total Income: ${formatCurrency(report.total_income)}`,
    `- Total Expenses: ${formatCurrency(report.total_expenses)}`,
    `- Net to Owner: ${formatCurrency(report.net_to_owner)}`,
    `- Management Fee: ${formatCurrency(report.management_fee)}`,
    prevSummary,
    "",
    "Expense Breakdown (with % change vs prior month where available):",
    expenseLines || "- No expense line items reported",
    "",
    "Generate the owner commentary now.",
  ].join("\n");
}

async function generateWithAnthropic(userMessage: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });
  return (message.content[0] as { type: string; text: string }).text.trim();
}

async function generateWithGroq(userMessage: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.status.toString());
    throw new Error(`Groq API error: ${res.status} — ${err}`);
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content.trim();
}

export async function generateCommentary(
  report: NormalizedReport,
  prevFigures?: PrevMonthFigures
): Promise<string | null> {
  const userMessage = buildUserMessage(report, prevFigures);

  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithAnthropic(userMessage);
  }

  if (process.env.GROQ_API_KEY) {
    return generateWithGroq(userMessage);
  }

  return null; // no key — PDF generates without commentary
}
