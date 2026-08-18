import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20260818190000_fix_checkin_registration_id_ambiguity.sql");
const migration = readFileSync(migrationPath, "utf8");

describe("migração corretiva do check-in", () => {
  it("qualifica registration_id de event_tickets para evitar colisão com o parâmetro OUT", () => {
    expect(migration).toContain("from public.event_tickets as ticket where ticket.registration_id = v_registration.id for update");
    expect(migration).not.toContain("from public.event_tickets where registration_id = v_registration.id for update");
  });

  it("mantém a transição atômica e idempotente do check-in", () => {
    expect(migration).toContain("if v_registration.status = 'check_in_realizado'");
    expect(migration).toContain("update public.event_registrations set status = 'check_in_realizado'");
    expect(migration).toContain("grant execute on function public.check_in_event_ticket(text) to authenticated;");
  });
});

