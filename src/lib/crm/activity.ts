export type CrmActivityOutcome = "succeeded" | "blocked" | "failed" | "ignored";
export type CrmExpectationState = "concluida" | "cancelada" | "em_atraso" | "em_aberto";

export function getExpectationState(expectation: { completed_at: string | null; cancelled_at: string | null; due_at: string | null }, now = new Date()): CrmExpectationState {
  if (expectation.completed_at) return "concluida";
  if (expectation.cancelled_at) return "cancelada";
  if (expectation.due_at && new Date(expectation.due_at) < now) return "em_atraso";
  return "em_aberto";
}

export function activityActionLabel(action: string) {
  const labels: Record<string, string> = {
    "authorization.access_blocked": "Acesso bloqueado",
    "events.insert": "Evento criado",
    "events.update": "Evento atualizado",
    "event_tickets.update": "Ingresso atualizado",
    "event_registrations.update": "Inscrição atualizada",
    "orders.insert": "Pedido criado",
    "orders.update": "Pedido atualizado",
    "payments.insert": "Pagamento registrado",
    "payments.update": "Pagamento atualizado",
    "crm_activity_expectations.insert": "Obrigação criada",
    "crm_activity_expectations.update": "Obrigação atualizada",
  };
  return labels[action] ?? action.replaceAll("_", " ").replaceAll(".", " · ");
}

export function activityOutcomeLabel(outcome: CrmActivityOutcome) {
  return { succeeded: "Concluída", blocked: "Bloqueada", failed: "Falhou", ignored: "Ignorada" }[outcome];
}
