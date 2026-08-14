import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, hasSupabaseConfig } from "@/lib/env";
import { resolveSafeRedirectPath } from "@/lib/auth/redirect-path";

type AuthCookie = { name: string; value: string; options: Record<string, unknown> };

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = resolveSafeRedirectPath(requestUrl.searchParams.get("next"));

  if (!hasSupabaseConfig() || !env.supabaseUrl || !env.supabasePublishableKey) {
    return NextResponse.redirect(new URL("/login?erro=configuracao", requestUrl.origin));
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() { return request.headers.get("cookie")?.split("; ").map((entry) => { const [name, ...value] = entry.split("="); return { name, value: value.join("=") }; }) ?? []; },
      setAll(cookiesToSet: AuthCookie[]) { cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options as never)); },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }

  return NextResponse.redirect(new URL("/login?erro=autenticacao", requestUrl.origin));
}
