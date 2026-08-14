import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { listSymplaEvents, type SymplaEvent } from "@/lib/integrations/sympla";

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function normalizeSymplaEvent(event: SymplaEvent) {
  return {
    externalId: event.id,
    title: event.name,
    startsAt: event.start_date,
    endsAt: event.end_date ?? null,
    url: event.url,
    isPublished: event.published === 1,
    isCancelled: event.cancelled === 1,
    imageUrl: event.image ?? null,
  };
}

export async function syncSymplaEventCatalog(initiatedBy?: string, triggerSource: "manual" | "cron" | "replay" = "manual") {
  const supabase = createServiceClient();
  const { data: integration, error: integrationError } = await supabase
    .from("event_integrations")
    .upsert({ provider: "sympla", sync_mode: "read_only", is_enabled: true, created_by: initiatedBy ?? null }, { onConflict: "provider" })
    .select("id,sync_cursor")
    .single();
  if (integrationError || !integration) throw new Error("Não foi possível iniciar a integração Sympla.");

  const { data: run, error: runError } = await supabase
    .from("event_sync_runs")
    .insert({ integration_id: integration.id, initiated_by: initiatedBy ?? null, trigger_source: triggerSource, cursor_before: integration.sync_cursor ?? null })
    .select("id")
    .single();
  if (runError || !run) throw new Error("Não foi possível registrar a execução da sincronização.");

  try {
    const response = await listSymplaEvents(integration.sync_cursor ?? undefined);
    const rows = response.data.map((event) => {
      const normalized = normalizeSymplaEvent(event);
      return {
        integration_id: integration.id,
        record_type: "event",
        external_id: event.id,
        upstream_updated_at: event.start_date,
        content_hash: stableHash(normalized),
        normalized_data: normalized,
        raw_payload: event,
        observed_at: new Date().toISOString(),
      };
    });

    if (rows.length) {
      const { error } = await supabase.from("external_event_records").upsert(rows, { onConflict: "integration_id,record_type,external_id" });
      if (error) throw new Error("Não foi possível persistir os eventos retornados pela Sympla.");
    }

    const nextCursor = response.pagination?.next_cursor ?? null;
    await supabase.from("event_integrations").update({ sync_cursor: nextCursor, last_synced_at: new Date().toISOString(), last_sync_status: "succeeded" }).eq("id", integration.id);
    await supabase.from("event_sync_runs").update({ status: "succeeded", records_read: rows.length, records_upserted: rows.length, cursor_after: nextCursor, completed_at: new Date().toISOString() }).eq("id", run.id);
    await supabase.from("crm_activity_logs").insert({ actor_id: initiatedBy ?? null, actor_kind: initiatedBy ? "user" : "integration", action: "sympla.catalog_sync", outcome: "succeeded", resource_type: "event_integration", resource_id: integration.id, source: "external_sync", summary: `${rows.length} evento(s) consultado(s) da Sympla em modo de leitura`, metadata_json: { provider: "sympla", sync_run_id: run.id, records_read: rows.length } });
    return { integrationId: integration.id as string, syncRunId: run.id as string, recordsRead: rows.length, nextCursor };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 600) : "Falha desconhecida na sincronização Sympla.";
    await supabase.from("event_sync_runs").update({ status: "failed", error_code: "sympla_sync_failed", error_detail: message, completed_at: new Date().toISOString() }).eq("id", run.id);
    await supabase.from("event_sync_dead_letters").insert({ integration_id: integration.id, sync_run_id: run.id, phase: "fetch_events", error_code: "sympla_sync_failed", error_detail: message });
    await supabase.from("crm_activity_logs").insert({ actor_id: initiatedBy ?? null, actor_kind: initiatedBy ? "user" : "integration", action: "sympla.catalog_sync", outcome: "failed", resource_type: "event_integration", resource_id: integration.id, source: "external_sync", summary: "A sincronização de catálogo da Sympla falhou", metadata_json: { provider: "sympla", sync_run_id: run.id, error_code: "sympla_sync_failed" } });
    throw error;
  }
}
