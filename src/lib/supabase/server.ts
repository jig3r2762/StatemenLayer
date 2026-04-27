import { createClient } from "@supabase/supabase-js";

// Server-side admin client — bypasses RLS, use only in API routes.
// Uses SUPABASE_URL (no NEXT_PUBLIC_ prefix) so it is read from process.env
// at runtime, not inlined at build time by Next.js.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder"
);
