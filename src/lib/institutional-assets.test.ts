import { describe, expect, it } from "vitest";
import { institutionalAsset } from "@/lib/institutional-assets";

describe("institutionalAsset", () => {
  it("resolve os banners WebP dos setores no Storage público institucional", () => {
    expect(institutionalAsset("atletica-fsa-setor-eventos.webp")).toBe(
      "https://tbxihkzuyzszrfxqmleq.supabase.co/storage/v1/object/public/catalog-assets/institutional/atletica-fsa-setor-eventos.webp",
    );
  });

  it("preserva caminhos internos de ativos institucionais", () => {
    expect(institutionalAsset("gestao-2026-clean/rafa.webp")).toBe(
      "https://tbxihkzuyzszrfxqmleq.supabase.co/storage/v1/object/public/catalog-assets/institutional/gestao-2026-clean/rafa.webp",
    );
  });
});
