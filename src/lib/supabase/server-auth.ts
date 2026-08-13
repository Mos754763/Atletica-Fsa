import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, hasSupabaseConfig } from "@/lib/env";

type AuthCookie = { name: string; value: string; options: Record<string, unknown> };

export async function createServerAuthClient() {
  if (!hasSupabaseConfig() || !env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Configuração pública do Supabase ausente.");
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: AuthCookie[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as never));
        } catch {
          // Server Components cannot always mutate response cookies. The middleware refreshes them.
        }
      },
    },
  });
}
