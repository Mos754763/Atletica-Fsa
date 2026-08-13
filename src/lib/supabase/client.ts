"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabaseConfig } from "@/lib/env";

export function createClient() {
  if (!hasSupabaseConfig() || !env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Configuração pública do Supabase ausente.");
  }

  return createBrowserClient(env.supabaseUrl, env.supabasePublishableKey);
}
