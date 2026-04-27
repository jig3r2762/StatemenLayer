"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Owner } from "@/types/database";

export function OwnersClient({ initialOwners }: { initialOwners: Owner[] }) {
  const router = useRouter();
  const [owners, setOwners] = useState<Owner[]>(initialOwners);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialOwners.slice(0, 5).forEach((o) => router.prefetch(`/dashboard/owners/${o.id}`));
  }, [initialOwners, router]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}?`)) return;
    const res = await fetch(`/api/owners/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOwners((prev) => prev.filter((o) => o.id !== id));
      setOpenMenuId(null);
    }
  }

  const filtered = owners.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase())
  );

  if (owners.length === 0) {
    return (
      <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, padding: "64px 18px", textAlign: "center", boxShadow: "0 1px 3px rgba(10,15,30,0.06)" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>No owners yet</p>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>Add your first investor owner to get started</p>
        <Link href="/dashboard/owners/new" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#F59E0B", color: "#0A0F1E", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          Add owner
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 1px 3px rgba(10,15,30,0.06)", overflow: "hidden" }}>
      {/* Search bar */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9CA3AF" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search owners…"
            style={{ width: "100%", padding: "7px 10px 7px 30px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, fontFamily: "var(--font-dm-sans, sans-serif)", outline: "none", color: "#111827", background: "#F9FAFB" }}
          />
        </div>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{filtered.length} owners</span>
      </div>

      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr style={{ background: "#FAFAFA" }}>
            {["Owner", "Email", "Property", "Reports sent", "Last sent", "Status", ""].map((h) => (
              <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9CA3AF", borderBottom: "1px solid #F3F4F6", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((owner) => {
            const initials = owner.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <tr key={owner.id} style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer" }} onClick={() => router.push(`/dashboard/owners/${owner.id}`)}>
                <td style={{ padding: "11px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FEF3C7", color: "#92400E", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{owner.name}</div>
                  </div>
                </td>
                <td style={{ padding: "11px 16px", fontSize: 13, color: "#6B7280" }}>{owner.email}</td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: "#9CA3AF", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {owner.property_address ?? <span style={{ color: "#D1D5DB" }}>—</span>}
                </td>
                <td style={{ padding: "11px 16px", fontSize: 13, fontFamily: "var(--font-jetbrains, monospace)", color: "#374151" }}>0</td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: "#9CA3AF", fontFamily: "var(--font-jetbrains, monospace)" }}>Never</td>
                <td style={{ padding: "11px 16px" }}>
                  <span style={{ fontSize: 11, fontWeight: 500, borderRadius: 9999, padding: "2px 8px", background: "#ECFDF5", color: "#047857" }}>Active</span>
                </td>
                <td style={{ padding: "11px 16px", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                  <div ref={openMenuId === owner.id ? menuRef : undefined} style={{ position: "relative", display: "inline-block" }}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === owner.id ? null : owner.id)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "1px solid #E5E7EB", borderRadius: 6, background: openMenuId === owner.id ? "#F9FAFB" : "white", cursor: "pointer", color: "#6B7280", fontSize: 16, lineHeight: 1 }}
                      aria-label="More options"
                    >
                      ···
                    </button>
                    {openMenuId === owner.id && (
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20, background: "white", border: "1px solid #E5E7EB", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 120, overflow: "hidden" }}>
                        <Link
                          href={`/dashboard/owners/${owner.id}`}
                          style={{ display: "block", padding: "8px 14px", fontSize: 13, color: "#374151", textDecoration: "none", fontFamily: "var(--font-dm-sans, sans-serif)" }}
                          onClick={() => setOpenMenuId(null)}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(owner.id, owner.name)}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans, sans-serif)" }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
