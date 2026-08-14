import { createServiceClient } from "@/lib/supabase/server";
import { sendTransactionalEmail } from "@/lib/email/transactional";

export type AutomationCondition = { field?: string; equals?: string };
export type AutomationAction = { type?: "queue_email" | "log"; templateKey?: string; recipientField?: string; subject?: string; html?: string };

function asString(value: unknown) { return typeof value === "string" ? value : value == null ? "" : String(value); }

export function matchesAutomationCondition(condition: AutomationCondition, context: Record<string, unknown>) {
  if (!condition.field) return true;
  return asString(context[condition.field]) === asString(condition.equals);
}

export async function runAutomationRules(input: { triggerKey: string; dedupeKey: string; context: Record<string, unknown> }) {
  const service = createServiceClient();
  const { data: rules, error } = await service.from("automation_rules").select("id,name,condition_json,action_json").eq("trigger_key", input.triggerKey).eq("enabled", true).is("deleted_at", null);
  if (error) throw new Error(`Não foi possível consultar automações: ${error.message}`);

  let queued = 0; let skipped = 0;
  for (const rule of rules ?? []) {
    const condition = (rule.condition_json ?? {}) as AutomationCondition;
    const action = (rule.action_json ?? {}) as AutomationAction;
    const { error: runError } = await service.from("automation_runs").insert({ rule_id: rule.id, dedupe_key: input.dedupeKey, status: "queued", context_json: input.context });
    if (runError?.code === "23505") { skipped += 1; continue; }
    if (runError) throw new Error(`Não foi possível registrar a execução: ${runError.message}`);
    if (!matchesAutomationCondition(condition, input.context)) {
      await service.from("automation_runs").update({ status: "skipped", outcome_json: { reason: "condition_not_matched" }, executed_at: new Date().toISOString() }).eq("rule_id", rule.id).eq("dedupe_key", input.dedupeKey);
      skipped += 1; continue;
    }
    if (action.type === "queue_email") {
      const recipient = asString(input.context[action.recipientField ?? "recipientEmail"]);
      if (!recipient || !action.templateKey) {
        await service.from("automation_runs").update({ status: "failed", error_message: "Ação de e-mail sem destinatário ou template.", executed_at: new Date().toISOString() }).eq("rule_id", rule.id).eq("dedupe_key", input.dedupeKey);
        continue;
      }
      const variables = Object.fromEntries(Object.entries(input.context).map(([key, value]) => [key, asString(value)]));
      const result = await sendTransactionalEmail({ to: recipient, templateKey: action.templateKey, dedupeKey: `rule:${rule.id}:${input.dedupeKey}`, variables, subject: action.subject ?? rule.name, html: action.html ?? `<p>${rule.name}</p>` });
      await service.from("automation_runs").update({ status: result.queued ? "succeeded" : "skipped", outcome_json: { queued: result.queued, reason: result.reason ?? null }, executed_at: new Date().toISOString() }).eq("rule_id", rule.id).eq("dedupe_key", input.dedupeKey);
      if (result.queued) queued += 1; else skipped += 1;
      continue;
    }
    await service.from("automation_runs").update({ status: "succeeded", outcome_json: { message: "Regra registrada sem ação externa." }, executed_at: new Date().toISOString() }).eq("rule_id", rule.id).eq("dedupe_key", input.dedupeKey);
  }
  return { checked: (rules ?? []).length, queued, skipped };
}
