import { redirect } from "next/navigation";
import { canAccessRoles, normalizeRoles } from "@/lib/auth/roles";
import { hasSupabaseConfig } from "@/lib/env";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import type { UserRole } from "@/types/domain";

export async function requireRole(allowedRoles: readonly UserRole[]) {
  if (!hasSupabaseConfig()) redirect("/login");

  const supabase = await createServerAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, is_president")
    .eq("id", userId)
    .single();

  const { data: assignedRoles } = profile ? await supabase.rpc("current_user_roles") : { data: [] as UserRole[] };
  const roles = normalizeRoles((assignedRoles ?? []) as UserRole[], profile?.role as UserRole | undefined);

  if (!profile || !canAccessRoles(roles, allowedRoles)) {
    if (profile) {
      await supabase.rpc("record_crm_access_denied", { p_allowed_roles: [...allowedRoles] });
    }
    redirect("/conta?acesso=negado");
  }

  return { supabase, profile: { ...profile, role: profile.role as UserRole, roles }, userId };
}
