import { describe, expect, it } from "vitest";
import { normalizeBuilderRecord } from "./record-values";

describe("normalizeBuilderRecord", () => {
  const fields = [
    { slug: "titulo", fieldType: "text" as const, required: true },
    { slug: "prioridade", fieldType: "number" as const, required: false },
    { slug: "tags", fieldType: "multi_select" as const, required: false },
    { slug: "publicado", fieldType: "checkbox" as const, required: false },
  ];

  it("normaliza tipos da Etapa 1 sem armazenar campos vazios", () => {
    expect(normalizeBuilderRecord(fields, { titulo: ["Post da final"], prioridade: ["2"], tags: ["Instagram", "Feed"], publicado: ["on"] })).toEqual({ titulo: "Post da final", prioridade: 2, tags: ["Instagram", "Feed"], publicado: true });
  });

  it("rejeita a ausência de campo obrigatório", () => {
    expect(() => normalizeBuilderRecord(fields, { titulo: [""] })).toThrow("titulo");
  });
});
