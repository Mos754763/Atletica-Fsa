import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("migration de feedback do Resend", () => {
  const migration = readFileSync(path.join(process.cwd(), "supabase/migrations/20260830010456_resend_feedback_and_suppressions.sql"), "utf8");

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
});
