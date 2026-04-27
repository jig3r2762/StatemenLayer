import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Plus } from "lucide-react";
import { OwnersClient } from "./OwnersClient";

async function getOwners(userId: string) {
  const { data: account } = await supabaseAdmin.from("accounts").select("id, plan").eq("clerk_user_id", userId).single();
  if (!account) return { owners: [], plan: "starter" };
  const { data: owners } = await supabaseAdmin.from("owners").select("*").eq("account_id", account.id).eq("active", true).order("name", { ascending: true });
  return { owners: owners ?? [], plan: account.plan };
}

export default async function OwnersPage() {
  const { userId } = await auth();
  const { owners, plan } = await getOwners(userId!);

  return (
    <div style={{ flex: 1 }}>
      <Header
        title="Owners"
        actions={
          <Link
            href="/dashboard/owners/new"
            prefetch={true}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#F59E0B", color: "#0A0F1E", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "var(--font-dm-sans, sans-serif)" }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add owner
          </Link>
        }
      />
      <div className="px-page" style={{ padding: "0 32px 32px" }}>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
          <span style={{ fontWeight: 600, color: "#111827" }}>{owners.length}</span> active owner{owners.length !== 1 ? "s" : ""}
          {plan === "starter" && <span style={{ color: "#9CA3AF" }}> · 10 max on Starter plan</span>}
        </p>
        <OwnersClient initialOwners={owners} />
      </div>
    </div>
  );
}
