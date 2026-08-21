"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePresident } from "@/lib/auth/require-president";
import { env } from "@/lib/env";
import { assertMemberRolesChange } from "@/lib/members";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

const roleSchema = z.enum(["admin", "cozinha", "caixa", "cliente"]);
const rolesSchema = z.array(roleSchema).min(1, "Selecione ao menos uma atribuição.").transform((roles) => [...new Set(roles)]);
const memberInterestStatusSchema = z.enum(["novo", "em_contato", "convidado", "arquivado"]);
const inviteSchema = z.object({
  displayName: z.string().trim().min(2, "Informe o nome.").max(100),
  email: z.string().trim().email("Informe um e-mail válido.").max(255).transform((value) => value.toLowerCase()),
  roles: rolesSchema,
});

function userFacingAuthError(message: string) {
  if (/already been registered|already exists|already registered/i.test(message)) return "Este e-mail já possui uma conta. Atualize o papel na lista de membros.";
  return "Não foi possível enviar o convite. Revise os dados e a configuração de e-mail do Supabase.";
}

async function inviteRedirectUrl() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${protocol}://${host}/auth/callback?next=/conta` : `${env.appUrl}/auth/callback?next=/conta`;
}

export async function inviteMember(formData: FormData) {
  await requirePresident();
  const { userId } = await requirePresident();
  const values = inviteSchema.parse({ displayName: formData.get("displayName"), email: formData.get("email"), roles: formData.getAll("roles") });
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.inviteUserByEmail(values.email, {
    redirectTo: await inviteRedirectUrl(),
    data: { full_name: values.displayName, invited_by: "ATLETICA FSA" },
  });

  if (error || !data.user) throw new Error(userFacingAuthError(error?.message ?? ""));

  const { error: profileError } = await service.from("profiles").update({ display_name: values.displayName }).eq("id", data.user.id);
  if (profileError) throw new Error("O convite foi criado, mas não foi possível concluir o perfil de acesso. Tente novamente ou revise o perfil no Supabase.");
  const { error: removeDefaultError } = await service.from("profile_role_assignments").delete().eq("profile_id", data.user.id);
  if (removeDefaultError) throw new Error("O convite foi criado, mas não foi possível preparar as atribuições iniciais.");
  const { error: assignmentError } = await service.from("profile_role_assignments").insert(values.roles.map((role) => ({ profile_id: data.user.id, role, granted_by: userId })));
  if (assignmentError) throw new Error("O convite foi criado, mas não foi possível concluir as atribuições de acesso.");
  revalidatePath("/admin/membros");
  revalidatePath("/admin");
}

export async function updateMemberRoles(formData: FormData) {
  const { supabase, userId } = await requirePresident();
  const memberId = z.string().uuid().parse(formData.get("memberId"));
  const nextRoles = rolesSchema.parse(formData.getAll("roles"));
  const service = createServiceClient();
  const [{ data: member, error: memberError }, { data: currentAssignments, error: rolesError }, { data: adminAssignments, error: countError }] = await Promise.all([
    service.from("profiles").select("id").eq("id", memberId).single(),
    service.from("profile_role_assignments").select("role").eq("profile_id", memberId),
    service.from("profile_role_assignments").select("profile_id").eq("role", "admin"),
  ]);
  if (memberError || !member) throw new Error("Membro não localizado.");
  if (rolesError || countError) throw new Error("Não foi possível validar a proteção administrativa.");
  assertMemberRolesChange({ actorId: userId, targetId: member.id, currentRoles: (currentAssignments ?? []).map((assignment) => assignment.role as UserRole), nextRoles, adminCount: new Set((adminAssignments ?? []).map((assignment) => assignment.profile_id)).size });
  const { error } = await supabase.rpc("replace_profile_roles", { p_profile_id: member.id, p_roles: nextRoles });
  if (error) throw new Error("Não foi possível atualizar as atribuições deste membro.");
  revalidatePath("/admin/membros");
  revalidatePath("/admin");
}

export async function updateMemberInterestStatus(formData: FormData) {
  const { userId } = await requirePresident();
  const applicationId = z.string().uuid().parse(formData.get("applicationId"));
  const status = memberInterestStatusSchema.parse(formData.get("status"));
  const service = createServiceClient();
  const { error } = await service.from("member_interest_applications").update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", applicationId);
  if (error) throw new Error("Não foi possível atualizar o status deste cadastro.");
  revalidatePath("/admin/membros");
}
