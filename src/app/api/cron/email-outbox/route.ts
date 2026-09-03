import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isAuthorizedCronRequest } from "@/lib/api/cron-auth";
import { processEmailOutbox } from "@/lib/email/transactional";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function runEmailOutboxWorker(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const startedAt = Date.now();
  const supabase = createServiceClient();
  try {
    const processing = await processEmailOutbox(50);
    if ("skipped" in processing) throw new Error("O worker de e-mail está sem configuração do provedor.");
    const hasDeadLetter = processing.deadLettered > 0;
    const { error: heartbeatError } = await supabase.from("scheduled_route_heartbeats").insert({
      route_path: "/api/cron/email-outbox",
      status: hasDeadLetter ? "failed" : "succeeded",
      duration_ms: Date.now() - startedAt,
      detail: hasDeadLetter ? `${processing.deadLettered} mensagem(ns) encerrada(s) após o limite de tentativas.` : null,
    });
    if (heartbeatError) throw new Error("Não foi possível registrar o heartbeat do worker de e-mail.");
    return NextResponse.json({ ok: !hasDeadLetter, processing }, { status: hasDeadLetter ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 600) : "Falha desconhecida no worker de e-mail.";
    try {
      const { error: heartbeatError } = await supabase.from("scheduled_route_heartbeats").insert({ route_path: "/api/cron/email-outbox", status: "failed", duration_ms: Date.now() - startedAt, detail });
      if (heartbeatError) console.error("[email-outbox] falha ao registrar heartbeat de erro", { errorCode: heartbeatError.code ?? "unknown" });
    } catch (heartbeatError) {
      console.error("[email-outbox] exceção ao registrar heartbeat de erro", { errorType: heartbeatError instanceof Error ? heartbeatError.name : "unknown" });
    }
    return NextResponse.json({ error: "O processamento da fila de e-mail falhou; consulte os logs." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = runEmailOutboxWorker;
export const POST = runEmailOutboxWorker;
