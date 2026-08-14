"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canMoveEventStatus } from "@/lib/events";
import { requireRole } from "@/lib/auth/require-role";
import { normalizeTicketCheckInCode } from "@/lib/events/tickets";
import type { EventState } from "@/types/domain";

const eventSchema = z.object({
  title: z.string().trim().min(3).max(160), description: z.string().trim().max(4000).optional(), venue: z.string().trim().max(180).optional(),
  startsAt: z.string().optional(), endsAt: z.string().optional(), capacity: z.coerce.number().int().positive().optional(), priceCents: z.coerce.number().int().min(0),
});
const eventStatusSchema = z.enum(["divulgando", "inscricoes_abertas", "em_andamento", "encerrado"]);
const ticketLotSchema = z.object({ eventId: z.string().uuid(), name: z.string().trim().min(2).max(120), description: z.string().trim().max(800).optional(), priceCents: z.coerce.number().int().min(0), quantityTotal: z.coerce.number().int().positive().max(100000), salesStartAt: z.string().optional(), salesEndAt: z.string().optional() });
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
  const { data: event } = await supabase.from("events").select("status,external_provider").eq("id", id).single(); if (!event || event.external_provider || !canMoveEventStatus(event.status as EventState, next)) throw new Error("Eventos espelhados da Sympla são atualizados pela origem externa.");
  const { error } = await supabase.from("events").update({ status: next }).eq("id", id); if (error) throw new Error("Não foi possível atualizar o status."); revalidatePath("/admin/eventos"); revalidatePath("/eventos");
}

export async function createTicketLot(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin"]);
  const values = ticketLotSchema.parse({ eventId: formData.get("eventId"), name: formData.get("name"), description: formData.get("description") || undefined, priceCents: formData.get("priceCents"), quantityTotal: formData.get("quantityTotal"), salesStartAt: formData.get("salesStartAt") || undefined, salesEndAt: formData.get("salesEndAt") || undefined });
  const start = values.salesStartAt ? new Date(values.salesStartAt) : null; const end = values.salesEndAt ? new Date(values.salesEndAt) : null;
  if ((start && Number.isNaN(start.valueOf())) || (end && Number.isNaN(end.valueOf())) || (start && end && end <= start)) throw new Error("Período do lote inválido.");
  const { data: event } = await supabase.from("events").select("external_provider").eq("id", values.eventId).single(); if (!event || event.external_provider) throw new Error("Eventos espelhados da Sympla não aceitam lotes internos.");
  const { error } = await supabase.from("event_ticket_lots").insert({ event_id: values.eventId, name: values.name, description: values.description || null, price_cents: values.priceCents, quantity_total: values.quantityTotal, sales_start_at: start?.toISOString() ?? null, sales_end_at: end?.toISOString() ?? null, is_active: false, created_by: userId });
  if (error) throw new Error("Não foi possível criar o lote de ingresso."); revalidatePath("/admin/eventos");
}

export async function setTicketLotActive(formData: FormData) {
  const { supabase } = await requireRole(["admin"]); const lotId = z.string().uuid().parse(formData.get("lotId")); const active = formData.get("active") === "true";
  const { data: lot } = await supabase.from("event_ticket_lots").select("id,event_id,quantity_total,quantity_sold,events(status,external_provider)").eq("id", lotId).single();
  const event = lot?.events as { status?: string; external_provider?: string | null } | null;
  if (!lot || event?.external_provider || (active && (event?.status !== "inscricoes_abertas" || lot.quantity_sold >= lot.quantity_total))) throw new Error("Este lote não pode ser publicado neste momento.");
  const { error } = await supabase.from("event_ticket_lots").update({ is_active: active }).eq("id", lotId); if (error) throw new Error("Não foi possível atualizar o lote."); revalidatePath("/admin/eventos"); revalidatePath("/eventos");
}

export async function checkInRegistration(formData: FormData) {
  const { supabase } = await requireRole(["admin", "caixa"]); const rawCode = z.string().trim().min(6).max(80).parse(formData.get("checkInCode")); const code = normalizeTicketCheckInCode(rawCode);
  const { error } = await supabase.rpc("check_in_event_ticket", { p_check_in_code: code }); if (error) throw new Error(error.message || "Não foi possível registrar o check-in."); revalidatePath("/admin/eventos");
}
