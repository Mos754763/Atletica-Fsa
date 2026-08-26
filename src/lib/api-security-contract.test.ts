import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checkoutResumeSource = readFileSync(new URL("../app/api/checkout/resume/route.ts", import.meta.url), "utf8");
const odsOrdersSource = readFileSync(new URL("../app/api/ods/orders/route.ts", import.meta.url), "utf8");
const exportSource = readFileSync(new URL("../app/api/admin/export/route.ts", import.meta.url), "utf8");
const apiAuthSource = readFileSync(new URL("./api/auth.ts", import.meta.url), "utf8");
const apiSources = [checkoutResumeSource, odsOrdersSource, exportSource];

describe("contratos de segurança das APIs operacionais", () => {
  it("mantém a retomada de checkout vinculada ao proprietário autenticado", () => {
    expect(checkoutResumeSource).toContain('.eq("customer_id", auth.profile.id)');
    expect(checkoutResumeSource).toContain("getApiProfile(request)");
  });

  it("valida o bearer token no Supabase antes de consultar perfil e papéis", () => {
    expect(apiAuthSource).toContain("supabase.auth.getUser(token)");
    expect(apiAuthSource).toContain('request.headers.get("authorization")');
    expect(apiAuthSource).toContain('select("id,email,display_name,role")');
    expect(apiAuthSource).not.toContain("jwt.decode");
    expect(apiAuthSource).not.toContain("jsonwebtoken.verify");
  });

  it("restringe ODS à equipe e não devolve mensagens internas de RPC", () => {
    expect(odsOrdersSource).toContain('canAccessRoles(auth.profile.roles, ["admin", "backoffice", "caixa"])');
    expect(odsOrdersSource).toContain("const patchSchema = z.object(");
    expect(odsOrdersSource).toContain("const manualOrderSchema = z.object(");
    expect(odsOrdersSource).toContain("function operationalFailure(");
    expect(odsOrdersSource).not.toContain("error: error.message");
    expect(odsOrdersSource).toContain("Não foi possível concluir esta operação agora.");
  });

  it("aplica autorização administrativa, allowlists e download privado à exportação", () => {
    expect(exportSource).toContain('canAccessRoles(auth.profile.roles, ["admin"])');
    expect(exportSource).toContain('z.enum(["clientes", "vendas", "eventos", "relatorio"])');
    expect(exportSource).toContain('z.enum(["csv", "xlsx", "pdf"])');
    expect(exportSource).toContain('"Cache-Control": "private, no-store, max-age=0"');
  });

  it("não permite CORS wildcard nem interpolação de parâmetros em consultas Supabase", () => {
    for (const source of apiSources) {
      expect(source).not.toContain("Access-Control-Allow-Origin");
      expect(source).not.toMatch(/\.(?:from|select|eq|in|gte|rpc)\(\s*`[^`]*\$\{/);
    }
  });
});
