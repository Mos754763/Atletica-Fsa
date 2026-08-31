import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("migration de feedback do Resend", () => {
  const migration = readFileSync(path.join(process.cwd(), "supabase/migrations/20260903170000_resend_feedback_and_suppressions.sql"), "utf8");

  it("deduplica pelo id do webhook e trata eventos fora de ordem", () => {
    expect(migration).toContain("unique(provider, event_id)");
    expect(migration).toContain("on conflict (provider, event_id) do nothing");
    expect(migration).toContain("reconcile_resend_email_delivery");
    expect(migration).toContain("max(occurred_at) filter");
  });

  it("restringe ingestão ao service role e mantém leitura sob RLS", () => {
    expect(migration).toContain("alter table public.email_webhook_events enable row level security");
    expect(migration).toContain("alter table public.email_suppressions enable row level security");
    expect(migration).toContain("grant execute on function public.ingest_resend_email_event(text, text, text, timestamptz, text, jsonb) to service_role");
    expect(migration).toContain("revoke all on function public.ingest_resend_email_event(text, text, text, timestamptz, text, jsonb) from public, anon, authenticated");
  });

  it("não esconde colisões ao finalizar uma entrega", () => {
    const finish = migration.split("create or replace function public.finish_email_outbox_delivery(")[1];
    expect(finish).toContain("insert into public.email_deliveries");
    expect(finish).not.toContain("on conflict do nothing");
  });

  it("coordena webhook e finalização pelo mesmo lock antes das escritas", () => {
    const ingest = migration.split("create or replace function public.ingest_resend_email_event(")[1].split("$$;")[0];
    const finish = migration.split("create or replace function public.finish_email_outbox_delivery(")[1].split("$$;")[0];
    for (const [body, write] of [[ingest, "insert into public.email_webhook_events"], [finish, "update public.email_outbox"]]) {
      expect(body).toContain("pg_catalog.hashtextextended('resend-message:' || p_provider_message_id, 0)");
      const lock = body.indexOf("pg_catalog.pg_advisory_xact_lock");
      expect(lock).toBeGreaterThanOrEqual(0);
      expect(lock).toBeLessThan(body.indexOf(write));
    }
  });
});
