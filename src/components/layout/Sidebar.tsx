"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { LayoutDashboard, UploadCloud, Users, FileText, Settings, ChevronsUpDown, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload",   label: "Upload CSV", icon: UploadCloud },
  { href: "/dashboard/owners",   label: "Owners",    icon: Users },
  { href: "/dashboard/batches",  label: "Reports",   icon: FileText },
  { href: "/dashboard/settings", label: "Settings",  icon: Settings },
];

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter plan",
  growth:  "Growth plan",
  agency:  "Agency plan",
};

interface SidebarProps {
  firmName: string;
  plan: string;
}

export function Sidebar({ firmName, plan }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.firstName?.[0]?.toUpperCase() ?? "U";

  const fullName =
    ([user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0]) ?? "User";

  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const firmInitial = firmName ? firmName.charAt(0).toUpperCase() : "A";

  return (
    <>
      {/* Mobile top bar — hidden on desktop via CSS */}
      <div
        className="sl-mobile-header"
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: "#0A0F1E",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          zIndex: 200,
          alignItems: "center",
          padding: "0 16px",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6, width: 32, height: 32,
            cursor: "pointer", color: "rgba(255,255,255,0.8)",
          }}
        >
          <Menu style={{ width: 16, height: 16 }} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="StatementLayer" style={{ height: 18, width: "auto" }} />
        <div style={{ width: 32 }} />
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 299,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sl-sidebar${mobileOpen ? " open" : ""}`}
        style={{
          background: "#0A0F1E",
          width: 220, minWidth: 220,
          display: "flex", flexDirection: "column",
          minHeight: "100vh",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {/* Logo row + mobile close button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="StatementLayer" style={{ height: 22, width: "auto" }} />
          <button
            className="sl-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            style={{
              display: "none", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, width: 28, height: 28,
              cursor: "pointer", color: "rgba(255,255,255,0.7)",
              flexShrink: 0,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Workspace selector */}
        <div style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, padding: "7px 10px", cursor: "pointer",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            <div
              style={{
                width: 22, height: 22, borderRadius: 4, background: "#F59E0B",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#0A0F1E", flexShrink: 0,
              }}
            >
              {firmInitial}
            </div>
            <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "white", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {firmName || "My Firm"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>
                {PLAN_LABELS[plan] ?? "Starter plan"}
              </div>
            </div>
            <ChevronsUpDown style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 16px", borderRadius: 6, margin: "1px 10px",
                  background: active ? "rgba(245,158,11,0.15)" : "transparent",
                  color: active ? "#F59E0B" : "rgba(255,255,255,0.6)",
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  transition: "all 150ms",
                  textDecoration: "none",
                }}
              >
                <Icon style={{ width: 16, height: 16, strokeWidth: active ? 2 : 1.5, flexShrink: 0 }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
            <div
              style={{
                width: 30, height: 30, borderRadius: "50%", background: "#1E2840",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600, color: "#F59E0B", flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "white", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fullName}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {email}
              </div>
            </div>
            <div style={{ flexShrink: 0, opacity: 0.5 }}>
              <UserButton appearance={{ elements: { avatarBox: "h-6 w-6" } }} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
