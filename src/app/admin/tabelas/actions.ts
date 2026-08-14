"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminShell } from "@/lib/auth/require-admin-shell";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeBuilderRecord } from "@/lib/table-builder/record-values";
import { grantMatchesTable } from "@/lib/governance/table-grants";

const fieldTypes = ["text", "number", "date", "single_select", "multi_select", "person", "checkbox"] as const;
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9-]+)*$/, "Use letras minúsculas, números e hífens.").max(80);

async function assertTableAccess(tableId: string, action: "ver" | "criar" | "editar" | "apagar") {
  const session = await requireAdminShell();
  const service = createServiceClient();
  const { data: table } = await service.from("custom_tables").select("id,sector_id").eq("id", tableId).is("deleted_at", null).maybeSingle();
  if (!table) throw new Error("Tabela não encontrada.");
  if (session.profile.is_president) return { ...session, table, service };
  const [{ data: director }, { data: grants }] = await Promise.all([
    service.from("sector_memberships").select("id").eq("profile_id", session.userId).eq("sector_id", table.sector_id).eq("role", "diretor").is("ended_at", null).maybeSingle(),
    service.from("permission_grants").select("resource_key,sector_id,action").eq("profile_id", session.userId).eq("action", action).is("revoked_at", null),
  ]);
  const explicit = (grants ?? []).some((grant) => grantMatchesTable({ resourceKey: grant.resource_key, sectorId: grant.sector_id, action: grant.action }, table.id, table.sector_id, action));
  if (!director && !explicit) throw new Error("Você não possui esta permissão nesta tabela.");
  return { ...session, table, service };
}

function refresh() { revalidatePath("/admin/tabelas"); revalidatePath("/admin"); }

export async function createCustomTable(formData: FormData) {
  const session = await requireAdminShell();
  const values = z.object({ sectorId: z.string().uuid(), name: z.string().trim().min(2).max(80), slug, description: z.string().trim().max(300).optional() }).parse({ sectorId: formData.get("sectorId"), name: formData.get("name"), slug: formData.get("slug"), description: formData.get("description") || undefined });
  const service = createServiceClient();
  if (!session.profile.is_president) {
    const { data: director } = await service.from("sector_memberships").select("id").eq("profile_id", session.userId).eq("sector_id", values.sectorId).eq("role", "diretor").is("ended_at", null).maybeSingle();
    if (!director) throw new Error("Somente a direção do setor pode criar tabelas nele.");
  }
  const { error } = await service.from("custom_tables").insert({ sector_id: values.sectorId, name: values.name, slug: values.slug, description: values.description || null, created_by: session.userId, updated_by: session.userId });
  if (error) throw new Error(error.code === "23505" ? "Já existe uma tabela com este identificador no setor." : "Não foi possível criar a tabela.");
  refresh();
}

export async function createCustomField(formData: FormData) {
  const tableId = z.string().uuid().parse(formData.get("tableId")); const context = await assertTableAccess(tableId, "editar");
  const values = z.object({ name: z.string().trim().min(2).max(80), slug, fieldType: z.enum(fieldTypes), required: z.enum(["true", "false"]), options: z.string().trim().max(800).optional() }).parse({ name: formData.get("name"), slug: formData.get("slug"), fieldType: formData.get("fieldType"), required: formData.get("required") || "false", options: formData.get("options") || undefined });
  const { count } = await context.service.from("custom_table_fields").select("id", { count: "exact", head: true }).eq("table_id", tableId).is("deleted_at", null);
  const options = values.options?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  const { error } = await context.service.from("custom_table_fields").insert({ table_id: tableId, name: values.name, slug: values.slug, field_type: values.fieldType, is_required: values.required === "true", sort_order: count ?? 0, config_json: options.length ? { options } : {}, created_by: context.userId });
  if (error) throw new Error(error.code === "23505" ? "Este identificador de campo já existe." : "Não foi possível criar o campo.");
  refresh();
}

export async function createCustomRecord(formData: FormData) {
  const tableId = z.string().uuid().parse(formData.get("tableId")); const context = await assertTableAccess(tableId, "criar");
  const { data: fields } = await context.service.from("custom_table_fields").select("slug,field_type,is_required").eq("table_id", tableId).is("deleted_at", null).order("sort_order");
  const data = normalizeBuilderRecord((fields ?? []).map((field) => ({ slug: field.slug, fieldType: field.field_type as "text" | "number" | "date" | "single_select" | "multi_select" | "person" | "checkbox", required: field.is_required })), Object.fromEntries((fields ?? []).map((field) => [field.slug, formData.getAll(`field_${field.slug}`).map((value) => value.toString())])));
  const { error } = await context.service.from("custom_table_records").insert({ table_id: tableId, data_json: data, created_by: context.userId, updated_by: context.userId });
  if (error) throw new Error("Não foi possível salvar o registro.");
  refresh();
}

export async function trashCustomRecord(formData: FormData) {
  const tableId = z.string().uuid().parse(formData.get("tableId")); const recordId = z.string().uuid().parse(formData.get("recordId")); const context = await assertTableAccess(tableId, "apagar");
  const { error } = await context.service.from("custom_table_records").update({ deleted_at: new Date().toISOString(), deleted_by: context.userId, updated_by: context.userId }).eq("id", recordId).eq("table_id", tableId).is("deleted_at", null);
  if (error) throw new Error("Não foi possível mover o registro para a lixeira."); refresh();
}

export async function restoreCustomRecord(formData: FormData) {
  const tableId = z.string().uuid().parse(formData.get("tableId")); const recordId = z.string().uuid().parse(formData.get("recordId")); const context = await assertTableAccess(tableId, "editar");
  const { error } = await context.service.from("custom_table_records").update({ deleted_at: null, deleted_by: null, updated_by: context.userId }).eq("id", recordId).eq("table_id", tableId).not("deleted_at", "is", null);
  if (error) throw new Error("Não foi possível restaurar o registro."); refresh();
}

export async function createCustomView(formData: FormData) {
  const tableId = z.string().uuid().parse(formData.get("tableId")); const context = await assertTableAccess(tableId, "editar");
  const values = z.object({ name: z.string().trim().min(2).max(80), viewType: z.enum(["table", "kanban", "calendar", "gallery"]) }).parse({ name: formData.get("name"), viewType: formData.get("viewType") });
  const { error } = await context.service.from("custom_table_views").insert({ table_id: tableId, name: values.name, view_type: values.viewType, created_by: context.userId });
  if (error) throw new Error("Não foi possível criar a visão."); refresh();
}
