const optional = (name: string) => process.env[name]?.trim();

export const env = {
  appUrl: optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  supabaseUrl: optional("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: optional("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseSecretKey: optional("SUPABASE_SECRET_KEY"),
  resendApiKey: optional("RESEND_API_KEY"),
  emailFrom: optional("EMAIL_FROM") ?? "ATLETICA FSA <onboarding@resend.dev>",
  mercadoPagoAccessToken: optional("MERCADO_PAGO_ACCESS_TOKEN"),
  mercadoPagoWebhookSecret: optional("MERCADO_PAGO_WEBHOOK_SECRET"),
  mercadoPagoPublicKey: optional("NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY"),
  paymentsEnabled: optional("PAYMENTS_ENABLED") === "true",
  cronSecret: optional("CRON_SECRET"),
  symplaApiToken: optional("SYMPLA_API_TOKEN"),
};

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}
