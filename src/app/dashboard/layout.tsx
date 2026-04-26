import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardProgressBar } from "@/components/layout/DashboardProgressBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("firm_name, plan")
    .eq("clerk_user_id", userId!)
    .single();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#FAF8F4" }}>
      <Sidebar firmName={account?.firm_name ?? ""} plan={(account?.plan as string) ?? "starter"} />
      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {children}
        <DashboardProgressBar />
      </main>
    </div>
  );
}
