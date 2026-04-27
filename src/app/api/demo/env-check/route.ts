import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING").slice(0, 45),
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && process.env.SUPABASE_SERVICE_ROLE_KEY !== "placeholder",
    serviceKeyPrefix: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING").slice(0, 12),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    clerkKeyPrefix: (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "MISSING").slice(0, 12),
    nodeEnv: process.env.NODE_ENV,
  });
}
