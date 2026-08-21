import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "src/app/admin/membros/page.tsx"), "utf8");
const membersStyles = readFileSync(resolve(process.cwd(), "src/app/members.css"), "utf8");
const erpStyles = readFileSync(resolve(process.cwd(), "src/app/erp.css"), "utf8");

describe("layout operacional de Pessoas", () => {
  it("apresenta uma tabela diária de segurança com leitura operacional", () => {
    expect(page).toContain("Histórico diário de bloqueios e validações da landing page.");
    expect(page).toContain("Total bloqueado");
    expect(page).toContain("Leitura operacional");
    expect(page).toContain("totalBlocked");
    expect(page).toContain("Nenhuma métrica de proteção foi registrada no período consultado.");
  });

  it("mantém a tabela rolável e as superfícies levemente arredondadas", () => {
    expect(membersStyles).toContain("overflow-x:auto");
    expect(membersStyles).toContain("border-radius:14px");
    expect(membersStyles).toContain("min-width:820px!important");
  });

  it("não corta a área de trabalho do ERP para acomodar tabelas largas", () => {
    expect(erpStyles).toContain(".erp-workspace { position:relative");
    expect(erpStyles).toContain("overflow:visible");
    expect(erpStyles).toContain(".erp-motion-workspace__content { position:relative; z-index:1; min-width:0; }");
  });
});
