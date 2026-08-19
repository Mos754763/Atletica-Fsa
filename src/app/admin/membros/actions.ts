"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePresident } from "@/lib/auth/require-president";
import { env } from "@/lib/env";
import { assertMemberRoleChange } from "@/lib/members";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

const roleSchema = z.enum(["admin", "cozinha", "caixa", "cliente"]);
const memberInterestStatusSchema = z.enum(["novo", "em_contato", "convidado", "arquivado"]);
const inviteSchema = z.object({
  displayName: z.string().trim().min(2, "Informe o nome.").max(100),
  email: z.string().trim().email("Informe um e-mail válido.").max(255).transform((value) => value.toLowerCase()),
  role: roleSchema,
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
  const values = inviteSchema.parse({ displayName: formData.get("displayName"), email: formData.get("email"), role: formData.get("role") });
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.inviteUserByEmail(values.email, {
    redirectTo: await inviteRedirectUrl(),
    data: { full_name: values.displayName, invited_by: "ATLETICA FSA" },
  });

  if (error || !data.user) throw new Error(userFacingAuthError(error?.message ?? ""));

  const { error: profileError } = await service.from("profiles").update({ display_name: values.displayName, role: values.role }).eq("id", data.user.id);
  if (profileError) throw new Error("O convite foi criado, mas não foi possível concluir o papel de acesso. Tente novamente ou revise o perfil no Supabase.");
  revalidatePath("/admin/membros");
  revalidatePath("/admin");
}

export async function updateMemberRole(formData: FormData) {
  const { userId } = await requirePresident();
  const memberId = z.string().uuid().parse(formData.get("memberId"));
  const nextRole = roleSchema.parse(formData.get("role"));
  const service = createServiceClient();
  const [{ data: member, error: memberError }, { count: adminCount, error: countError }] = await Promise.all([
    service.from("profiles").select("id,role").eq("id", memberId).single(),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
  ]);
  if (memberError || !member) throw new Error("Membro não localizado.");
  if (countError) throw new Error("Não foi possível validar a proteção administrativa.");
  assertMemberRoleChange({ actorId: userId, targetId: member.id, currentRole: member.role as UserRole, nextRole, adminCount: adminCount ?? 0 });
  const { error } = await service.from("profiles").update({ role: nextRole }).eq("id", memberId);
  if (error) throw new Error("Não foi possível atualizar o papel deste membro.");
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
