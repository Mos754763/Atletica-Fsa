import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20260818182000_fix_event_registration_enum.sql");
const migration = readFileSync(migrationPath, "utf8");

describe("migração corretiva da inscrição de eventos", () => {
  it("coage explicitamente os dois ramos do CASE para registration_status", () => {
    expect(migration).toContain("then 'pendente'::public.registration_status");
    expect(migration).toContain("else 'confirmada'::public.registration_status");
  });

  it("preserva execução autenticada e atômica da RPC de inscrição", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("for update");
    expect(migration).toContain("grant execute on function public.create_event_registration_ticket(uuid, uuid) to authenticated;");
  });
});

