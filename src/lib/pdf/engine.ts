import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import { buildHtml as summaryHtml } from "./templates/summary";
import { buildHtml as standardHtml } from "./templates/standard";
import { buildHtml as detailedHtml } from "./templates/detailed";
import type { Account, LayoutType, MonthlyTrend, Owner } from "@/types/database";
import type { NormalizedReport } from "@/types/parsers";

function getTemplate(layout: LayoutType) {
  switch (layout) {
    case "summary":
      return summaryHtml;
    case "detailed":
      return detailedHtml;
    default:
      return standardHtml;
  }
}

async function getExecutablePath(): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    return process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/google-chrome";
  }

  return chromium.executablePath(
    "https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.x64.tar"
  );
}

const SERVERLESS_VIEWPORT = { width: 1280, height: 720 };

export async function generatePdf(params: {
  report: NormalizedReport;
  owner: Owner;
  account: Account;
  attachmentUrls?: string[];
  trendData?: MonthlyTrend[];
}): Promise<Buffer> {
  const { report, owner, account, attachmentUrls, trendData } = params;
  const template = getTemplate(owner.layout);
  const html = template({ report, owner, account, attachmentUrls, trendData });

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      args: process.env.NODE_ENV === "development" ? [] : chromium.args,
      defaultViewport: SERVERLESS_VIEWPORT,
      executablePath: await getExecutablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    if (html.includes("trendChart")) {
      await page.waitForFunction(
        () => {
          const canvas = document.getElementById("trendChart") as HTMLCanvasElement | null;
          return canvas !== null && canvas.width > 0;
        },
        { timeout: 5000 }
      );
    }

    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.75in", bottom: "0.75in", left: "0.75in", right: "0.75in" },
    });

    return Buffer.from(pdf);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
