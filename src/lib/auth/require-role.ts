import { redirect } from "next/navigation";
import { canAccessRole } from "@/lib/auth/roles";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import type { UserRole } from "@/types/domain";

export async function requireRole(allowedRoles: readonly UserRole[]) {
  const supabase = await createServerAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", userId)
    .single();

  if (!profile || !canAccessRole(profile.role as UserRole, allowedRoles)) {
    redirect("/conta?acesso=negado");
  }

  return { supabase, profile, userId };
}
