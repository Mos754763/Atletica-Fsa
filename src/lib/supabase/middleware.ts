import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, hasSupabaseConfig } from "@/lib/env";

type AuthCookie = { name: string; value: string; options: Record<string, unknown> };

export async function refreshAuthSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabaseConfig() || !env.supabaseUrl || !env.supabasePublishableKey) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: AuthCookie[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options as never));
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}
