export type AnalyticsOrder = { status: string; total_cents: number; created_at: string; paid_at: string | null; ready_at: string | null };
export type AnalyticsPayment = { amount_cents: number; approved_at: string | null };
export type AnalyticsRegistration = { amount_cents: number; source: "plataforma" | "sympla" | "manual"; payments: Array<{ status: string }> | null };

export const ANALYTICS_PERIODS = [7, 30, 90] as const;

export function resolveAnalyticsPeriod(value: string | undefined) {
  const parsed = Number(value);
  return ANALYTICS_PERIODS.includes(parsed as (typeof ANALYTICS_PERIODS)[number]) ? parsed : 30;
}

export function averageMinutesBetween(orders: AnalyticsOrder[], from: "paid_at" | "created_at", to: "ready_at") {
  const durations = orders.flatMap((order) => {
    const initialTimestamp = order[from];
    if (!initialTimestamp) return [];
    const start = new Date(initialTimestamp).getTime();
    const end = order[to] ? new Date(order[to] as string).getTime() : Number.NaN;
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? [(end - start) / 60000] : [];
  });
  return durations.length ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length) : null;
}

export function formatMinutes(minutes: number | null) {
  if (minutes === null) return "Sem dados";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

export function statusDistribution(orders: AnalyticsOrder[]) {
  return orders.reduce<Record<string, number>>((counts, order) => ({ ...counts, [order.status]: (counts[order.status] ?? 0) + 1 }), {});
}

export function revenueByDay(payments: AnalyticsPayment[], days: number, reference = new Date()) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  const buckets = new Map<string, { label: string; cents: number }>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(reference);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, { label: formatter.format(date), cents: 0 });
  }
  for (const payment of payments) {
    if (!payment.approved_at) continue;
    const key = payment.approved_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) bucket.cents += payment.amount_cents;
  }
  return [...buckets.values()];
}

export function registrationMetrics(registrations: AnalyticsRegistration[]) {
  const paid = registrations.filter((registration) => registration.payments?.some((payment) => payment.status === "aprovado")).length;
  const free = registrations.filter((registration) => registration.amount_cents === 0).length;
  return {
    platform: registrations.filter((registration) => registration.source === "plataforma").length,
    sympla: registrations.filter((registration) => registration.source === "sympla").length,
    manual: registrations.filter((registration) => registration.source === "manual").length,
    free,
    paid,
    pending: registrations.filter((registration) => registration.amount_cents > 0 && !registration.payments?.some((payment) => payment.status === "aprovado")).length,
  };
}
