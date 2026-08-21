import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20260821120000_rename_cozinha_to_backoffice.sql");
const migration = readFileSync(migrationPath, "utf8");

describe("migração de renomeação para Backoffice", () => {
  it("renomeia o rótulo do enum sem recriar as colunas de perfil ou atribuições", () => {
    expect(migration).toContain("alter type public.user_role rename value ''cozinha'' to ''backoffice''");
    expect(migration).toContain("profiles.role e");
    expect(migration).toContain("profile_role_assignments.role passam a exibir backoffice automaticamente");
    expect(migration).not.toContain("drop table public.profiles");
    expect(migration).not.toContain("drop table public.profile_role_assignments");
  });

  it("é transacional, rejeita estados ambíguos e atualiza funções públicas legadas", () => {
    expect(migration).toMatch(/^begin;/);
    expect(migration).toMatch(/commit;\s*$/);
    expect(migration).toContain("user_role contém os rótulos cozinha e backoffice; a renomeação não é segura");
    expect(migration).toContain("pg_get_functiondef(p.oid) like '%cozinha%'");
    expect(migration).toContain("replace(function_definition, '''cozinha''', '''backoffice''')");
    expect(migration).toContain("função pública ainda referencia o papel técnico legado cozinha");
  });
});
