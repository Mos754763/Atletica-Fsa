import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20260820210000_profile_role_assignments.sql");
const migration = readFileSync(migrationPath, "utf8");

describe("migração de atribuições cumulativas", () => {
  it("preserva o papel legada e cria uma tabela de atribuições com unicidade", () => {
    expect(migration).toContain("create table if not exists public.profile_role_assignments");
    expect(migration).toContain("primary key (profile_id, role)");
    expect(migration).toContain("insert into public.profile_role_assignments(profile_id, role)");
    expect(migration).toContain("on conflict (profile_id, role) do nothing");
  });

  it("redefine os helpers de RLS pela união de atribuições", () => {
    expect(migration).toContain("create or replace function public.current_user_roles()");
    expect(migration).toContain("create or replace function public.has_any_role(p_roles public.user_role[])");
    expect(migration).toContain("create or replace function public.is_admin()");
    expect(migration).toContain("create or replace function public.is_staff()");
    expect(migration).toContain("create or replace function public.can_manage_catalog()");
    expect(migration).toContain("when public.has_any_role(array['caixa', 'cozinha']::public.user_role[]) then 'admin'::public.user_role");
  });

  it("mantém a troca de atribuições restrita à Presidência e preserva o último administrador", () => {
    expect(migration).toContain("create or replace function public.replace_profile_roles");
    expect(migration).toContain("actor.is_president = true");
    expect(migration).toContain("perform pg_advisory_xact_lock(hashtext('atletica-fsa:profile-role-admin-invariant'))");
    expect(migration).toContain("A plataforma precisa manter ao menos um administrador.");
    expect(migration).toContain("grant execute on function public.replace_profile_roles(uuid, public.user_role[]) to authenticated");
  });
});
