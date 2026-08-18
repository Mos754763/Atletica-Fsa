export type PendingCheckoutCandidate = {
  status: string;
  paymentExpiresAt: string | null;
  preferenceId: string | null;
};

export function canResumeCheckout(candidate: PendingCheckoutCandidate, now = new Date()) {
  if (candidate.status !== "aguardando_pagamento" || !candidate.preferenceId || !candidate.paymentExpiresAt) return false;
  const expiry = new Date(candidate.paymentExpiresAt);
  return !Number.isNaN(expiry.getTime()) && expiry > now;
}
