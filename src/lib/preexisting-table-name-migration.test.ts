import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("preexisting table_name cleanup migration", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260821190000_remove_preexisting_table_name.sql"),
    "utf8",
  );

  it("is idempotent when the artifact is absent", () => {
    expect(migration).toContain("target_table regclass := to_regclass('public.table_name')");
    expect(migration).toContain("if target_table is null then");
    expect(migration).toContain("no schema cleanup required");
  });

  it("fails closed instead of dropping a populated or referenced table", () => {
    expect(migration).toContain("select count(*)");
    expect(migration).toContain("if target_rows <> 0 then");
    expect(migration).toContain("constraint_ref.confrelid = target_table");
    expect(migration).toContain("dependent_relation.relkind in ('v', 'm')");
    expect(migration).toContain("using errcode = 'P0001'");
  });

  it("performs a precise drop without cascade and documents restoration", () => {
    expect(migration).toContain("drop table public.table_name;");
    expect(migration).not.toContain("drop table public.table_name cascade");
    expect(migration).toContain("Rollback reference");
    expect(migration).toContain("alter table public.table_name enable row level security;");
  });
});
