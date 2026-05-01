import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-display-serif",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StatementLayer — Owner Reporting for Property Managers",
  description:
    "Generate personalized, branded owner statements from AppFolio and Buildium exports in one click.",
  icons: {
    icon: [
      { url: "/logo-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo-mark.svg",
    apple: "/logo-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${dmSans.variable} ${dmSerifDisplay.variable} ${jetbrainsMono.variable} h-full`}
      >
        <body className="min-h-full flex flex-col">
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
