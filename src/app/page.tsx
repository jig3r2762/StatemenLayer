import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { HeroDemo } from "./_components/HeroDemo";

/* ── Logo mark SVG (inline, for dark backgrounds) ── */
const LogoMark = () => (
  <svg width="26" height="26" viewBox="0 0 34 34" fill="none">
    <rect x="0" y="0" width="7" height="7" rx="1.5" fill="white" opacity="0.18"/>
    <rect x="11" y="0" width="14" height="7" rx="1.5" fill="white" opacity="0.18"/>
    <rect x="27" y="0" width="7" height="7" rx="1.5" fill="white" opacity="0.18"/>
    <rect x="0" y="11" width="7" height="7" rx="1.5" fill="white" opacity="0.35"/>
    <rect x="11" y="11" width="10" height="7" rx="1.5" fill="white" opacity="0.35"/>
    <rect x="23" y="11" width="11" height="7" rx="1.5" fill="white" opacity="0.35"/>
    <rect x="0" y="21" width="34" height="1" fill="white" opacity="0.15"/>
    <rect x="0" y="26" width="7" height="8" rx="1.5" fill="#F59E0B"/>
    <rect x="11" y="26" width="17" height="8" rx="1.5" fill="#F59E0B"/>
    <rect x="30" y="26" width="4" height="8" rx="1.5" fill="#F59E0B" opacity="0.5"/>
  </svg>
);

const FEATURES = [
  { id: "upload",   icon: "upload-cloud", title: "CSV upload & auto-detect",   desc: "Drag in your AppFolio or Buildium export. We recognize the format instantly — no column mapping on day one." },
  { id: "branding", icon: "palette",      title: "White-label branding",       desc: "Your logo, your colors, your footer on every PDF. Reports arrive looking like they came directly from you." },
  { id: "delivery", icon: "send",         title: "One-click batch send",       desc: "Send to all owners in one click. Each owner gets their own personalized, private, password-free report." },
  { id: "ai",       icon: "zap",          title: "Plain-English summaries",    desc: "Editable AI-written explanation per owner. Sends only after you approve — you stay in control of every word." },
  { id: "tracking", icon: "eye",          title: "Open tracking & alerts",     desc: "See who opened their report and when. Get notified after 48 hours if owners haven't viewed it yet." },
  { id: "owners",   icon: "users",        title: "Owner management",           desc: "Maintain a clean owner database with property addresses and layout preferences. No spreadsheet required." },
];

const TESTIMONIALS = [
  { initials: "CR", quote: "I used to spend 6–7 hours the first weekend of every month pulling AppFolio exports, reformatting in Excel, and emailing PDFs one by one. Now I upload the CSV, hit send, and I'm done in 15 minutes. My owners actually comment on how professional it looks.", name: "Casey Rourke", role: "Rourke Property Group · 47 units · Austin TX" },
  { initials: "TM", quote: "My owners were emailing me asking where their statements were because I kept falling behind. The first month I used StatementLayer I sent reports two days earlier than ever before. Haven't missed a deadline since.", name: "Tanya Morales", role: "Morales Realty · 83 units · San Diego CA" },
  { initials: "BK", quote: "The white-label piece was the deciding factor for me. My owners see my firm name and logo in every email and PDF. Two of them asked what software I upgraded to — I just said we made internal improvements.", name: "Brian Kowalski", role: "Kowalski PM · 61 units · Chicago IL" },
];

const PRICING = [
  {
    name: "Starter", price: "$79", period: "/mo", doors: "Up to 75 doors",
    features: ["10 owner profiles", "All core features", "30-day history", "Email support"],
    featured: false,
    btnClass: "outline",
  },
  {
    name: "Growth", price: "$149", period: "/mo", doors: "Up to 200 doors",
    features: ["Unlimited profiles", "White-label branding", "Web-view links", "12-month history", "Priority support"],
    featured: true,
    btnClass: "primary",
  },
  {
    name: "Agency", price: "$299", period: "/mo", doors: "Unlimited",
    features: ["5 user seats", "Custom email domain", "API access", "Dedicated onboarding"],
    featured: false,
    btnClass: "outline",
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FAF8F4", color: "#111827", fontFamily: "var(--font-dm-sans, system-ui, sans-serif)" }}>

      {/* ── Nav ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200, background: "rgba(10,15,30,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <LogoMark />
            <span style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: 18, color: "white", letterSpacing: "-0.2px" }}>StatementLayer</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[["#features", "Features"], ["#how", "How it works"], ["#pricing", "Pricing"]].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{label}</a>
            ))}
            <Link href="/sign-in" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Sign in</Link>
            <Link href="/sign-up" style={{ background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ background: "#0A0F1E", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 80% at 20% 50%, rgba(245,158,11,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 64, alignItems: "center", position: "relative" }}>
          {/* Left copy */}
          <div style={{ padding: "96px 0 80px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 18, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 20, height: 1, background: "#F59E0B", display: "inline-block" }} />
              For property managers
            </div>
            <h1 style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: "clamp(38px, 4.5vw, 58px)", color: "white", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 20 }}>
              Stop touching Excel<br />for <em style={{ color: "#F59E0B", fontStyle: "italic" }}>owner reports.</em>
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 36, fontWeight: 300, maxWidth: 420 }}>
              Upload your AppFolio or Buildium export. StatementLayer generates branded PDFs with financial commentary and delivers them to every owner — in under 2 minutes.
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <Link href="/sign-up" style={{ background: "#F59E0B", color: "#0A0F1E", borderRadius: 6, padding: "13px 28px", fontSize: 15, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
                Start free trial →
              </Link>
              <Link href="/demo" style={{ background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "13px 24px", fontSize: 15, fontWeight: 500, textDecoration: "none", display: "inline-block" }}>
                Try with your CSV →
              </Link>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 28 }}>No signup needed for the demo · 14-day free trial · no card required</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex" }}>
                {["CR","TM","BK","LN","+"].map((i, idx) => (
                  <div key={idx} style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid #0A0F1E", background: "#FEF3C7", color: "#92400E", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: idx === 0 ? 0 : -6 }}>{i}</div>
                ))}
              </div>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                <strong style={{ color: "rgba(255,255,255,0.7)" }}>200+ property managers</strong> already on autopilot
              </span>
            </div>
          </div>
          {/* Right: demo */}
          <div style={{ padding: "48px 0", height: 500, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", height: 460 }}>
              <HeroDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ background: "#FAF8F4", padding: "96px 32px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#D97706", marginBottom: 16 }}>Everything you need</div>
            <h2 style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: "clamp(32px, 4vw, 48px)", color: "#111827", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 16 }}>
              Built for property managers<br />who care about presentation.
            </h2>
            <p style={{ fontSize: 17, color: "#6B7280", lineHeight: 1.65, maxWidth: 520, fontWeight: 300 }}>
              StatementLayer handles the entire reporting workflow — from raw CSV to delivered report — in minutes.
            </p>
          </div>

          {/* Stat numbers + trust line */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", gap: 48, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                ["93 hrs", "saved per month on average"],
                ["67%",    "owner email open rate"],
                ["2.3×",   "faster than Excel workflows"],
              ].map(([n, l]) => (
                <div key={n}>
                  <div style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontSize: 26, fontWeight: 700, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>
              Every figure pulled directly from your AppFolio or Buildium export — never estimated, never modified.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {FEATURES.map(({ id, title, desc }) => (
              <div key={id} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 10, padding: 28, boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}>
                <div style={{ width: 40, height: 40, background: "#FEF3C7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {id === "upload"   && <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></>}
                    {id === "ai"       && <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>}
                    {id === "branding" && <><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>}
                    {id === "delivery" && <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>}
                    {id === "tracking" && <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    {id === "owners"   && <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>}
                  </svg>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ background: "white", padding: "96px 32px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#D97706", marginBottom: 16 }}>How it works</div>
            <h2 style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: "clamp(32px, 4vw, 48px)", color: "#111827", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              Three steps to cleaner<br />owner communication.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, position: "relative" }}>
            <div style={{ position: "absolute", top: 24, left: "calc(16.6% + 20px)", right: "calc(16.6% + 20px)", height: 1, background: "#E5E7EB" }} />
            {[
              { num: "01", title: "Upload your CSV", desc: "Export from AppFolio, Buildium, or any system. Drag it in. We auto-detect the format — no manual column mapping needed." },
              { num: "02", title: "Review & customize", desc: "Preview every report before sending. Add a personal note, verify the numbers, edit AI commentary if needed." },
              { num: "03", title: "Send in one click", desc: "Deliver branded reports to every owner simultaneously. Track opens and follow up with anyone who hasn't viewed it." },
            ].map(({ num, title, desc }) => (
              <div key={num} style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0A0F1E", color: "#F59E0B", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontFamily: "var(--font-jetbrains, monospace)", position: "relative", zIndex: 1 }}>
                  {num}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ background: "#FAF8F4", padding: "96px 32px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#D97706", marginBottom: 16 }}>From property managers</div>
            <h2 style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: "clamp(32px, 4vw, 48px)", color: "#111827", lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              They closed Excel.<br />They haven&apos;t opened it since.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {TESTIMONIALS.map(({ initials, quote, name, role }) => (
              <div key={name} style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 16, fontStyle: "italic" }}>&ldquo;{quote}&rdquo;</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#FEF3C7", color: "#92400E", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{name}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ background: "white", padding: "96px 32px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#D97706", marginBottom: 16 }}>Pricing</div>
            <h2 style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: "clamp(32px, 4vw, 48px)", color: "#111827", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 12 }}>Simple, honest pricing.</h2>
            <p style={{ fontSize: 17, color: "#6B7280", lineHeight: 1.65, fontWeight: 300, marginBottom: 16 }}>No per-report fees. No hidden charges. Pay monthly, cancel any time.</p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 6, padding: "8px 14px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: 13, color: "#92400E", fontWeight: 500 }}>Most managers save 8–10 hrs/month — Starter pays for itself in the first hour you don&apos;t spend in Excel.</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {PRICING.map(({ name, price, period, doors, features, featured }) => (
              <div key={name} style={{ background: featured ? "#0A0F1E" : "white", border: featured ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E5E7EB", borderRadius: 10, padding: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: featured ? "rgba(255,255,255,0.4)" : "#9CA3AF", marginBottom: 12 }}>{name}</div>
                <div style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: 42, color: featured ? "white" : "#111827", lineHeight: 1, marginBottom: 6 }}>{price}</div>
                <div style={{ fontSize: 13, color: featured ? "rgba(255,255,255,0.4)" : "#9CA3AF", marginBottom: 20 }}>{period} · {doors}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 24 }}>
                  {features.map((f) => (
                    <li key={f} style={{ fontSize: 13, color: featured ? "rgba(255,255,255,0.65)" : "#374151", padding: "6px 0", borderBottom: `1px solid ${featured ? "rgba(255,255,255,0.06)" : "#F9FAFB"}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0, color: featured ? "#F59E0B" : "#059669", marginTop: 1 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" style={{ display: "block", textAlign: "center", padding: 11, borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: "none", background: featured ? "#F59E0B" : "transparent", color: featured ? "#0A0F1E" : "#111827", border: featured ? "none" : "1px solid #E5E7EB" }}>
                  Get started free
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ background: "#FAF8F4", padding: "96px 32px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ background: "#0A0F1E", borderRadius: 12, padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(245,158,11,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
            <h2 style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: 42, color: "white", marginBottom: 16, letterSpacing: "-0.02em", position: "relative" }}>
              Close Excel.<br />Open StatementLayer.
            </h2>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", marginBottom: 12, position: "relative", fontWeight: 300 }}>
              14-day free trial. No credit card required. Setup in under 5 minutes.
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginBottom: 36, position: "relative" }}>
              Or try it first — upload a real CSV and see reports generated instantly, no account needed.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
              <Link href="/sign-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#F59E0B", color: "#0A0F1E", fontWeight: 700, padding: "14px 32px", borderRadius: 8, fontSize: 15, textDecoration: "none" }}>
                Start free trial →
              </Link>
              <Link href="/demo" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", fontWeight: 500, padding: "14px 28px", borderRadius: 8, fontSize: 15, textDecoration: "none" }}>
                Try the live demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#0A0F1E", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 32px 0" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 40 }}>
          {/* Brand */}
          <div style={{ maxWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <LogoMark />
              <span style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: 17, color: "white" }}>StatementLayer</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>Owner financial reporting for professional property managers across the US.</div>
          </div>
          {/* Links */}
          {[
            { heading: "Product",  links: [["#features", "Features"], ["#how", "How it works"], ["#pricing", "Pricing"]] },
            { heading: "Account",  links: [["/sign-in", "Sign in"], ["/sign-up", "Start free trial"]] },
            { heading: "Legal",    links: [["#", "Privacy"], ["#", "Terms"], ["#", "Security"]] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>{heading}</h4>
              {links.map(([href, label]) => (
                <a key={label} href={href} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 8 }}>{label}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1120, margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 0", display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
          <span>© {new Date().getFullYear()} StatementLayer, Inc. All rights reserved.</span>
          <span>Made for property managers.</span>
        </div>
      </footer>

    </div>
  );
}
