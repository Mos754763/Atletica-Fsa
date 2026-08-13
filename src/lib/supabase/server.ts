import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function createServiceClient() {
  if (!env.supabaseUrl || !env.supabaseSecretKey) {
    throw new Error("Configuração privada do Supabase ausente.");
  }

  return createSupabaseClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
