# StatementLayer — Build Progress Tracker

> This file tracks what has been built, what's in progress, and what's pending.
> Update this file as each task is completed. Any agent reading this knows exactly where to resume.

---

## Overall Status: LIVE — WEBHOOKS + SEO DONE — BLOCKED ON STRIPE

**Current Phase:** Production fully wired. Waiting on Stripe India approval. Cold outreach next.
**Last Updated:** 2026-05-03
**Live URL:** https://statementlayer.com
**Old Vercel URL:** https://statement-layer.vercel.app (still works)

---

### Round 10 — Webhooks + SEO + Security + Bug Fixes — COMPLETE ✅ (2026-05-03)

#### Infrastructure / Webhooks
- [x] **Zoho DKIM verified** — 1024-bit key (selector: zmail) added to Namecheap, verified in Zoho Mail
- [x] **Clerk webhook registered** — `https://statementlayer.com/api/webhooks/clerk`, event: `user.created`, `CLERK_WEBHOOK_SECRET` added to Vercel
- [x] **Resend webhook registered** — `https://statementlayer.com/api/webhooks/resend`, events: delivered/opened/clicked/bounced/complained, `RESEND_WEBHOOK_SECRET` added to Vercel
- [x] **Vercel env vars updated** — `RESEND_FROM_EMAIL=noreply@statementlayer.com`, `BASE_URL=https://statementlayer.com`
- [x] **Google Search Console verified** — Domain property `statementlayer.com`, TXT record added to Namecheap

#### SEO
- [x] **robots.txt** — `public/robots.txt` created; allows `/`, blocks `/dashboard`, `/api`, `/sign-in`, `/sign-up`, `/r/`
- [x] **sitemap.xml** — `src/app/sitemap.ts` (Next.js App Router, auto-serves at `/sitemap.xml`); added to public routes in `proxy.ts` (was being blocked by Clerk and redirecting to sign-in)
- [x] **Open Graph + Twitter card tags** — added to `src/app/layout.tsx` with `metadataBase`
- [x] **Page-level metadata** — `src/app/page.tsx` overrides layout with keyword-rich title: "Owner Statement Software for Property Managers"
- [x] **JSON-LD schema** — `SoftwareApplication` + `FAQPage` + `Organization` injected into landing page; makes AI models (ChatGPT, Perplexity, Gemini) cite the product
- [x] **FAQ section** — 7 questions added to landing page with accordion UI; powers FAQPage schema and Google rich results
- [x] **GSC sitemap submitted** — `https://statementlayer.com/sitemap.xml` submitted and verified

#### Security Fixes
- [x] **Debug info leak removed** — `/api/upload` was returning Supabase URL + error details in JSON response; now returns only generic error message (still logs server-side)
- [x] **File type validation** — `/api/upload` now rejects non-CSV/Excel files with a clear error before processing
- [x] **Stripe crash fix** — `/api/billing/checkout` and `/api/billing/portal` returned unhandled exceptions when `STRIPE_SECRET_KEY` was missing; now return `503` with a friendly message
- [x] **Stripe webhook crash fix** — `/api/webhooks/stripe` now exits early (400) instead of crashing when Stripe env vars are missing

#### Bug Fixes
- [x] **PDF logo blank** — `src/lib/pdf/engine.ts` now fetches `account.logo_url` server-side and converts to base64 data URL before passing to Puppeteer; no more blank logos due to Puppeteer unable to reach Supabase URLs
- [x] **Settings logo preview** — Changed from `borderRadius: 8` (square) to `borderRadius: "50%"` (circular); `objectFit: "cover"` fills the circle cleanly
- [x] **Email from address fallback** — Changed from `noreply@statementlayer.local` to `noreply@statementlayer.com`

#### Remaining
- [ ] Stripe keys + webhook → waiting on India application approval (submitted 2026-05-03)
- [ ] Cold email outreach — 397 leads in `StatementLayer Leads/output/day1_send_now.csv` — run `/money-outreach` to write sequences, then set up Instantly.ai or Lemlist

---

### Round 9 — Custom Domain + Clerk Production — COMPLETE ✅ (2026-05-01)

- [x] **statementlayer.com purchased** on Namecheap (May 1, 2026 – May 1, 2027)
- [x] **Namecheap DNS configured** — A record `@` → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`
- [x] **Vercel domain added** — `statementlayer.com` + `www.statementlayer.com` both connected, status: Ready
- [x] **Clerk Production instance created** — switched from Development to Production
- [x] **Clerk DNS verified** — 5 CNAME records added to Namecheap (clerk, accounts, clkmail, clk._domainkey, clk2._domainkey)
- [x] **Clerk Production API keys** — updated in Vercel environment variables (`pk_live_` + `sk_live_`)
- [ ] **Remove debug endpoints** — still pending (security risk):
  - `GET /api/env-check` — dumps env var names
  - `GET /api/account-check` — raw debug output

---

### Round 8 — Custom Send Modal + Debug Cleanup — PARTIAL ✅ (2026-04-29)

- [x] **Custom send modal** — Replaced native `confirm()` with a styled modal before batch send; send errors are now surfaced inline in the modal instead of silently failing (commit: `e832287`)
- [ ] **Remove debug endpoints** — `GET /api/env-check` + `GET /api/account-check` — security risk, delete before customer testing

---

### Round 7 — Parser Hardening + PDF/Email Polish — COMPLETE ✅ (2026-04-27)

#### Real-World AppFolio GL Export Support
- [x] **GL-style fingerprint detection** — `isAppFolioFile()` now has a second detection path: headers containing `property` + `account` + `balance` together = AppFolio GL format. Catches exports that have no "owner statement" / "net to owner" text in headers.
- [x] **`owner_name` no longer required** — Removed from `criticalFields`. GL exports have no owner column; parser falls back to property name with a parse warning. Old-style exports with `Owner Name` column work exactly as before.
- [x] **Unit + Payee columns added** — `unit` and `payee/payer` signatures added to `AF_SIGNATURES`. Both captured per line item in `LineItem.unit` and `LineItem.payee`. "All" unit rows (management fees) get `unit: undefined` so they don't create ambiguity.
- [x] **`ColumnMapper` updated** — Added `unit` and `payee` fields to manual mapping UI. `owner_name` marked `required: false`. `line_item_category` label updated to "Line Item Category / GL Account".

#### Multi-Row Header Detection
- [x] **`findHeaderRow()` in `normalize.ts`** — Scans up to 10 raw rows; skips rows with fewer than 3 non-empty cells (metadata rows: report titles, date ranges, company names); returns index of first row where ≥ 2 cells match known column signature keywords. Falls back to row 0.
- [x] **Both parsers use raw-mode reading** — AppFolio + Buildium parsers now parse with `header: false` first, call `findHeaderRow`, then reconstruct headers/rows from the real header row. Empty columns from metadata sections are filtered out.
- [x] **`detectPmsType` updated** — Reads up to 10 rows (was `preview: 1`); calls `findHeaderRow` before fingerprinting so GL exports with title rows are detected correctly.
- [x] **`skippedRows` warning** — Each report gets a `parse_warning` when metadata rows were skipped (e.g. "Skipped 3 metadata row(s) before headers.").

#### Priority-First Column Detection Fix
- [x] **Root bug fixed** — Old `detectColumns` checked `c.includes(lower[i])` (candidate contains header), causing false positives: `"property owner".includes("property")` stole "Property" for `owner_name`; `"unit address".includes("unit")` stole "Unit" for `property_address`. Broke grouping for any CSV with a plain "Property" header.
- [x] **Priority-first matching** — New approach: for each field, iterate candidates in defined order (most specific first), then scan all unmatched headers for each candidate. First candidate that finds a header wins. Result: "Category" column wins over "Type" for `line_item_category`; "Property" correctly maps to `property_address`; "Unit" correctly maps to `unit`.
- [x] **Both parsers fixed** — Same rewrite applied to `appfolio.ts` and `buildium.ts` `detectColumns` functions.

#### PDF & Email Polish
- [x] **Logo in all 3 PDF templates** — `account.logo_url` now rendered in the hero header of `standard.ts`, `detailed.ts`, and `summary.ts`. Logo upload was fully wired (API + Supabase storage + settings UI) but never displayed in the actual PDF output.
- [x] **Unit column in detailed template** — Line items table (`Date | Description | Amount`) now conditionally shows a `Unit` column when at least one transaction in the group has a unit value. Hidden entirely for simplified CSVs with no unit data.
- [x] **`from_name` + `reply_to_email` actually used** — Both batch send (`/api/batches/[id]/send`) and single resend (`/api/reports/[id]/resend`) routes now select `from_name` and `reply_to_email` from account. Email sender display name uses `from_name` (falls back to `firm_name`). Owner replies route to `reply_to_email` when set. Settings page already had the UI and DB columns — this closed the end-to-end gap.

---

### Round 6 — Full Mobile Responsiveness — COMPLETE ✅ (2026-04-27)
- [x] **Sidebar** — Mobile drawer: `position: fixed`, slides in from left on ≤1024px viewports. Sticky 48px top bar (hamburger + logo) rendered above main content on mobile. Overlay + close button. Route change auto-closes drawer. Desktop unchanged.
- [x] **Dashboard layout** — `main` gets `sl-main-content` class → `padding-top: 48px` on mobile to clear sticky bar.
- [x] **Header** — Font size uses `clamp(20px, 4vw, 28px)`. Padding reduced to `14px 16px` on mobile via `header-mobile` class.
- [x] **Stats grids** — `grid-4` and `grid-3` CSS classes collapse all 4-col and 3-col grids: 2-col on tablet (≤1024px), 1-col on phone (≤480px for grid-4, ≤640px for grid-3).
- [x] **Dashboard right sidebar** (`1fr 300px`) — `grid-sidebar-right` stacks to single column on tablet.
- [x] **Settings page** — `grid-settings` collapses 200px tab sidebar to full-width. Tabs become a horizontal-scrollable flex row on mobile.
- [x] **All tables** (Batches, Owners, Reports) — wrapped in `overflowX: auto` scroll containers with `minWidth` to prevent layout break.
- [x] **BatchesClient filter bar** — `flexWrap: "wrap"` so dropdowns wrap on narrow screens.
- [x] **BatchStickyBar** — `px-page` class reduces horizontal padding to 16px on mobile.
- [x] **Upload page** — `px-page` removes excess horizontal padding on mobile.
- [x] **All dashboard page bodies** — `px-page` class: 32px → 16px on mobile.
- [x] **Landing page nav** — Extracted to `LandingNav.tsx` client component. Desktop links hidden on mobile. Hamburger button shows; tapping opens a dropdown with all nav links + "Start free trial" CTA.
- [x] **Landing hero** — `grid-hero` collapses 2-col grid to 1-col on ≤900px. Hero demo panel hidden on mobile (`hero-demo-panel`). Hero copy padding adjusts.
- [x] **Landing sections** (Features, How it works, Testimonials, Pricing, CTA) — `landing-section` reduces padding to `64px 20px` on mobile.
- [x] **Landing CTA banner** — `landing-cta-inner` reduces inner padding on mobile.
- [x] **Landing footer** — `landing-footer-inner` stacks to column on mobile. Link columns hidden (`landing-footer-links`). Bottom bar wraps.
- [x] **Demo page** — Stats grid (`grid-3`) and CTA section (`grid-sidebar-right`) collapse on mobile. Nav padding tightened.
- [x] **globals.css** — Full responsive CSS system with named utility classes and `!important` overrides for inline styles.

---

## CRITICAL: Next.js 16 Breaking Changes

- **Middleware file is `src/proxy.ts`** — NOT `middleware.ts`. Next.js 16 renamed it. Never create `middleware.ts`.
- **No shadcn/ui components in dashboard** — All UI uses inline styles with design system tokens. Do NOT import from `@/components/ui/*` in any dashboard/app page.
- Always run `npx tsc --noEmit` before considering any task done.

---

## Design System — COMPLETE ✅ (2026-04-24)

### Token Summary
| Token | Value | Usage |
|---|---|---|
| Ink | `#0A0F1E` | Sidebar bg, dark headings, pricing section |
| Cream | `#FAF8F4` | Page canvas background |
| Amber | `#F59E0B` | Primary CTA, active nav, accent |
| Active nav bg | `rgba(245,158,11,0.15)` | Sidebar active item background |
| Card | white + `1px solid #E5E7EB` + `border-radius: 8px` + `box-shadow: 0 1px 3px rgba(10,15,30,0.06)` | All cards |

### Fonts (Next.js CSS variables)
- `--font-display-serif` → DM Serif Display (headings, H1s, logo wordmark)
- `--font-dm-sans` → DM Sans (all UI body text, buttons, labels)
- `--font-jetbrains` → JetBrains Mono (all financial figures, dates, file names)

### Brand Assets (in `public/`)
- `/logo.svg` — full logo, dark text, for light backgrounds (landing page nav)
- `/logo-light.svg` — full logo, white text, for dark backgrounds (sidebar)
- `/logo-mark.svg` — icon only, for favicons and tight spaces
- `src/app/icon.svg` — Next.js App Router favicon (auto-picked up, no favicon.ico needed)

---

## Auth & Routing — COMPLETE ✅

- [x] `src/proxy.ts` — Clerk middleware (Next.js 16 convention, NOT middleware.ts)
  - Public routes: `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/r/(.*)`, `/api/webhooks/(.*)`
  - All other routes: `auth.protect()`
- [x] Clerk env vars use v7 naming: `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` + `FORCE_REDIRECT_URL`
- [x] After sign-in/sign-up → `/dashboard`

---

## Week 1 — Foundation + Parsing ✅ COMPLETE

### Database (Supabase) ✅
- [x] `supabase/migrations/001_initial_schema.sql` — tables: accounts, owners, column_mappings, report_batches, reports, attachments
- [x] `supabase/migrations/002_add_parsed_data.sql` — `parsed_data jsonb` on reports table — **RUN ✅**
- [x] `supabase/migrations/003_add_prev_month_data.sql` — `prev_month_data jsonb` on report_batches — **RUN ✅**
- [x] RLS enabled on all tables, public web-view policy on `reports` (by `web_token` + expiry)
- [x] TypeScript types: `src/types/database.ts`, `src/types/parsers.ts`
  - Includes `PrevMonthFigures`, `MonthlyTrend` interfaces (added 2026-04-24)
- [x] Supabase browser + server admin clients: `src/lib/supabase/client.ts` + `server.ts`

### Supabase Storage ✅ (buckets created 2026-04-24)
- [x] `pdfs` bucket — private
- [x] `logos` bucket — public
- [x] `attachments` bucket — private

### Parsers ✅
- [x] `src/lib/parsers/normalize.ts` — shared utilities
- [x] `src/lib/parsers/appfolio.ts` — AppFolio CSV/Excel parser
- [x] `src/lib/parsers/buildium.ts` — Buildium CSV/Excel parser
- [x] `src/lib/parsers/index.ts` — auto-detects PMS, falls back, surfaces `requires_mapping`
- [x] Column mapping saved per account + PMS type — never remapped on subsequent uploads

### API Routes ✅
- [x] `POST /api/upload` — parse file, return result or `requires_mapping`
- [x] `POST /api/column-mappings` — upsert saved mapping
- [x] `GET/POST /api/owners` — list + create (plan limit enforced)
- [x] `GET/PUT/DELETE /api/owners/[id]` — owner CRUD (DELETE = soft-delete `active: false`)
- [x] `GET/PATCH /api/account` — firm name, brand color, logo_url
- [x] `POST /api/account/logo` — upload logo to Supabase Storage `logos` bucket
- [x] `GET /api/account/limits` — returns plan + ownerCount + maxOwners for limit checks
- [x] `GET/POST /api/batches` — list + create batch; now populates `prev_month_data` from previous batch on create
- [x] `GET /api/batches/[id]` — batch + reports with owner join
- [x] `POST /api/batches/[id]/generate` — PDF + AI commentary generation; passes variance data + trend data
- [x] `GET /api/batches/[id]/download` — streams ZIP of all PDFs; uses `storage.download()` + `extractStoragePath()` for durable downloads
- [x] `POST /api/batches/[id]/send` — batch email trigger
- [x] `PATCH /api/reports/[id]` — update ai_commentary or rotate web_token
- [x] `POST /api/reports/[id]/resend` — re-send individual report email
- [x] `GET /api/reports/[id]/pdf` — per-report PDF: verifies ownership, creates fresh 1-hour signed URL, redirects
- [x] `POST /api/attachments` — upload attachment to Supabase Storage
- [x] `PATCH /api/attachments/[id]` — confirm match fields
- [x] `POST /api/billing/checkout` — Stripe Checkout session
- [x] `POST /api/billing/portal` — Stripe billing portal
- [x] `POST /api/webhooks/clerk` — create accounts row on first sign-in
- [x] `POST /api/webhooks/resend` — delivery/open status updates
- [x] `POST /api/webhooks/stripe` — subscription lifecycle events

---

## Week 2 — PDF Engine ✅ COMPLETE

- [x] `src/lib/pdf/engine.ts` — Puppeteer-core + @sparticuz/chromium-min; accepts `trendData` param; `waitForFunction` guards Chart.js paint before PDF capture
- [x] `src/lib/pdf/templates/summary.ts` — 1-page summary template + 3-month bar chart (Chart.js)
- [x] `src/lib/pdf/templates/standard.ts` — 2-page standard template + 3-month bar chart
- [x] `src/lib/pdf/templates/detailed.ts` — full transaction template + 3-month bar chart
- [x] `src/lib/pdf/zip.ts` — batch ZIP generation
- [x] PM brand color applied in all templates via `account.brand_color`
- [x] **Durable PDF URLs** — generate route stores storage path (not signed URL) in `pdf_url`; download route uses `storage.download()` with `extractStoragePath()` helper that handles both old signed URLs and new path format; `/api/reports/[id]/pdf` route creates fresh 1-hour signed URL on demand

---

## Week 3 — AI + Email ✅ COMPLETE

- [x] `src/lib/ai/commentary.ts` — **Variance-triggered commentary** (updated 2026-04-24)
  - Flags any line item that changed >10% vs previous month
  - Passes per-owner `PrevMonthFigures` from batch `prev_month_data`
  - Falls back to standard 3-sentence summary when no prior month exists
- [x] `src/lib/email/dispatch.ts` — Resend batch send (lazy init)
- [x] 48h unopened alert — live on dashboard page

---

## Week 4 — Polish + Launch

### Performance — COMPLETE ✅ (2026-04-24)
- [x] `src/app/dashboard/layout.tsx` — converted to async server component; fetches `firm_name` + `plan` server-side; passes as props to Sidebar (eliminates client waterfall fetch)
- [x] `src/components/layout/Sidebar.tsx` — removed `useEffect` + `useState` account fetch; accepts props; all Tailwind classNames replaced with inline styles
- [x] `next.config.ts` — added `experimental.optimizePackageImports: ["lucide-react"]` (tree-shakes icon bundle)
- [x] `src/components/layout/DashboardProgressBar.tsx` — color corrected to amber `#F59E0B`

### Research Upgrades — COMPLETE ✅ (2026-04-24)
- [x] `prev_month_data` schema — stores per-owner prior month figures on each batch at creation
- [x] Variance-triggered AI commentary — prompt updated; generate route wires prev figures per owner
- [x] 3-month trend chart — Chart.js bar chart in all 3 PDF templates; generate route builds per-owner trend arrays from last 3 batches

### Test Data — COMPLETE ✅ (2026-04-24)
- [x] `test-data/appfolio-sample-apr2026.csv` — 3 owners, April 2026, auto-detects as AppFolio
- [x] `test-data/buildium-sample-mar2026.csv` — 3 owners, March 2026, auto-detects as Buildium

### Week 4 Polish — COMPLETE ✅ (2026-04-25)
- [x] Property address field — added to Owner form, type, APIs, migration 004
- [x] Owners table — "0" and "Never" instead of "—"; Remove → 3-dot menu (Edit/Remove)
- [x] Upload page — replaced "Required columns" with auto-detect message + AppFolio/Buildium sample CSV downloads
- [x] Generate/Review CTA — added to dashboard recent batches table + BatchesClient all statuses
- [x] Sample CSVs — `public/sample-appfolio.csv` and `public/sample-buildium.csv`
- [x] Email settings tab — From name + Reply-to in Settings; migration 005; API updated
- [x] Onboarding empty state — 4-step flow shown to new users (0 owners + 0 batches)
- [x] "How it works" section — added to landing page between features and pricing

### Landing Page Redesign — COMPLETE ✅ (2026-04-25)
- [x] `src/app/page.tsx` — full redesign using StatementLayer Design System
  - Dark sticky nav (Ink `#0A0F1E`) with inline LogoMark SVG + wordmark
  - Split hero: left copy (eyebrow/headline/subtext/CTAs/social proof) + right `<HeroDemo />`
  - 6-feature grid on Cream `#FAF8F4`
  - 3-step "How it works" on white with numbered circles
  - 3 testimonials on Cream
  - Pricing: Starter (white) + Growth (dark featured) + Agency (white) cards
  - CTA banner on Cream + full dark footer with 4 columns + copyright bar
  - `html { scroll-behavior: smooth }` added to globals.css
- [x] `src/app/_components/HeroDemo.tsx` — animated 4-step demo (Upload → Match → Generate → Send)
  - TypeScript client component, 20-second auto-loop via `cycleKey`
  - Typing effect for AI commentary, step sidebar with done/active/inactive states
  - Browser chrome mock + app top bar mock
  - All text colors use white/rgba variants (visible on dark `#0A0F1E` hero background)
- [x] Keyframe animations added to globals.css: `demospin`, `demoFadeIn`, `demoBlink`

### PDF + Batch Flow Fixes — COMPLETE ✅ (2026-04-25)
- [x] **Batch status "pending" at creation** — `POST /api/batches` now sets `status: "pending"` (was incorrectly "ready") after inserting report rows; PDFs don't exist yet at that point
- [x] **Correct status flow**: `pending` (batch created, no PDFs) → `processing` (generate running) → `ready` / `partial` (PDFs done)
- [x] **BatchActions handles "pending"** — Generate PDFs button shown for `pending` | `processing` | `partial` statuses
- [x] **Download uses programmatic fetch** — `BatchesClient` + `BatchActions` both use fetch+blob download (not `<a download>`) so errors surface as alerts/inline messages instead of silently saving JSON
- [x] **`GET /api/reports/[id]/pdf`** — per-report PDF download: verifies account ownership, calls `createSignedUrl` (1-hour), returns redirect to fresh signed URL

### Post-Critic UX Fixes — COMPLETE ✅ (2026-04-26)

#### Upload & Onboarding Friction (Round 1)
- [x] **Upload flow collapsed** — `upload/page.tsx` now has `"verified"` + `"generating"` stages; 3-second confirmation banner shows totals (income, expenses, net), then auto-triggers PDF generation and redirects. No separate "Generate" click needed.
- [x] **Auto-create owners from CSV** — `POST /api/batches` upserts missing owners by name before inserting reports. New users no longer blocked by "add owners first".
- [x] **BatchStickyBar** (`src/app/dashboard/batches/[id]/BatchStickyBar.tsx`) — Persistent send CTA at top of batch page; replaces the Send button in `BatchActions`:
  - All emails missing → link to Owners page ("Add owner emails to send →")
  - Some missing → amber warning strip with count + "Add emails →" link + partial-send button ("Send N reports →")
  - None missing → normal send button
- [x] **Dashboard copy** — "Batches" → "Reports" in nav label, page titles, empty states, stat card. Replaced 4-step onboarding wizard with single upload CTA card (shown only when zero reports exist). Quick actions trimmed to: Upload CSV + Send reports.
- [x] **Landing page** — Feature order reordered to match workflow; AI feature renamed "Plain-English summaries" with honest copy; added stat numbers (93 hrs / 67% / 2.3×) with trust line below.

#### AI Commentary Fixes (Round 2)
- [x] **Lazy Anthropic init** — `commentary.ts` previously crashed at build/boot when `ANTHROPIC_API_KEY` was missing (module-level `new Anthropic()`). Now uses a `getClient()` factory that returns `null` if no key, so PDFs generate without commentary.
- [x] **Groq backup** — Added `generateWithGroq()` using `https://api.groq.com/openai/v1` + model `llama-3.3-70b-versatile`. Priority: Anthropic → Groq → null. `GROQ_API_KEY` added to `.env.local`.
- [x] **GROQ_API_KEY typo fixed** — Was `GROK_API_KEY` everywhere; renamed correctly in both `.env.local` and `commentary.ts`.
- [x] **Model name corrected** — `claude-sonnet-4-20250514` → `claude-sonnet-4-6`.

#### Investor Web View Fixes (Round 2)
- [x] **PDF download link** — `/r/[token]/page.tsx` now generates a fresh 24-hour signed URL server-side using `extractStoragePath` + `createSignedUrl`. Raw storage paths no longer land in the `href`.
- [x] **Financial summary card** — Web view now shows Income, Expenses, Management Fee, Net to Owner pulled from `parsed_data`.

#### Critical White-Label + Email Fixes (Round 3)
- [x] **PDF footer white-labeling** — All 3 templates (`standard.ts`, `summary.ts`, `detailed.ts`) now render `Generated by <firm_name>` instead of the hardcoded `"Generated by StatementLayer"`. White-label promise holds end-to-end.
- [x] **PDF email download link fixed** — `send/route.ts` was passing raw Supabase storage path as `pdfUrl`, making the "Download PDF" button in every owner email broken. Now generates a fresh 7-day signed URL per report before calling `sendOwnerEmail`.

### Round 4 — Trust + GTM — COMPLETE ✅ (2026-04-26)
- [x] **PDF Preview Modal** — `ReportsTableClient.tsx` client component; batch page passes reports as props; "Preview" button opens full-screen overlay with iframe; ESC key + click-outside closes; "Download PDF" secondary button in modal header
- [x] **Upload Error Handling** — 3 explicit error states in `upload/page.tsx`:
  - Unknown format → amber warning card + "Map columns manually →" button (stays on idle, doesn't crash)
  - Missing required columns → red error card with specific message + "Get export help →" link
  - Empty file (zero owners) → amber warning with instructions to export the right report type
  - All 3 include "Try a different file" button that remounts dropzone
- [x] **No-Signup Demo Page** (`/demo`) — public page; parses real CSV via `/api/demo/parse`; shows HTML report cards with financials + AI commentary placeholder; disabled "Send" button with tooltip; CTA to `/sign-up`; stats grid on idle state
- [x] `/api/demo/parse` — no-auth parse endpoint; 5MB limit; returns max 5 owners; no DB writes
- [x] `src/proxy.ts` — added `/demo(.*)` and `/api/demo/(.*)` to public routes

### Round 5 — Landing + Demo Copy Overhaul — COMPLETE ✅ (2026-04-26)
- [x] **Landing page hero** — Headline → "Stop touching Excel for owner reports." Secondary CTA → "Try with your CSV →" (links `/demo`). Bottom CTA banner → "Close Excel. Open StatementLayer."
- [x] **Testimonials rewritten** — Specific time savings (6 hrs/mo, 3 hrs/batch), unit counts, personal stories. Section headline → "They closed Excel. They haven't opened it since."
- [x] **Pricing amber chip** — "Most managers save 8–10 hrs/month — Starter pays for itself in the first hour you don't spend in Excel"
- [x] **Demo page (`/demo`) overhaul** — Hero copy "Upload your export → owner reports ready instantly". AI commentary block removed and replaced with real line items (up to 4 per report). Post-parse dark banner shows elapsed parse time + "replaces 6–10 hours of Excel". Post-parse conversion CTA with specific bullets. Idle stats grid: "< 2 min upload to sent", "8–10 hrs saved per month", "$79/mo costs less than 1 hour of your time".
- [x] **Upload page copy** — Generation spinner → "Building branded PDFs with financial commentary — almost there…". Button label → "Building reports…"

### Round 5 — SSE Streaming PDF Generation — COMPLETE ✅ (2026-04-26)
- [x] **`POST /api/batches/[id]/generate`** — Converted from single JSON response to SSE stream. Events: `{type:"start", total}` → `{type:"progress", done, total, reportId, ownerName}` → `{type:"complete", status, generated, failed}`. `maxDuration` raised to 300s. `export const runtime = "nodejs"`.
- [x] **`BatchActions.tsx`** — Reads SSE stream via `ReadableStream.getReader()`. Shows live counter "2 of 4 ready…" in button. Shows per-owner confirmation "James Wilson's report ready" below button. Calls `router.refresh()` after each progress event so table updates live.

### Round 5 — HeroDemo UI Fixes — COMPLETE ✅ (2026-04-26)
- [x] **Step sidebar text shortened** — Labels: "Upload / CSV or Excel", "Match / Auto-detected", "Generate / PDF + AI", "Send / One click"
- [x] **Consistent step heights** — Desc text now always visible (not only when active). Connector uses fixed `height: 28px`. Right column has `minHeight: 53`. Eliminates active-step height inconsistency.
- [x] **Upload step height stability** — Demo frame and step content div both get `minHeight: 0` to override flexbox `min-height: auto`. CSV table growing beyond 460px no longer pushes the demo frame taller.

### Round 5 — Selective Send — COMPLETE ✅ (2026-04-26)
- [x] **`POST /api/batches/[id]/send`** — Accepts optional `reportIds: string[]` in body; filters reports query with `.in("id", reportIds)` when provided. Removed `sent_at` block — re-sending is now allowed. Status check expanded to `["ready", "partial", "sent"]`.
- [x] **`ReportsTableClient.tsx`** — New props: `selectedIds`, `onSelectionChange`, `batchStatus`. Checkbox column shown when `batchStatus ∈ {ready, partial, sent}`. "Select all" header checkbox with indeterminate state. Owners without email get disabled/faded checkbox. Selected rows highlight amber (`#FFFBEB`).
- [x] **`BatchStickyBar.tsx`** — New prop `selectedReportIds?: string[]`. Button shows "Send 2 selected →" when IDs present, "Send 4 reports →" otherwise. Hint text updates: "X of N owners selected · uncheck to send all" vs "Check boxes below to send to specific owners only". Expanded to show for `partial` batches too.
- [x] **`BatchDetailClient.tsx`** — New client wrapper that owns `selectedIds` state shared between the sticky bar and table. Also renders the stats row and unopened-after-48h alert, so layout order is preserved.
- [x] **`page.tsx`** — Replaced separate `BatchStickyBar` + `ReportsTableClient` + stats div with single `<BatchDetailClient>`. Server still computes `stats`, `unopenedCount`, `sentCount`, `missingEmailCount` and passes as props.

### Real-world Test CSVs — COMPLETE ✅ (2026-04-26)
- [x] `test-data/buildium-real-may2026.csv` — 4 owners (James Wilson, Sarah Chen, Robert Martinez, Linda Thompson), May 2026, real Buildium column names (`Contact Name`, `Rental Property`, `Entry Date`, `Payee`, `Posting Memo`, `GL Account Name`, `Amount`)
- [x] `test-data/appfolio-real-may2026.csv` — same 4 owners, May 2026, real AppFolio column names (`Owner`, `Property`, `Transaction Date`, `Description`, `Account`, `Amount`, `Management Fee`, `Net to Owner`)

### Remaining — PENDING ⏳
- [x] Run migration 004 (`alter table owners add column property_address text`) — **DONE**
- [x] Run migration 005 (`alter table accounts add column from_name/reply_to_email`) — **DONE**
- [x] Resend API key — **DONE** (key set, tested send to own email via shared domain)
- [ ] Resend custom domain verified — **NEXT UP** — go to resend.com → Domains → Add `statementlayer.com` → add 3 DNS records to Namecheap
- [x] Vercel deployment — **LIVE** at https://statementlayer.com (custom domain 2026-05-01)
- [x] Production env vars set in Vercel dashboard — **DONE**
- [x] Custom domain — **DONE** — statementlayer.com (Namecheap, purchased 2026-05-01)
- [x] Clerk Production instance — **DONE** — switched from dev to prod, 5 DNS records verified
- [ ] Anthropic API key — optional; Groq is active backup
- [x] Remove debug API routes (`/api/demo/env-check`, `/api/demo/account-check`) — **DONE** (deleted 2026-05-02)
- [ ] Register Clerk webhook in Clerk dashboard → `https://statementlayer.com/api/webhooks/clerk`
- [ ] Register Resend webhook in Resend dashboard → `https://statementlayer.com/api/webhooks/resend` (after domain verified)
- [ ] Stripe keys + webhook → `https://statementlayer.com/api/webhooks/stripe`

---

## API Keys Status

| Service | Key Set? | Notes |
|---|---|---|
| Supabase | ✅ | DB live, all 3 storage buckets created |
| Clerk | ✅ | Production instance live on statementlayer.com — `pk_live_` + `sk_live_` keys in Vercel |
| Anthropic | ❌ | Optional — Groq is active backup for AI commentary |
| Groq | ✅ | `GROQ_API_KEY` set; llama-3.3-70b-versatile; used as AI commentary backup |
| Resend | ⚠️ | API key ✅ set. Domain ❌ not verified — add statementlayer.com to Resend dashboard, paste 3 DNS records into Namecheap |
| Stripe | ❌ | All Stripe keys empty |

---

## Test Flow (use test-data/ CSVs)

1. Upload `buildium-sample-mar2026.csv` — owners **James Wilson**, **Sarah Chen**, **Robert Martinez** are auto-created from CSV; seeds March prev_month_data
2. Upload `appfolio-sample-apr2026.csv` — April batch; owners matched by name
3. Hit Generate on April batch — PDFs render with trend chart; AI commentary via Groq (llama-3.3-70b); flags >10% variance vs March
4. Add owner emails in Owners page (required to send)
5. Review → Send (needs Resend key + verified domain)

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-04-23 | Next.js 16 (latest) | create-next-app@latest installed 16 |
| 2026-04-23 | Puppeteer-core + @sparticuz/chromium-min | Vercel serverless compatibility |
| 2026-04-23 | shadcn/ui built manually | `shadcn init` interactive CLI incompatible with non-TTY shell |
| 2026-04-24 | All dashboard UI uses inline styles (no shadcn) | Design system implementation — pixel-perfect match to brand kit |
| 2026-04-24 | Next.js 16 proxy.ts (not middleware.ts) | Breaking change in Next.js 16 — middleware file renamed |
| 2026-04-24 | Clerk v7 redirect env vars | AFTER_SIGN_IN_URL deprecated |
| 2026-04-24 | Resend lazy initialization | Eager init at module level crashes build when key is missing |
| 2026-04-24 | Variance-triggered AI commentary | Research confirmed owners want >10% change explanations, not generic summaries |
| 2026-04-24 | Chart.js via CDN in Puppeteer HTML | Zero npm dependency; Puppeteer loads CDN before PDF capture |
| 2026-04-24 | DashboardLayout async server component | Eliminates Sidebar client waterfall fetch on every page load |
| 2026-04-25 | Store storage path (not signed URL) in pdf_url | 24-hour signed URLs were expiring; path is permanent and a fresh URL is generated on demand |
| 2026-04-25 | Batch status "pending" at creation (not "ready") | "ready" at creation caused "No PDFs found" errors — users tried to download before running Generate |
| 2026-04-25 | Landing page full redesign from Design System | Pixel-perfect match to brand kit; animated HeroDemo drives conversion above the fold |
| 2026-04-26 | Store storage path in pdf_url, generate signed URLs at send time | Signed URLs expire; send route now generates 7-day signed URLs per report before emailing — owners always get a working PDF link |
| 2026-04-26 | Groq as AI commentary backup | Anthropic key not available in dev; Groq (llama-3.3-70b) is free/fast enough for MVP; priority: Anthropic → Groq → null |
| 2026-04-26 | PDF footer uses firm_name (not "StatementLayer") | White-label selling point; hardcoded string contradicted the marketing promise |
| 2026-04-26 | Auto-upsert owners from CSV at batch creation | Eliminated "add owners before upload" friction that blocked every new user on first upload |
| 2026-04-26 | BatchStickyBar owns the send CTA (not BatchActions) | Persistent bar shows missing email count with actionable link; prevents silent partial-send failures |
| 2026-04-26 | SSE streaming for generate route instead of JSON | Progress events let the UI show per-owner confirmation live; 4-owner batch at ~15s each would timeout a JSON response |
| 2026-04-26 | BatchDetailClient wrapper for selection state | BatchStickyBar and ReportsTableClient are siblings — needed a shared client parent to pass selectedIds between them without prop-drilling through a server component |
| 2026-04-26 | Selective send passes reportIds only when non-empty | Empty body = send all (backward compat); populated body = filtered send. No API flag needed. |
| 2026-04-27 | CSS utility classes + !important to override inline styles | App uses inline styles throughout; media queries can't target inline styles without !important — utility classes in globals.css are the only viable approach without full rewrite |
| 2026-04-27 | Sidebar drawer self-contained in Sidebar.tsx | Sidebar is already a client component; renders mobile top bar, overlay, and aside from one component — no layout changes or context needed |
| 2026-04-27 | Hero demo panel hidden on mobile (not stacked) | HeroDemo is an animated 460px component; it would be unusable at 375px and kill page load — hiding it is the right trade-off for mobile conversion |
| 2026-04-27 | Priority-first candidate matching in detectColumns | Old `c.includes(lower[i])` check caused false positives ("property owner" stealing "Property" header). New approach iterates candidates by priority, scans all headers per candidate — more specific candidates win regardless of column order in the file |
| 2026-04-27 | findHeaderRow scans up to 10 rows for real header | AppFolio/Buildium exports often have 2–5 metadata rows (report title, date range, blank line) before actual column headers. Scanning ≥3 non-empty cells + ≥2 keyword matches reliably finds the real header row |
| 2026-04-27 | owner_name removed from criticalFields | AppFolio GL exports have no owner column — making it required blocked all GL-format files. Falls back to property name with a parse warning; old-style exports still map owner_name correctly when the column exists |
| 2026-04-27 | Logo in PDF was stored but never rendered | account.logo_url was uploaded to Supabase and saved to DB, but none of the 3 PDF templates referenced it — white-label feature was half-built. Fixed in all 3 templates. |
| 2026-04-27 | from_name/reply_to_email existed in DB but not used at send time | Both fields had settings UI and DB columns since Week 4 but send routes only queried firm_name. Closed the gap so PMs' custom sender name and reply-to address actually appear in owner emails |
