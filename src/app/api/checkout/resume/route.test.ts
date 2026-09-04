import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApiProfile } from "@/lib/api/auth";
import { POST } from "./route";

vi.mock("@/lib/env", () => ({
  env: { acceptNewCheckouts: true, mercadoPagoAccessToken: "test-token" },
}));
vi.mock("@/lib/api/auth", () => ({ getApiProfile: vi.fn() }));
vi.mock("@/lib/payments/checkout-availability", () => ({
  getCheckoutAvailability: () => ({ available: true, code: "available", message: "Disponível" }),
}));

const getApiProfileMock = vi.mocked(getApiProfile);
const ORDER_ID = "a6b9b08f-6b32-4c45-8299-6bb958579ea5";

function request(orderId = ORDER_ID) {
  return new Request("http://localhost/api/checkout/resume", {
    method: "POST",
    headers: { authorization: "Bearer customer-a", "content-type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
}

function requireResponse(response: Response | undefined) {
  if (!response) throw new Error("A rota de retomada não retornou uma resposta.");
  return response;
}

describe("POST /api/checkout/resume", () => {
  beforeEach(() => vi.resetAllMocks());

  it("não revela nem encaminha pedido que não pertença ao cliente autenticado", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const customerIdEq = vi.fn().mockReturnValue({ maybeSingle });
    const orderIdEq = vi.fn().mockReturnValue({ eq: customerIdEq });
    const select = vi.fn().mockReturnValue({ eq: orderIdEq });
    const from = vi.fn().mockReturnValue({ select });
    getApiProfileMock.mockResolvedValue({
      profile: { id: "customer-a", email: "a@example.test", display_name: "Cliente A", role: "cliente", roles: ["cliente"] },
      supabase: { from },
      accessToken: "customer-a-token",
    } as never);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = requireResponse(await POST(request()));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Pedido não localizado." });
    expect(orderIdEq).toHaveBeenCalledWith("id", ORDER_ID);
    expect(customerIdEq).toHaveBeenCalledWith("customer_id", "customer-a");
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("preserva a rejeição de sessão inválida antes de consultar pedidos", async () => {
    getApiProfileMock.mockResolvedValue({ error: NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 }) } as never);

    const response = requireResponse(await POST(request()));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Autenticação obrigatória." });
  });
});
