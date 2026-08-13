"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabaseConfig } from "@/lib/env";
import { isPublicSupabaseConfig } from "./public-config";

export function createClient() {
  if (!hasSupabaseConfig() || !env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Configuração pública do Supabase ausente.");
  }

  return createBrowserClient(env.supabaseUrl, env.supabasePublishableKey);
}

export async function getBrowserClient() {
  if (hasSupabaseConfig() && env.supabaseUrl && env.supabasePublishableKey) return createClient();

  const response = await fetch("/api/public-config", { cache: "no-store" });
  const config: unknown = await response.json();
  if (!response.ok || !isPublicSupabaseConfig(config)) {
    throw new Error("A configuração de acesso ainda não está disponível neste deployment. Atualize a página após o redeploy.");
  }
  return createBrowserClient(config.url, config.publishableKey);
}
