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
};

type EventRow = {
  id: string; title: string; slug: string; description: string | null; cover_url: string | null; venue: string | null;
  starts_at: string | null; ends_at: string | null; status: EventState; registration_price_cents: number; capacity: number | null; requires_registration: boolean;
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
  const { data } = await supabase.from("events").select("id,title,slug,description,cover_url,venue,starts_at,ends_at,status,registration_price_cents,capacity,requires_registration").neq("status", "encerrado").order("starts_at", { ascending: true, nullsFirst: false }).returns<EventRow[]>();
  return (data ?? []).map((event) => ({ id: event.id, title: event.title, slug: event.slug, description: event.description, coverUrl: event.cover_url, venue: event.venue, startsAt: event.starts_at, endsAt: event.ends_at, status: event.status, registrationPriceCents: event.registration_price_cents, capacity: event.capacity, requiresRegistration: event.requires_registration }));
}
