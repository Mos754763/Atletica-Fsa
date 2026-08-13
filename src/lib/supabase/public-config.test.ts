import { describe, expect, it } from "vitest";
import { isPublicSupabaseConfig } from "./public-config";

describe("isPublicSupabaseConfig", () => {
  it("aceita uma configuração pública válida", () => {
    expect(isPublicSupabaseConfig({ url: "https://example.supabase.co", publishableKey: "sb_publishable_12345678901234567890" })).toBe(true);
  });

  it("rejeita URLs inseguras ou chaves ausentes", () => {
    expect(isPublicSupabaseConfig({ url: "http://example.supabase.co", publishableKey: "sb_publishable_12345678901234567890" })).toBe(false);
    expect(isPublicSupabaseConfig({ url: "https://example.supabase.co", publishableKey: "" })).toBe(false);
  });
});
