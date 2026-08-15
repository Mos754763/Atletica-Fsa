"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePresident } from "@/lib/auth/require-president";
import { createServiceClient } from "@/lib/supabase/server";

const templateSchema = z.object({ id: z.string().uuid(), subject: z.string().trim().min(3).max(180), headline: z.string().trim().min(2).max(160), message: z.string().trim().min(3).max(6_000), buttonLabel: z.string().trim().max(80).optional() });
const ruleSchema = z.object({
  name: z.string().trim().min(3).max(120),
  sectorId: z.string().uuid().optional(),
  triggerKey: z.literal("order.status_changed"),
  conditionField: z.string().trim().max(80).optional(),
  conditionEquals: z.string().trim().max(120).optional(),
  actionType: z.enum(["queue_email", "log"]),
  templateKey: z.string().trim().max(80).optional(),
});

function refresh() { revalidatePath("/admin/automacoes"); revalidatePath("/admin"); }
function escapeEmailHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function buildEmailHtml(headline: string, message: string, buttonLabel?: string) {
  const safeHeadline = escapeEmailHtml(headline);
  const safeMessage = escapeEmailHtml(message).replace(/\r?\n/g, "<br />");
  const action = buttonLabel ? `<p style="margin:28px 0 0"><span style="display:inline-block;background:#0B3D91;color:#ffffff;border-radius:8px;padding:12px 18px;font-weight:700">${escapeEmailHtml(buttonLabel)}</span></p>` : "";
  return `<div style="font-family:Arial,sans-serif;color:#0B234C;line-height:1.55"><h1 style="margin:0 0 16px;font-size:24px">${safeHeadline}</h1><p style="margin:0">${safeMessage}</p>${action}</div>`;
}

export async function saveEmailTemplate(formData: FormData) {
  const { userId } = await requirePresident();
  const values = templateSchema.parse({ id: formData.get("id"), subject: formData.get("subject"), headline: formData.get("headline"), message: formData.get("message"), buttonLabel: formData.get("buttonLabel") || undefined });
  const { error } = await createServiceClient().from("email_templates").update({ subject_template: values.subject, html_template: buildEmailHtml(values.headline, values.message, values.buttonLabel), updated_by: userId }).eq("id", values.id).is("deleted_at", null);
  if (error) throw new Error("Não foi possível salvar o template de e-mail.");
  refresh();
}

export async function createAutomationRule(formData: FormData) {
  const { userId } = await requirePresident();
  const values = ruleSchema.parse({ sectorId: formData.get("sectorId") || undefined, name: formData.get("name"), triggerKey: formData.get("triggerKey"), conditionField: formData.get("conditionField") || undefined, conditionEquals: formData.get("conditionEquals") || undefined, actionType: formData.get("actionType"), templateKey: formData.get("templateKey") || undefined });
  if (values.actionType === "queue_email" && !values.templateKey) throw new Error("Selecione o template para a ação de e-mail.");
  const { error } = await createServiceClient().from("automation_rules").insert({ sector_id: values.sectorId ?? null, name: values.name, trigger_key: values.triggerKey, condition_json: values.conditionField ? { field: values.conditionField, equals: values.conditionEquals ?? "" } : {}, action_json: values.actionType === "queue_email" ? { type: "queue_email", templateKey: values.templateKey, recipientField: "recipientEmail" } : { type: "log" }, created_by: userId, updated_by: userId });
  if (error) throw new Error("Não foi possível criar a automação.");
  refresh();
}

export async function toggleAutomationRule(formData: FormData) {
  const { userId } = await requirePresident();
  const id = z.string().uuid().parse(formData.get("id"));
  const enabled = z.enum(["true", "false"]).parse(formData.get("enabled")) === "true";
  const { error } = await createServiceClient().from("automation_rules").update({ enabled, updated_by: userId }).eq("id", id).is("deleted_at", null);
  if (error) throw new Error("Não foi possível atualizar o estado da automação.");
  refresh();
}
