import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("página administrativa da Sympla", () => {
  it("explica que a integração importa dados para consulta e não envia eventos à Sympla", () => {
    expect(pageSource).toContain("Importação unidirecional de eventos para consulta interna");
    expect(pageSource).toContain("Não envia dados à Sympla nem produz impacto financeiro");
    expect(pageSource).not.toContain("Consulta de eventos em modo somente leitura");
  });
});
