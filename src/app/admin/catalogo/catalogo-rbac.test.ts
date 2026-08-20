import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const catalogPage = readFileSync(resolve(process.cwd(), "src/app/admin/catalogo/page.tsx"), "utf8");
const catalogActions = readFileSync(resolve(process.cwd(), "src/app/admin/catalogo/actions.ts"), "utf8");

describe("RBAC do catálogo administrativo", () => {
  it("não expõe a rota de catálogo ao papel Caixa", () => {
    expect(catalogPage).toContain('requireRole(["admin"])');
    expect(catalogPage).not.toContain('requireRole(["admin", "caixa"])');
  });

  it("restringe todas as mutações de catálogo à Administração", () => {
    const adminGuards = catalogActions.match(/requireRole\(\["admin"\]\)/g) ?? [];

    expect(adminGuards).toHaveLength(9);
    expect(catalogActions).not.toContain('requireRole(["admin", "caixa"])');
  });
});
