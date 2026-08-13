import { NextResponse } from "next/server";
import { env, hasSupabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!hasSupabaseConfig() || !env.supabaseUrl || !env.supabasePublishableKey) {
    return NextResponse.json({ configured: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { configured: true, url: env.supabaseUrl, publishableKey: env.supabasePublishableKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
