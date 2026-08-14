import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { listSymplaEvents, type SymplaEvent } from "@/lib/integrations/sympla";
import { sendSymplaSlackAlert, symplaAlertDedupeKey } from "@/lib/integrations/slack-alerts";

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

async function notifySymplaFailure(input: { integrationId: string; syncRunId: string; deadLetterId: string; errorCode: string }) {
  const supabase = createServiceClient();
  const { data: claim, error: claimError } = await supabase.rpc("claim_sympla_alert", {
    p_integration_id: input.integrationId,
    p_dead_letter_id: input.deadLetterId,
    p_dedupe_key: symplaAlertDedupeKey(input),
  }).maybeSingle<{ alert_id: string; claimed: boolean }>();
  if (claimError || !claim?.claimed) return { status: "duplicate" as const };

  const delivery = await sendSymplaSlackAlert(input);
  await supabase.rpc("finish_sympla_alert", {
    p_alert_id: claim.alert_id,
    p_status: delivery.status,
    p_error: "error" in delivery ? delivery.error : null,
  });
  await supabase.from("crm_activity_logs").insert({
    actor_kind: "integration",
    action: "sympla.alert_delivery",
    outcome: delivery.status === "sent" ? "succeeded" : delivery.status === "skipped" ? "ignored" : "failed",
    resource_type: "event_integration",
    resource_id: input.integrationId,
    source: "external_sync",
    summary: delivery.status === "sent" ? "Alerta Slack enviado para uma falha da Sympla" : `Alerta Slack ${delivery.status} para falha da Sympla`,
    metadata_json: { provider: "sympla", sync_run_id: input.syncRunId, dead_letter_id: input.deadLetterId, alert_status: delivery.status },
  });
  return delivery;
}

function symplaEventSlug(externalId: string) {
  const normalized = externalId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);
  return `sympla-${normalized || "evento"}`;
}

function symplaEventStatus(event: ReturnType<typeof normalizeSymplaEvent>) {
  if (event.isCancelled) return "encerrado";
  return event.isPublished ? "inscricoes_abertas" : "divulgando";
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
    const normalizedEvents = response.data.map((event) => {
      const normalized = normalizeSymplaEvent(event);
      return {
        event,
        normalized,
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

    const mirrorRows = normalizedEvents.map(({ normalized }) => ({
      title: normalized.title,
      slug: symplaEventSlug(normalized.externalId),
      description: "Evento publicado e gerenciado pela Sympla.",
      cover_url: normalized.imageUrl,
      starts_at: normalized.startsAt,
      ends_at: normalized.endsAt,
      status: symplaEventStatus(normalized),
      registration_price_cents: 0,
      requires_registration: false,
      external_provider: "sympla",
      external_event_id: normalized.externalId,
      external_url: normalized.url,
    }));

    let mirroredByExternalId = new Map<string, { id: string; external_event_id: string }>();
    if (mirrorRows.length) {
      const { data: mirroredEvents, error: mirrorError } = await supabase
        .from("events")
        .upsert(mirrorRows, { onConflict: "external_provider,external_event_id" })
        .select("id,external_event_id");
      if (mirrorError) throw new Error("Não foi possível espelhar os eventos retornados pela Sympla.");
      mirroredByExternalId = new Map((mirroredEvents ?? []).map((event) => [event.external_event_id as string, event as { id: string; external_event_id: string }]));

      const links = normalizedEvents.flatMap(({ normalized }) => {
        const internal = mirroredByExternalId.get(normalized.externalId);
        return internal ? [{ integration_id: integration.id, internal_event_id: internal.id, external_event_id: normalized.externalId, sync_direction: "inbound_read_only", status: "active", created_by: initiatedBy ?? null }] : [];
      });
      if (links.length) {
        const { error: linkError } = await supabase.from("event_external_links").upsert(links, { onConflict: "integration_id,external_event_id" });
        if (linkError) throw new Error("Não foi possível vincular os espelhos de eventos da Sympla.");
      }
    }

    const rows = normalizedEvents.map(({ event, normalized, ...record }) => ({
      ...record,
      normalized_data: normalized,
      raw_payload: event,
    }));
    if (rows.length) {
      const { error } = await supabase.from("external_event_records").upsert(rows, { onConflict: "integration_id,record_type,external_id" });
      if (error) throw new Error("Não foi possível persistir os eventos retornados pela Sympla.");
    }

    const nextCursor = response.pagination?.next_cursor ?? null;
    await supabase.from("event_integrations").update({ sync_cursor: nextCursor, last_synced_at: new Date().toISOString(), last_sync_status: "succeeded" }).eq("id", integration.id);
    await supabase.from("event_sync_runs").update({ status: "succeeded", records_read: rows.length, records_upserted: rows.length, cursor_after: nextCursor, completed_at: new Date().toISOString() }).eq("id", run.id);
    await supabase.from("crm_activity_logs").insert({ actor_id: initiatedBy ?? null, actor_kind: initiatedBy ? "user" : "integration", action: "sympla.catalog_sync", outcome: "succeeded", resource_type: "event_integration", resource_id: integration.id, source: "external_sync", summary: `${rows.length} evento(s) consultado(s) e ${mirroredByExternalId.size} espelhado(s) da Sympla`, metadata_json: { provider: "sympla", sync_run_id: run.id, records_read: rows.length, records_mirrored: mirroredByExternalId.size } });
    return { integrationId: integration.id as string, syncRunId: run.id as string, recordsRead: rows.length, recordsMirrored: mirroredByExternalId.size, nextCursor };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 600) : "Falha desconhecida na sincronização Sympla.";
    await supabase.from("event_sync_runs").update({ status: "failed", error_code: "sympla_sync_failed", error_detail: message, completed_at: new Date().toISOString() }).eq("id", run.id);
    const { data: deadLetter } = await supabase.from("event_sync_dead_letters").insert({ integration_id: integration.id, sync_run_id: run.id, phase: "fetch_events", error_code: "sympla_sync_failed", error_detail: message }).select("id").single();
    await supabase.from("crm_activity_logs").insert({ actor_id: initiatedBy ?? null, actor_kind: initiatedBy ? "user" : "integration", action: "sympla.catalog_sync", outcome: "failed", resource_type: "event_integration", resource_id: integration.id, source: "external_sync", summary: "A sincronização de catálogo da Sympla falhou", metadata_json: { provider: "sympla", sync_run_id: run.id, error_code: "sympla_sync_failed" } });
    if (deadLetter?.id) await notifySymplaFailure({ integrationId: integration.id, syncRunId: run.id, deadLetterId: deadLetter.id as string, errorCode: "sympla_sync_failed" });
    throw error;
  }
}

export async function replaySymplaDeadLetter(deadLetterId: string, initiatedBy: string) {
  const supabase = createServiceClient();
  const { data: claim, error: claimError } = await supabase.rpc("claim_sympla_dead_letter_replay", { p_dead_letter_id: deadLetterId }).maybeSingle<{ integration_id: string; claimed: boolean }>();
  if (claimError || !claim?.claimed) throw new Error("Esta ocorrência já foi resolvida ou está sendo reprocessada por outra pessoa.");

  try {
    const result = await syncSymplaEventCatalog(initiatedBy, "replay");
    await supabase.rpc("finish_sympla_dead_letter_replay", { p_dead_letter_id: deadLetterId, p_sync_run_id: result.syncRunId, p_succeeded: true, p_actor_id: initiatedBy });
    return result;
  } catch (error) {
    await supabase.rpc("finish_sympla_dead_letter_replay", { p_dead_letter_id: deadLetterId, p_sync_run_id: null, p_succeeded: false, p_actor_id: initiatedBy });
    throw error;
  }
}
