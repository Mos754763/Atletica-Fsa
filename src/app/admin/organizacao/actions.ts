"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePresident } from "@/lib/auth/require-president";
import { PERMISSION_ACTIONS, SECTOR_MEMBERSHIP_ROLES } from "@/lib/governance/permissions";
import { isValidTableGrantScope } from "@/lib/governance/table-grants";
import { createServiceClient } from "@/lib/supabase/server";

const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens.").max(80);
const sectorSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do setor.").max(80),
  slug: slugSchema,
  description: z.string().trim().max(300).optional(),
});
const membershipSchema = z.object({
  sectorId: z.string().uuid(),
  profileId: z.string().uuid(),
  role: z.enum(SECTOR_MEMBERSHIP_ROLES),
  note: z.string().trim().max(250).optional(),
});
const grantSchema = z.object({
  sectorId: z.string().uuid().optional(),
  profileId: z.string().uuid(),
  resourceKey: z.string().trim().min(1).max(120),
  action: z.enum(PERMISSION_ACTIONS),
  note: z.string().trim().max(250).optional(),
});

function refreshGovernance() {
  revalidatePath("/admin/organizacao");
  revalidatePath("/admin/membros");
  revalidatePath("/admin");
}

export async function createSector(formData: FormData) {
  await requirePresident();
  const values = sectorSchema.parse({ name: formData.get("name"), slug: formData.get("slug"), description: formData.get("description") || undefined });
  const { error } = await createServiceClient().from("sectors").insert({ ...values, description: values.description || null });
  if (error) throw new Error(error.code === "23505" ? "Já existe um setor com este identificador." : "Não foi possível criar o setor.");
  refreshGovernance();
}

export async function setSectorStatus(formData: FormData) {
  await requirePresident();
  const sectorId = z.string().uuid().parse(formData.get("sectorId"));
  const isActive = z.enum(["true", "false"]).parse(formData.get("isActive")) === "true";
  const { error } = await createServiceClient().from("sectors").update({ is_active: isActive, deleted_at: isActive ? null : new Date().toISOString() }).eq("id", sectorId);
  if (error) throw new Error("Não foi possível atualizar o estado do setor.");
  refreshGovernance();
}

export async function assignSectorMember(formData: FormData) {
  const { userId } = await requirePresident();
  const values = membershipSchema.parse({ sectorId: formData.get("sectorId"), profileId: formData.get("profileId"), role: formData.get("role"), note: formData.get("note") || undefined });
  const service = createServiceClient();
  const { error } = await service.rpc("assign_sector_membership", { p_sector_id: values.sectorId, p_profile_id: values.profileId, p_role: values.role, p_actor_id: userId, p_note: values.note || null });
  if (error) throw new Error("Não foi possível atribuir o integrante ao setor. Revise se o setor ainda está ativo.");
  refreshGovernance();
}

export async function grantSectorPermission(formData: FormData) {
  const { userId } = await requirePresident();
  const values = grantSchema.parse({ sectorId: formData.get("sectorId") || undefined, profileId: formData.get("profileId"), resourceKey: formData.get("resourceKey"), action: formData.get("action"), note: formData.get("note") || undefined });
  const service = createServiceClient();
  if (!isValidTableGrantScope(values.resourceKey, values.sectorId)) throw new Error("Escolha uma tabela ou todas as tabelas de um setor específico.");
  if (values.resourceKey !== "table:*") {
    const tableId = values.resourceKey.slice("table:".length);
    const { data: table } = await service.from("custom_tables").select("sector_id").eq("id", tableId).is("deleted_at", null).maybeSingle();
    if (!table || table.sector_id !== values.sectorId) throw new Error("A tabela selecionada não pertence ao setor informado.");
  }
  let existingQuery = service.from("permission_grants").select("id").eq("profile_id", values.profileId).eq("resource_key", values.resourceKey).eq("action", values.action).is("revoked_at", null);
  existingQuery = values.sectorId ? existingQuery.eq("sector_id", values.sectorId) : existingQuery.is("sector_id", null);
  const { data: existing, error: lookupError } = await existingQuery.maybeSingle();
  if (lookupError) throw new Error("Não foi possível verificar a concessão atual.");
  const grant = { sector_id: values.sectorId || null, resource_key: values.resourceKey, action: values.action, note: values.note || null, granted_by: userId, revoked_at: null, revoked_by: null };
  const { error } = existing
    ? await service.from("permission_grants").update(grant).eq("id", existing.id)
    : await service.from("permission_grants").insert({ ...grant, profile_id: values.profileId });
  if (error) throw new Error("Não foi possível registrar a concessão de permissão.");
  refreshGovernance();
}

export async function revokeSectorPermission(formData: FormData) {
  const { userId } = await requirePresident();
  const grantId = z.string().uuid().parse(formData.get("grantId"));
  const { error } = await createServiceClient().from("permission_grants").update({ revoked_at: new Date().toISOString(), revoked_by: userId }).eq("id", grantId).is("revoked_at", null);
  if (error) throw new Error("Não foi possível revogar a permissão.");
  refreshGovernance();
}
