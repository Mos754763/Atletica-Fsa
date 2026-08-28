import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260828120000_fix_rbac_capability_guards.sql"),
  "utf8",
);
const adminShell = readFileSync(resolve(process.cwd(), "src/lib/auth/require-admin-shell.ts"), "utf8");

describe("correção dos guards RBAC por capacidade", () => {
  it("mantém current_role apenas como compatibilidade sem promover papéis operacionais", () => {
    expect(migration).toMatch(/^begin;/);
    expect(migration).toMatch(/commit;\s*$/);
    expect(migration).toContain("create or replace function public.current_role()");
    expect(migration).toContain("when 'backoffice' then 3");
    expect(migration).not.toContain("then 'admin'::public.user_role");
  });

  it("autoriza pedidos somente para Admin ou Backoffice", () => {
    const orderGuard = "not public.has_any_role(array['admin', 'backoffice']::public.user_role[])";
    expect(migration.split(orderGuard)).toHaveLength(4);
    expect(migration).not.toContain("public.current_role() not in");
  });

  it("autoriza check-in somente para Admin ou Caixa", () => {
    expect(migration).toContain("not public.has_any_role(array['admin', 'caixa']::public.user_role[])");
  });

  it("preserva SECURITY DEFINER, search_path fixo e grants mínimos", () => {
    expect(migration.match(/security definer/g)).toHaveLength(5);
    expect(migration.match(/set search_path = public/g)).toHaveLength(5);
    expect(migration).toContain("revoke all on function public.check_in_event_ticket(text) from public, anon;");
    expect(migration).toContain("grant execute on function public.check_in_event_ticket(text) to authenticated;");
  });

  it("reconhece Backoffice no shell operacional do Next.js", () => {
    expect(adminShell).toContain('["admin", "caixa", "backoffice"]');
    expect(adminShell).not.toContain('"cozinha"');
  });
});
