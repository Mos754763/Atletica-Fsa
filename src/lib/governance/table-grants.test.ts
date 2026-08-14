import { describe, expect, it } from "vitest";
import { grantMatchesTable, isValidTableGrantScope } from "./table-grants";

const sector = "c98cba20-31d1-4e85-8bd3-864df6d51e56";
const otherSector = "5433499e-51e3-4ad9-b506-09fa5ea9c26e";
const table = "314594d8-45cb-4c88-ae8b-71500e51e4ea";

describe("escopo de grants para tabelas", () => {
  it("aceita somente grants do setor proprietário", () => {
    expect(grantMatchesTable({ resourceKey: "table:*", sectorId: sector, action: "ver" }, table, sector, "ver")).toBe(true);
    expect(grantMatchesTable({ resourceKey: "table:*", sectorId: otherSector, action: "ver" }, table, sector, "ver")).toBe(false);
    expect(grantMatchesTable({ resourceKey: "*", sectorId: null, action: "ver" }, table, sector, "ver")).toBe(false);
  });

  it("reconhece grant específico somente para a tabela alvo", () => {
    expect(grantMatchesTable({ resourceKey: `table:${table}`, sectorId: sector, action: "editar" }, table, sector, "editar")).toBe(true);
    expect(grantMatchesTable({ resourceKey: "table:06394a5a-88ba-44f4-9c5f-8d8d01eb1d6e", sectorId: sector, action: "editar" }, table, sector, "editar")).toBe(false);
  });

  it("exige setor e formato de recurso válidos", () => {
    expect(isValidTableGrantScope("table:*", sector)).toBe(true);
    expect(isValidTableGrantScope("table:*", undefined)).toBe(false);
    expect(isValidTableGrantScope(`table:${table}`, sector)).toBe(true);
    expect(isValidTableGrantScope("*", sector)).toBe(false);
  });
});
