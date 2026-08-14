import { env, hasSupabaseConfig } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import type { EventState } from "@/types/domain";

export type FsaEvent = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  venue: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: EventState;
  registrationPriceCents: number;
  capacity: number | null;
  requiresRegistration: boolean;
  externalProvider: "sympla" | null;
  externalUrl: string | null;
  ticketLots: EventTicketLot[];
};

export type EventTicketLot = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  quantityTotal: number;
  quantitySold: number;
  maxPerCustomer: number;
};

type EventRow = {
  id: string; title: string; slug: string; description: string | null; cover_url: string | null; venue: string | null;
  starts_at: string | null; ends_at: string | null; status: EventState; registration_price_cents: number; capacity: number | null; requires_registration: boolean; external_provider: "sympla" | null; external_url: string | null;
};

type TicketLotRow = {
  id: string; event_id: string; name: string; description: string | null; price_cents: number; quantity_total: number; quantity_sold: number; max_per_customer: number;
};

export const EVENT_STATUS_LABEL: Record<EventState, string> = {
  divulgando: "Divulgando", inscricoes_abertas: "Inscrições abertas", em_andamento: "Em andamento", encerrado: "Encerrado",
};

export function canMoveEventStatus(current: EventState, next: EventState) {
  const flow: Record<EventState, EventState[]> = {
    divulgando: ["inscricoes_abertas"],
    inscricoes_abertas: ["em_andamento", "encerrado"],
    em_andamento: ["encerrado"],
    encerrado: [],
  };
  return flow[current].includes(next);
}

export function formatEventDate(value: string | null) {
  if (!value) return "Data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export async function getPublicEvents() {
  if (!hasSupabaseConfig() || !env.supabaseSecretKey) return [] as FsaEvent[];
  const supabase = createServiceClient();
  const { data } = await supabase.from("events").select("id,title,slug,description,cover_url,venue,starts_at,ends_at,status,registration_price_cents,capacity,requires_registration,external_provider,external_url").neq("status", "encerrado").order("starts_at", { ascending: true, nullsFirst: false }).returns<EventRow[]>();
  const events = data ?? [];
  const eventIds = events.map((event) => event.id);
  const now = new Date().toISOString();
  const { data: lotRows } = eventIds.length
    ? await supabase.from("event_ticket_lots").select("id,event_id,name,description,price_cents,quantity_total,quantity_sold,max_per_customer").in("event_id", eventIds).eq("is_active", true).or(`sales_start_at.is.null,sales_start_at.lte.${now}`).or(`sales_end_at.is.null,sales_end_at.gt.${now}`).returns<TicketLotRow[]>()
    : { data: [] as TicketLotRow[] };
  const lotsByEvent = new Map<string, EventTicketLot[]>();
  for (const lot of lotRows ?? []) {
    if (lot.quantity_sold >= lot.quantity_total) continue;
    const next = lotsByEvent.get(lot.event_id) ?? [];
    next.push({ id: lot.id, name: lot.name, description: lot.description, priceCents: lot.price_cents, quantityTotal: lot.quantity_total, quantitySold: lot.quantity_sold, maxPerCustomer: lot.max_per_customer });
    lotsByEvent.set(lot.event_id, next);
  }
  return events.map((event) => ({ id: event.id, title: event.title, slug: event.slug, description: event.description, coverUrl: event.cover_url, venue: event.venue, startsAt: event.starts_at, endsAt: event.ends_at, status: event.status, registrationPriceCents: event.registration_price_cents, capacity: event.capacity, requiresRegistration: event.requires_registration, externalProvider: event.external_provider, externalUrl: event.external_url, ticketLots: lotsByEvent.get(event.id) ?? [] }));
}
