import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { OwnerForm } from "@/components/owners/OwnerForm";

async function getOwner(userId: string, ownerId: string) {
  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!account) return null;

  const { data: owner } = await supabaseAdmin
    .from("owners")
    .select("*")
    .eq("id", ownerId)
    .eq("account_id", account.id)
    .single();

  return owner ?? null;
}

export default async function EditOwnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  const owner = await getOwner(userId!, id);

  if (!owner) notFound();

  return (
    <div style={{ flex: 1 }}>
      <Header title={`Edit: ${owner.name}`} />
      <div style={{ padding: "0 32px 32px" }}>
        <OwnerForm initialData={owner} ownerId={owner.id} />
      </div>
    </div>
  );
}
