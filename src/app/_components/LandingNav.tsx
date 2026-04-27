"use client";
import { useState } from "react";
import Link from "next/link";

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

const navLinks = [
  ["#features", "Features"],
  ["#how", "How it works"],
  ["#pricing", "Pricing"],
] as const;

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 200, background: "rgba(10,15,30,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <LogoMark />
          <span style={{ fontFamily: "var(--font-display-serif, Georgia, serif)", fontSize: 18, color: "white", letterSpacing: "-0.2px" }}>StatementLayer</span>
        </a>

        {/* Desktop nav links */}
        <div className="landing-nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {navLinks.map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{label}</a>
          ))}
          <Link href="/sign-in" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Sign in</Link>
          <Link href="/sign-up" style={{ background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Start free trial
          </Link>
        </div>

        {/* Mobile: CTA + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/sign-up"
            className="landing-nav-links"
            style={{ display: "none", background: "#F59E0B", color: "#0A0F1E", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            Sign up
          </Link>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              width: 36,
              height: 36,
              cursor: "pointer",
              color: "rgba(255,255,255,0.8)",
            }}
            className="landing-mobile-menu-btn"
          >
            {menuOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{
          background: "rgba(10,15,30,0.98)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          {navLinks.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", textDecoration: "none", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              {label}
            </a>
          ))}
          <a href="/sign-in" style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", textDecoration: "none", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Sign in</a>
          <Link
            href="/sign-up"
            style={{
              marginTop: 8,
              display: "block",
              textAlign: "center",
              background: "#F59E0B",
              color: "#0A0F1E",
              borderRadius: 6,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Start free trial →
          </Link>
        </div>
      )}
    </nav>
  );
}
