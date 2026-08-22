import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApiProfile } from "@/lib/api/auth";
import { GET } from "./route";

vi.mock("@/lib/api/auth", () => ({ getApiProfile: vi.fn() }));

const getApiProfileMock = vi.mocked(getApiProfile);

function request(query = "dataset=clientes&format=csv&period=30") {
  return new Request(`http://localhost/api/admin/export?${query}`, { headers: { authorization: "Bearer test-token" } });
}

function requireResponse(response: Response | undefined) {
  if (!response) throw new Error("A rota de exportação não retornou uma resposta.");
  return response;
}

function mockAdminWithClients(displayName = "Ana, & Souza") {
  const order = vi.fn().mockResolvedValue({
    data: [{ display_name: displayName, email: "ana@example.com", role: "cliente", created_at: "2026-08-01T12:00:00.000Z" }],
    error: null,
  });
  const gte = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ gte });
  const from = vi.fn().mockReturnValue({ select });
  getApiProfileMock.mockResolvedValue({
    profile: { id: "admin-id", email: "admin@example.com", display_name: "Admin", role: "admin", roles: ["admin"] },
    supabase: { from },
    accessToken: "test-token",
  } as never);
  return { from, select, gte, order };
}

describe("GET /api/admin/export", () => {
  beforeEach(() => vi.resetAllMocks());

  it("preserva a resposta de autenticação quando não há sessão válida", async () => {
    getApiProfileMock.mockResolvedValue({ error: NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 }) } as never);

    const response = requireResponse(await GET(request()));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Autenticação obrigatória." });
  });

  it("restringe exportações a administradores", async () => {
    getApiProfileMock.mockResolvedValue({
      profile: { id: "cashier-id", email: "cashier@example.com", display_name: "Caixa", role: "caixa", roles: ["caixa"] },
      supabase: {},
      accessToken: "test-token",
    } as never);

    const response = requireResponse(await GET(request()));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Somente administradores podem exportar dados operacionais." });
  });

  it("rejeita dataset, formato ou período fora do contrato", async () => {
    mockAdminWithClients();

    const response = requireResponse(await GET(request("dataset=estoque&format=zip&period=14")));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Parâmetros de exportação inválidos." });
  });

  it("permite exportação quando Administração é uma das atribuições acumuladas", async () => {
    const { from } = mockAdminWithClients();
    getApiProfileMock.mockResolvedValue({
      profile: { id: "admin-cashier-id", email: "operacao@example.com", display_name: "Operação", role: "admin", roles: ["admin", "caixa"] },
      supabase: { from },
      accessToken: "test-token",
    } as never);

    const response = requireResponse(await GET(request()));

    expect(response.status).toBe(200);
  });

  it("gera CSV com dados escapados e cabeçalhos de download", async () => {
    const { from, gte } = mockAdminWithClients();

    const response = requireResponse(await GET(request()));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain('attachment; filename="atletica-fsa-clientes-30-dias.csv"');
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(response.text()).resolves.toContain('"Ana, & Souza"');
    expect(from).toHaveBeenCalledWith("profiles");
    expect(gte).toHaveBeenCalledWith("created_at", expect.any(String));
  });

  it("neutraliza fórmulas em CSV para impedir execução em planilhas", async () => {
    mockAdminWithClients("=HYPERLINK(\"https://example.test\",\"Abrir\")");

    const response = requireResponse(await GET(request()));

    await expect(response.text()).resolves.toContain("'=HYPERLINK");
  });

  it("gera XLSX com o tipo MIME e a assinatura de planilha esperados", async () => {
    mockAdminWithClients();

    const response = requireResponse(await GET(request("dataset=clientes&format=xlsx&period=7")));
    const body = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(response.headers.get("content-disposition")).toContain("atletica-fsa-clientes-7-dias.xlsx");
    expect([...body.slice(0, 2)]).toEqual([0x50, 0x4b]);
    expect(new TextDecoder().decode(body)).toContain("Ana, &amp; Souza");
  });

  it("gera PDF com o tipo MIME e a assinatura de documento esperados", async () => {
    mockAdminWithClients();

    const response = requireResponse(await GET(request("dataset=clientes&format=pdf&period=90")));
    const body = new TextDecoder().decode((await response.arrayBuffer()).slice(0, 4));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("atletica-fsa-clientes-90-dias.pdf");
    expect(body).toBe("%PDF");
  });
});
