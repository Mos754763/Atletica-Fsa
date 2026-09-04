const optional = (name: string) => process.env[name]?.trim();

const legacyPaymentsEnabled = optional("PAYMENTS_ENABLED") === "true";
const booleanFlag = (name: string, fallback: boolean) => {
  const value = optional(name);
  return value === undefined ? fallback : value === "true";
};

export const env = {
  appUrl: optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  supabaseUrl: optional("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: optional("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseSecretKey: optional("SUPABASE_SECRET_KEY"),
  resendApiKey: optional("RESEND_API_KEY"),
  resendWebhookSecret: optional("RESEND_WEBHOOK_SECRET"),
  emailFrom: optional("EMAIL_FROM") ?? "ATLETICA FSA <onboarding@resend.dev>",
  mercadoPagoAccessToken: optional("MERCADO_PAGO_ACCESS_TOKEN"),
  mercadoPagoWebhookSecret: optional("MERCADO_PAGO_WEBHOOK_SECRET"),
  mercadoPagoPublicKey: optional("NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY"),
  // PAYMENTS_ENABLED permanece como fallback durante a migração das variáveis.
  paymentsEnabled: legacyPaymentsEnabled,
  acceptNewCheckouts: booleanFlag("ACCEPT_NEW_CHECKOUTS", legacyPaymentsEnabled),
  processPaymentEvents: booleanFlag("PROCESS_PAYMENT_EVENTS", legacyPaymentsEnabled),
  cronSecret: optional("CRON_SECRET"),
  memberInterestAbuseHashSecret: optional("MEMBER_INTEREST_ABUSE_HASH_SECRET"),
  symplaApiToken: optional("SYMPLA_API_TOKEN"),
  slackSymplaAlertWebhookUrl: optional("SLACK_SYMPLA_ALERT_WEBHOOK_URL"),
};

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}
