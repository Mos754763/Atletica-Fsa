import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { parseResendWebhookEvent, verifyResendWebhookSignature } from "@/lib/email/resend-webhook";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 128 * 1024;

export async function POST(request: Request) {
  if (!env.resendWebhookSecret) {
    return NextResponse.json({ error: "Webhook do Resend não configurado." }, { status: 503 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload excede o limite permitido." }, { status: 413 });
  }

  const payload = await request.text();
  if (Buffer.byteLength(payload, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload excede o limite permitido." }, { status: 413 });
  }
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Cabeçalhos de assinatura ausentes." }, { status: 400 });
  }
  if (!verifyResendWebhookSignature({ payload, id, timestamp, signature, secret: env.resendWebhookSecret })) {
    return NextResponse.json({ error: "Assinatura inválida ou expirada." }, { status: 401 });
  }
  const event = parseResendWebhookEvent(payload);
  if (!event) {
    return NextResponse.json({ error: "Evento do Resend inválido ou não habilitado." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("ingest_resend_email_event", {
    p_event_id: id,
    p_event_type: event.type,
    p_provider_message_id: event.data.email_id,
    p_occurred_at: event.created_at,
    p_recipient_email: event.data.to[0],
    p_payload: event,
  });
  if (error) {
    console.error("[resend-webhook] falha ao persistir evento", { eventId: id, errorCode: error.code ?? "unknown" });
    return NextResponse.json({ error: "Não foi possível persistir o evento." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, result: data }, { headers: { "Cache-Control": "no-store" } });
}
