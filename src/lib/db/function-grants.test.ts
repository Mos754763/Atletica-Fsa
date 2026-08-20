import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260820100000_harden_privileged_function_grants.sql"),
  "utf8",
).replace(/\s+/g, " ").toLowerCase();

const privilegedFunctions = [
  "public.claim_email_outbox(integer)",
  "public.settle_paid_event_ticket(uuid, text, integer, jsonb)",
  "public.expire_stale_email_outbox()",
] as const;

describe("hardening dos grants de funções privilegiadas", () => {
  it.each(privilegedFunctions)("revoga EXECUTE público, anon e authenticated de %s", (signature) => {
    expect(migration).toContain(`revoke execute on function ${signature} from public;`);
    expect(migration).toContain(`revoke execute on function ${signature} from anon;`);
    expect(migration).toContain(`revoke execute on function ${signature} from authenticated;`);
  });

  it.each(privilegedFunctions)("mantém EXECUTE de %s somente para o worker service_role", (signature) => {
    expect(migration).toContain(`grant execute on function ${signature} to service_role;`);
    expect(migration).not.toContain(`grant execute on function ${signature} to anon;`);
    expect(migration).not.toContain(`grant execute on function ${signature} to authenticated;`);
    expect(migration).not.toContain(`grant execute on function ${signature} to public;`);
  });

  it("executa de forma transacional e documenta que rollback não reabre acesso público", () => {
    expect(migration).toContain("begin;");
    expect(migration).toContain("commit;");
    expect(migration).toContain("não restaurar execute a public, anon ou authenticated");
  });
});
