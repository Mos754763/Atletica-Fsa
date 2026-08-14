import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

export async function requirePresident() {
  const supabase = await createServerAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, is_president")
    .eq("id", userId)
    .single();
  if (!profile?.is_president) redirect("/conta?acesso=negado");

  return { supabase, profile, userId };
}
