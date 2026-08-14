import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

export async function requireAdminShell() {
  const supabase = await createServerAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id,email,display_name,role,is_president").eq("id", userId).single();
  if (!profile) redirect("/conta?acesso=negado");
  const service = createServiceClient();
  const [{ data: directorMembership }, { data: tableGrant }] = await Promise.all([
    service.from("sector_memberships").select("id").eq("profile_id", userId).eq("role", "diretor").is("ended_at", null).limit(1),
    service.from("permission_grants").select("id").eq("profile_id", userId).eq("action", "ver").is("revoked_at", null).like("resource_key", "table:%").limit(1),
  ]);
  const isOperational = ["admin", "caixa", "cozinha"].includes(profile.role);
  const canAccessBuilder = Boolean(profile.is_president || (directorMembership?.length ?? 0) || (tableGrant?.length ?? 0));
  if (!isOperational && !canAccessBuilder) redirect("/conta?acesso=negado");
  return { userId, profile: { ...profile, role: profile.role as UserRole }, canAccessBuilder };
}
