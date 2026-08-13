import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleDollarSign, Clock3, CreditCard, Filter, ShoppingBag, Users } from "lucide-react";
import { ReportsDashboard } from "@/components/admin/ReportsDashboard";
import { averageMinutesBetween, formatMinutes, resolveAnalyticsPeriod, revenueByDay, statusDistribution, type AnalyticsOrder, type AnalyticsPayment } from "@/lib/analytics";
import { requireRole } from "@/lib/auth/require-role";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/orders/workflow";
import type { OrderState } from "@/types/domain";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ period?: string }>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams; const period = resolveAnalyticsPeriod(params.period);
  const since = new Date(); since.setDate(since.getDate() - period); const sinceIso = since.toISOString();
  const { supabase } = await requireRole(["admin"]);
  const [{ data: payments }, { data: orders }, { count: registrationsCount }, { count: eventsCount }] = await Promise.all([
    supabase.from("payments").select("amount_cents,approved_at").eq("status", "aprovado").gte("approved_at", sinceIso).returns<AnalyticsPayment[]>(),
    supabase.from("orders").select("status,total_cents,created_at,paid_at,ready_at").gte("created_at", sinceIso).returns<AnalyticsOrder[]>(),
    supabase.from("event_registrations").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    supabase.from("events").select("id", { count: "exact", head: true }).neq("status", "encerrado"),
  ]);
  const approvedPayments = payments ?? []; const periodOrders = orders ?? [];
  const revenue = approvedPayments.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const averageTicket = approvedPayments.length ? Math.round(revenue / approvedPayments.length) : 0;
  const preparedSla = averageMinutesBetween(periodOrders, "paid_at", "ready_at");
  const pendingOrders = periodOrders.filter((order) => ["pago", "em_preparo", "pronto"].includes(order.status)).length;
  const status = Object.entries(statusDistribution(periodOrders)).map(([key, count]) => ({ key, label: ORDER_STATUS_LABEL[key as OrderState] ?? key, count }));
  const cards = [
    ["Receita aprovada", formatBRL(revenue), `últimos ${period} dias`, CreditCard],
    ["Ticket médio", formatBRL(averageTicket), `${approvedPayments.length} pagamentos aprovados`, CircleDollarSign],
    ["SLA médio", formatMinutes(preparedSla), "pagamento até pronto", Clock3],
    ["Fila operacional", String(pendingOrders), "pagos, em preparo ou prontos", ShoppingBag],
    ["Inscrições", String(registrationsCount ?? 0), `últimos ${period} dias`, Users],
    ["Eventos ativos", String(eventsCount ?? 0), "agenda atual", CalendarDays],
  ];
  return <main className="reports-page"><header><div><p className="eyebrow eyebrow--blue">BACKOFFICE / INTELIGÊNCIA OPERACIONAL</p><h1>Leitura de jogo.</h1><p>Receita confirmada, ritmo de preparo e fila de atendimento em uma visão integrada. Nenhuma métrica é estimada: os cartões usam somente registros disponíveis no Supabase.</p></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header><form className="data-filterbar data-filterbar--report" method="get"><label><span>Janela de análise</span><select name="period" defaultValue={String(period)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label><button type="submit"><Filter size={15} /> Atualizar painel</button><Link href="/admin/relatorios?period=30">Restaurar 30 dias</Link></form><section className="kpi-grid">{cards.map(([title, value, detail, Icon]) => { const CardIcon = Icon as typeof CreditCard; return <article className="kpi-card" key={title as string}><CardIcon size={21} /><span>{title as string}</span><strong>{value as string}</strong><small>{detail as string}</small></article>; })}</section><ReportsDashboard trend={revenueByDay(approvedPayments, period)} status={status} period={period} preparedSla={formatMinutes(preparedSla)} pendingOrders={pendingOrders} /></main>;
}
