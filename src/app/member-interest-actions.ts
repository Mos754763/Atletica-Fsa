"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { clientIpFromHeaders, currentMemberInterestWindow, memberInterestIpHash, MEMBER_INTEREST_RATE_LIMIT, validationMessages } from "@/lib/member-interest-abuse";
import { createServiceClient } from "@/lib/supabase/server";
import { parseMemberInterest } from "@/lib/member-interest";
import type { MemberInterestActionState } from "@/lib/member-interest-action-state";

type AbuseEventType = "honeypot" | "rate_limited" | "validation_rejected" | "persistence_failed";

async function registerAbuseEvent(service: ReturnType<typeof createServiceClient>, eventType: AbuseEventType, ipHash: string) {
  const { error } = await service.from("member_interest_abuse_events").insert({ event_type: eventType, ip_hash: ipHash, source: "landing", details_json: {} });
  if (error) console.error("[member-interest] abuse-event-failure", { code: error.code ?? null, message: error.message });
}

export async function submitMemberInterest(_previousState: MemberInterestActionState, formData: FormData): Promise<MemberInterestActionState> {
  const service = createServiceClient();
  let ipHash: string;
  try {
    ipHash = memberInterestIpHash(clientIpFromHeaders(await headers()));
  } catch {
    return { status: "error", message: "Não foi possível validar a segurança do envio agora. Tente novamente em alguns instantes." };
  }

  const { data: rateWindow, error: rateLimitError } = await service
    .rpc("consume_member_interest_rate_limit", { p_ip_hash: ipHash, p_window_started_at: currentMemberInterestWindow(), p_limit: MEMBER_INTEREST_RATE_LIMIT })
    .maybeSingle<{ attempt_count: number; allowed: boolean }>();
  if (rateLimitError) {
    console.error("[member-interest] rate-limit-failure", { code: rateLimitError.code ?? null, message: rateLimitError.message });
    return { status: "error", message: "Não foi possível validar a segurança do envio agora. Tente novamente em alguns instantes." };
  }
  if (!rateWindow?.allowed) {
    await registerAbuseEvent(service, "rate_limited", ipHash);
    return { status: "error", message: "Muitas tentativas deste acesso. Aguarde uma hora antes de enviar novamente." };
  }

  if (String(formData.get("company") ?? "").trim()) {
    await registerAbuseEvent(service, "honeypot", ipHash);
    return { status: "success", message: "Recebemos seu interesse. Em breve entraremos em contato." };
  }

  const parsed = parseMemberInterest({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    whatsapp: formData.get("whatsapp") || undefined,
    course: formData.get("course") || undefined,
    semester: formData.get("semester") || undefined,
    interests: formData.getAll("interests"),
    message: formData.get("message") || undefined,
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    await registerAbuseEvent(service, "validation_rejected", ipHash);
    return { status: "error", message: validationMessages(parsed.error.issues) };
  }

  const { fullName, email, whatsapp, course, semester, interests, message } = parsed.data;
  const { error } = await service.from("member_interest_applications").insert({
    full_name: fullName,
    email,
    whatsapp: whatsapp || null,
    course: course || null,
    semester: semester || null,
    interests,
    message: message || null,
    consent_at: new Date().toISOString(),
  });

  if (error?.code === "23505") return { status: "success", message: "Seu interesse já está registrado. A gestão vai entrar em contato em breve." };
  if (error) {
    await registerAbuseEvent(service, "persistence_failed", ipHash);
    console.error("[member-interest] persistence-failure", {
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
      message: error.message,
    });
    return { status: "error", message: "Não foi possível registrar seu interesse agora. Tente novamente em alguns instantes." };
  }

  revalidatePath("/admin/membros");
  return { status: "success", message: "Cadastro recebido. A gestão da FSA vai analisar seu interesse e entrar em contato." };
}
