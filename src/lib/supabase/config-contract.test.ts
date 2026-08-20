import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"] as const;
const originalValues = Object.fromEntries(supabaseKeys.map((key) => [key, process.env[key]]));

function resetSupabaseEnvironment(values: Partial<Record<(typeof supabaseKeys)[number], string>> = {}) {
  for (const key of supabaseKeys) {
    if (key in values) process.env[key] = values[key] as string;
    else delete process.env[key];
  }
  vi.resetModules();
}

afterEach(() => {
  for (const key of supabaseKeys) {
    const value = originalValues[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
});

describe("contrato de configuração Supabase", () => {
  it("considera a configuração pública pronta somente com URL e chave publicável", async () => {
    resetSupabaseEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    });

    const { env, hasSupabaseConfig } = await import("@/lib/env");

    expect(hasSupabaseConfig()).toBe(true);
    expect(env.supabaseUrl).toBe("https://example.supabase.co");
    expect(env.supabasePublishableKey).toBe("sb_publishable_test");
    expect(env.supabaseSecretKey).toBeUndefined();
  });

  it("recusa de forma explícita clientes público e privado quando as variáveis obrigatórias não existem", async () => {
    resetSupabaseEnvironment();

    const [{ createClient }, { createServiceClient }] = await Promise.all([
      import("@/lib/supabase/client"),
      import("@/lib/supabase/server"),
    ]);

    expect(() => createClient()).toThrow("Configuração pública do Supabase ausente.");
    expect(() => createServiceClient()).toThrow("Configuração privada do Supabase ausente.");
  });

  it("nunca expõe a chave privada na rota de configuração de navegador", async () => {
    resetSupabaseEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      SUPABASE_SECRET_KEY: "secret-value-must-not-be-exposed",
    });

    const { GET } = await import("@/app/api/public-config/route");
    const response = await GET();
    const payload = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      configured: true,
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
    expect(JSON.stringify(payload)).not.toContain("secret-value-must-not-be-exposed");
  });
});
