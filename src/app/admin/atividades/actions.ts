"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";

const expectationSchema = z.object({
  assignedTo: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  expectedAction: z.string().trim().min(3).max(160),
  dueAt: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

export async function createActivityExpectation(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin"]);
  const values = expectationSchema.parse({
    assignedTo: formData.get("assignedTo"),
    title: formData.get("title"),
    expectedAction: formData.get("expectedAction"),
    dueAt: formData.get("dueAt") || undefined,
    priority: formData.get("priority"),
  });
  const dueAt = values.dueAt ? new Date(values.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.valueOf())) throw new Error("Prazo inválido.");
  const { error } = await supabase.from("crm_activity_expectations").insert({
    assigned_to: values.assignedTo,
    created_by: userId,
    title: values.title,
    expected_action: values.expectedAction,
    due_at: dueAt?.toISOString() ?? null,
    priority: values.priority,
  });
  if (error) throw new Error("Não foi possível criar a obrigação.");
  revalidatePath("/admin/atividades");
}

export async function completeActivityExpectation(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin"]);
  const expectationId = z.string().uuid().parse(formData.get("expectationId"));
  const { error } = await supabase.from("crm_activity_expectations")
    .update({ completed_at: new Date().toISOString(), completed_by: userId })
    .eq("id", expectationId)
    .is("completed_at", null)
    .is("cancelled_at", null);
  if (error) throw new Error("Não foi possível concluir a obrigação.");
  revalidatePath("/admin/atividades");
}
