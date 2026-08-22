import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApiProfile } from "@/lib/api/auth";
import { createAuthenticatedServerClient } from "@/lib/supabase/server";
import { PATCH } from "./route";

vi.mock("@/lib/api/auth", () => ({ getApiProfile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createAuthenticatedServerClient: vi.fn() }));
vi.mock("@/lib/email/transactional", () => ({ sendOrderStatusEmail: vi.fn().mockResolvedValue(undefined) }));

const getApiProfileMock = vi.mocked(getApiProfile);
const createAuthenticatedServerClientMock = vi.mocked(createAuthenticatedServerClient);
const ORDER_ID = "8c3054fc-6be1-47be-86bc-654d4296d3bb";

function request(payload: Record<string, unknown>) {
  return new Request("http://localhost/api/ods/orders", {
    method: "PATCH",
    headers: { authorization: "Bearer test-token", "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function requireResponse(response: Response | undefined) {
  if (!response) throw new Error("A rota ODS não retornou uma resposta.");
  return response;
}

function operationalAuth(roles: string[] = ["backoffice"]) {
  const single = vi.fn().mockResolvedValue({
    data: {
      id: ORDER_ID,
      order_number: 321,
      status: "pago",
      customer_id: "customer-1",
      customer_email: "cliente@example.com",
      fulfillment: "consumo_local",
      pickup_code: null,
    },
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  getApiProfileMock.mockResolvedValue({
    profile: { id: "operator-1", email: "operacao@example.com", display_name: "Operação", role: roles[0], roles },
    supabase: { from },
    accessToken: "test-token",
  } as never);
  return { from };
}

describe("PATCH /api/ods/orders", () => {
  beforeEach(() => vi.resetAllMocks());

  it("preserva a resposta de sessão inválida sem acessar a fila", async () => {
    getApiProfileMock.mockResolvedValue({ error: NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 }) } as never);

    const response = requireResponse(await PATCH(request({ orderId: ORDER_ID, status: "em_preparo" })));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Autenticação obrigatória." });
    expect(createAuthenticatedServerClientMock).not.toHaveBeenCalled();
  });

  it("bloqueia papel de cliente antes de executar RPC operacional", async () => {
    operationalAuth(["cliente"]);

    const response = requireResponse(await PATCH(request({ orderId: ORDER_ID, status: "em_preparo" })));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Acesso restrito à operação." });
    expect(createAuthenticatedServerClientMock).not.toHaveBeenCalled();
  });

  it("rejeita estados e identificadores fora do contrato antes de consultar o pedido", async () => {
    const { from } = operationalAuth();

    const response = requireResponse(await PATCH(request({ orderId: "not-a-uuid", status: "sql-injection" })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Atualização inválida." });
    expect(from).not.toHaveBeenCalled();
    expect(createAuthenticatedServerClientMock).not.toHaveBeenCalled();
  });

  it("não vaza detalhes internos quando a RPC de transição falha", async () => {
    operationalAuth();
    const rpc = vi.fn().mockResolvedValue({ error: { code: "P0001", message: "orders table diagnostic must stay internal" } });
    createAuthenticatedServerClientMock.mockReturnValue({ rpc } as never);

    const response = requireResponse(await PATCH(request({ orderId: ORDER_ID, status: "em_preparo" })));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({ error: "Não foi possível concluir esta operação agora. Atualize a fila e tente novamente." });
    expect(JSON.stringify(payload)).not.toContain("orders table diagnostic");
    expect(rpc).toHaveBeenCalledWith("advance_ods_order", { p_order_id: ORDER_ID, p_next_status: "em_preparo" });
  });
});
