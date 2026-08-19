import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

export const MEMBER_INTEREST_RATE_LIMIT = 10;

export function clientIpFromHeaders(requestHeaders: Headers) {
  const forwarded = requestHeaders.get("x-forwarded-for");
  const forwardedIp = forwarded?.split(",").map((value) => value.trim()).find(Boolean);
  return forwardedIp ?? requestHeaders.get("x-real-ip")?.trim() ?? "unknown";
}

export function memberInterestIpHash(ipAddress: string, secret = env.memberInterestAbuseHashSecret ?? env.cronSecret) {
  if (!secret) throw new Error("O segredo de pseudonimização do formulário não está configurado.");
  return createHmac("sha256", secret).update(ipAddress.trim() || "unknown").digest("hex");
}

export function currentMemberInterestWindow(now = new Date()) {
  const window = new Date(now);
  window.setUTCMinutes(0, 0, 0);
  return window.toISOString();
}

export function validationMessages(issues: Array<{ message: string }>) {
  return [...new Set(issues.map((issue) => issue.message).filter(Boolean))].join(" ") || "Revise os dados do cadastro.";
}
