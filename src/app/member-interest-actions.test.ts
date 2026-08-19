import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("member-interest server action contract", () => {
  it("does not export runtime values other than asynchronous server actions", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/member-interest-actions.ts"), "utf8");

    expect(source).toContain('"use server"');
    expect(source).toContain("export async function submitMemberInterest");
    expect(source).not.toMatch(/export\s+(?:const|let|var|class)\s+/);
    expect(source).not.toContain("initialMemberInterestState");
  });

  it("registra o diagnóstico de persistência sem incluir a carga do cadastro", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/member-interest-actions.ts"), "utf8");

    expect(source).toContain('console.error("[member-interest] persistence-failure"');
    expect(source).toContain("code: error.code ?? null");
    expect(source).toContain("details: error.details ?? null");
    expect(source).toContain("hint: error.hint ?? null");
    expect(source).not.toContain("email,\n      code:");
    expect(source).not.toContain("fullName,\n      code:");
  });

  it("registra o honeypot sem persistir um cadastro de interesse", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/member-interest-actions.ts"), "utf8");
    const honeypotGuard = source.indexOf('if (String(formData.get("company") ?? "").trim())');
    const memberInterestInsert = source.indexOf('service.from("member_interest_applications").insert');

    expect(honeypotGuard).toBeGreaterThan(-1);
    expect(memberInterestInsert).toBeGreaterThan(honeypotGuard);
    expect(source).toContain('registerAbuseEvent(service, "honeypot", ipHash)');
    expect(source).toContain('return { status: "success", message: "Recebemos seu interesse. Em breve entraremos em contato." }');
  });

  it("usa uma janela de dez tentativas por origem e retorna todas as falhas de validação", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/member-interest-actions.ts"), "utf8");
    expect(source).toContain("p_limit: MEMBER_INTEREST_RATE_LIMIT");
    expect(source).toContain("Muitas tentativas deste acesso. Aguarde uma hora antes de enviar novamente.");
    expect(source).toContain("validationMessages(parsed.error.issues)");
    expect(source).toContain('registerAbuseEvent(service, "validation_rejected", ipHash)');
  });
});
