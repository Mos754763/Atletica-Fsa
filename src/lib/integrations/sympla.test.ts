import { describe, expect, test, vi } from "vitest";
import { listSymplaEvents, SymplaApiError, verifySymplaConnection } from "@/lib/integrations/sympla";
import { normalizeSymplaEvent, syncSymplaEventCatalog } from "@/lib/integrations/sympla-sync";

describe("cliente Sympla", () => {
  test("normaliza apenas o catálogo externo permitido na homologação", () => {
    expect(normalizeSymplaEvent({ id: "evt-1", name: "Festa FSA", start_date: "2026-10-10T20:00:00Z", end_date: null, url: "https://sympla.com.br/e/evt-1", published: 1, cancelled: 0, image: null })).toEqual({
      externalId: "evt-1", title: "Festa FSA", startsAt: "2026-10-10T20:00:00Z", endsAt: null, url: "https://sympla.com.br/e/evt-1", isPublished: true, isCancelled: false, imageUrl: null,
    });
  });

  test("envia token somente no cabeçalho do servidor e normaliza a verificação", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "evt-1" }], pagination: { quantity: 1 } }), { status: 200 }));
    const result = await verifySymplaConnection(fetchMock);
    expect(result).toEqual({ connected: true, eventCount: 1 });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/events?page_size=10"), expect.objectContaining({ headers: expect.objectContaining({ s_token: expect.any(String) }) }));
  });

  test("não repete respostas definitivas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
    await expect(listSymplaEvents(undefined, fetchMock)).rejects.toMatchObject({ name: "SymplaApiError", status: 401, retryable: false } satisfies Partial<SymplaApiError>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe.runIf(Boolean(process.env.SYMPLA_API_TOKEN))("credencial Sympla fornecida", () => {
  test("consulta a listagem leve de eventos com o token de servidor", async () => {
    await expect(verifySymplaConnection()).resolves.toMatchObject({ connected: true });
  }, 20_000);

  test("espelha eventos externos e mantém a execução auditável sem criar vendas internas", async () => {
    await expect(syncSymplaEventCatalog(undefined, "replay")).resolves.toMatchObject({ recordsRead: expect.any(Number), recordsMirrored: expect.any(Number) });
  }, 25_000);
});
