"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canMoveEventStatus } from "@/lib/events";
import { requireRole } from "@/lib/auth/require-role";
import type { EventState } from "@/types/domain";

const eventSchema = z.object({
  title: z.string().trim().min(3).max(160), description: z.string().trim().max(4000).optional(), venue: z.string().trim().max(180).optional(),
  startsAt: z.string().optional(), endsAt: z.string().optional(), capacity: z.coerce.number().int().positive().optional(), priceCents: z.coerce.number().int().min(0),
});
const eventStatusSchema = z.enum(["divulgando", "inscricoes_abertas", "em_andamento", "encerrado"]);
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export async function createEvent(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin"]);
  const values = eventSchema.parse({ title: formData.get("title"), description: formData.get("description") || undefined, venue: formData.get("venue") || undefined, startsAt: formData.get("startsAt") || undefined, endsAt: formData.get("endsAt") || undefined, capacity: formData.get("capacity") || undefined, priceCents: formData.get("priceCents") });
  const start = values.startsAt ? new Date(values.startsAt) : null; const end = values.endsAt ? new Date(values.endsAt) : null;
  if (start && Number.isNaN(start.valueOf())) throw new Error("Data inicial inválida."); if (end && Number.isNaN(end.valueOf())) throw new Error("Data final inválida."); if (start && end && end <= start) throw new Error("O encerramento precisa ser posterior ao início.");
  const slug = `${slugify(values.title)}-${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await supabase.from("events").insert({ title: values.title, slug, description: values.description || null, venue: values.venue || null, starts_at: start?.toISOString() ?? null, ends_at: end?.toISOString() ?? null, capacity: values.capacity ?? null, registration_price_cents: values.priceCents, requires_registration: formData.get("requiresRegistration") === "on", created_by: userId });
  if (error) throw new Error("Não foi possível criar o evento."); revalidatePath("/admin/eventos"); revalidatePath("/eventos");
}

export async function moveEventStatus(formData: FormData) {
  const { supabase } = await requireRole(["admin"]); const id = z.string().uuid().parse(formData.get("eventId")); const next = eventStatusSchema.parse(formData.get("nextStatus"));
  const { data: event } = await supabase.from("events").select("status").eq("id", id).single(); if (!event || !canMoveEventStatus(event.status as EventState, next)) throw new Error("Transição de status inválida.");
  const { error } = await supabase.from("events").update({ status: next }).eq("id", id); if (error) throw new Error("Não foi possível atualizar o status."); revalidatePath("/admin/eventos"); revalidatePath("/eventos");
}

export async function checkInRegistration(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin", "caixa"]); const code = z.string().trim().min(6).max(20).parse(formData.get("checkInCode")).toUpperCase();
  const { data: registration } = await supabase.from("event_registrations").select("id,status").eq("check_in_code", code).single(); if (!registration) throw new Error("Inscrição não localizada."); if (registration.status === "check_in_realizado") return;
  const { error } = await supabase.from("event_registrations").update({ status: "check_in_realizado", checked_in_at: new Date().toISOString(), checked_in_by: userId }).eq("id", registration.id); if (error) throw new Error("Não foi possível registrar o check-in."); revalidatePath("/admin/eventos");
}
