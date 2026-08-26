import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isAuthorizedCronRequest } from "@/lib/api/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const startedAt = Date.now();
  const supabase = createServiceClient();
  try {
    const { data, error } = await supabase.rpc("cleanup_member_interest_abuse_data", { p_event_retention_days: 30, p_counter_retention_hours: 2 }).maybeSingle<{ deleted_events: number; deleted_rate_limit_windows: number }>();
    if (error) throw new Error("Não foi possível executar a retenção dos eventos de abuso.");
    await supabase.from("scheduled_route_heartbeats").insert({ route_path: "/api/cron/member-interest-retention", status: "succeeded", duration_ms: Date.now() - startedAt });
    return NextResponse.json({ ok: true, retention: { eventsDays: 30, countersHours: 2, deletedEvents: data?.deleted_events ?? 0, deletedRateLimitWindows: data?.deleted_rate_limit_windows ?? 0 } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 600) : "Falha desconhecida na retenção dos eventos de abuso.";
    await supabase.from("scheduled_route_heartbeats").insert({ route_path: "/api/cron/member-interest-retention", status: "failed", duration_ms: Date.now() - startedAt, detail });
    return NextResponse.json({ error: "A limpeza dos eventos de abuso falhou; consulte os logs." }, { status: 503 });
  }
}
