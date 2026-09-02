import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const actions = readFileSync(resolve(process.cwd(), "src/app/admin/catalogo/actions.ts"), "utf8");
const page = readFileSync(resolve(process.cwd(), "src/app/admin/catalogo/page.tsx"), "utf8");
const nextConfig = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");

describe("segurança operacional do upload do catálogo", () => {
  it("deixa folga entre o arquivo aceito e os limites de transporte", () => {
    expect(nextConfig).toContain('bodySizeLimit: "4mb"');
    expect(page).toContain("até 3 MB");
    expect(page).not.toContain("até 5 MB");
  });

  it("remove o produto incompleto antes de limpar o objeto enviado", () => {
    const rollback = actions.indexOf('from("products").delete().eq("id", product.id)');
    const storageCleanup = actions.indexOf("await deleteCatalogImages([uploadedStorageKey])");
    expect(rollback).toBeGreaterThan(-1);
    expect(storageCleanup).toBeGreaterThan(rollback);
  });
});
