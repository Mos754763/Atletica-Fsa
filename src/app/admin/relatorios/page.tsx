import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleDollarSign, Clock3, CreditCard, Download, FileSpreadsheet, FileText, Filter, ShoppingBag, Users } from "lucide-react";
import { ReportsDashboard } from "@/components/admin/ReportsDashboard";
import { averageMinutesBetween, formatMinutes, registrationMetrics, resolveAnalyticsPeriod, revenueByDay, statusDistribution, type AnalyticsOrder, type AnalyticsPayment, type AnalyticsRegistration } from "@/lib/analytics";
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
  const [{ data: payments }, { data: orders }, { data: registrations }, { count: eventsCount }] = await Promise.all([
    supabase.from("payments").select("amount_cents,approved_at").eq("status", "aprovado").gte("approved_at", sinceIso).returns<AnalyticsPayment[]>(),
    supabase.from("orders").select("status,total_cents,created_at,paid_at,ready_at").gte("created_at", sinceIso).returns<AnalyticsOrder[]>(),
    supabase.from("event_registrations").select("amount_cents,source,payments(status)").gte("created_at", sinceIso),
    supabase.from("events").select("id", { count: "exact", head: true }).neq("status", "encerrado"),
  ]);
  const approvedPayments = payments ?? []; const periodOrders = orders ?? [];
  const revenue = approvedPayments.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const averageTicket = approvedPayments.length ? Math.round(revenue / approvedPayments.length) : 0;
  const preparedSla = averageMinutesBetween(periodOrders, "paid_at", "ready_at");
  const pendingOrders = periodOrders.filter((order) => ["pago", "em_preparo", "pronto"].includes(order.status)).length;
  const pendingPaymentOrders = periodOrders.filter((order) => order.status === "aguardando_pagamento").length;
  const eventRows = registrations ?? [];
  const eventSources = registrationMetrics(eventRows as AnalyticsRegistration[]); const paidEventRegistrations = eventSources.paid;
  const status = Object.entries(statusDistribution(periodOrders)).map(([key, count]) => ({ key, label: ORDER_STATUS_LABEL[key as OrderState] ?? key, count }));
  const cards = [
    ["Receita aprovada", formatBRL(revenue), `últimos ${period} dias`, CreditCard],
    ["Ticket médio", formatBRL(averageTicket), `${approvedPayments.length} pagamentos aprovados`, CircleDollarSign],
    ["SLA médio", formatMinutes(preparedSla), "pagamento até pronto", Clock3],
    ["Fila operacional", String(pendingOrders), "pagos, em preparo ou prontos", ShoppingBag],
    ["Pedidos pendentes", String(pendingPaymentOrders), "encomendas aguardando recebimento", CircleDollarSign],
    ["Inscrições", String(eventRows.length), `últimos ${period} dias`, Users],
    ["Ingressos confirmados", String(paidEventRegistrations + eventSources.free), `${eventSources.sympla} via Sympla`, CalendarDays],
    ["Eventos ativos", String(eventsCount ?? 0), "agenda atual", CalendarDays],
  ];
  const exports = [["clientes", "Clientes", Users], ["vendas", "Vendas de produtos", ShoppingBag], ["eventos", "Eventos e ingressos", CalendarDays], ["relatorio", "Indicadores", FileSpreadsheet]] as const;
  return <main className="reports-page"><header><div><p className="eyebrow eyebrow--blue">BACKOFFICE / INTELIGÊNCIA OPERACIONAL</p><h1>Leitura de jogo.</h1><p>Receita confirmada, encomendas pendentes, inscrições e operação em uma visão integrada. Nenhum cartão infere dados: as métricas usam registros disponíveis no Supabase.</p></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header><form className="data-filterbar data-filterbar--report" method="get"><label><span>Janela de análise</span><select name="period" defaultValue={String(period)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label><button type="submit"><Filter size={15} /> Atualizar painel</button><Link href="/admin/relatorios?period=30">Restaurar 30 dias</Link></form><section className="kpi-grid">{cards.map(([title, value, detail, Icon]) => { const CardIcon = Icon as typeof CreditCard; return <article className="kpi-card" key={title as string}><CardIcon size={21} /><span>{title as string}</span><strong>{value as string}</strong><small>{detail as string}</small></article>; })}</section><ReportsDashboard trend={revenueByDay(approvedPayments, period)} status={status} period={period} preparedSla={formatMinutes(preparedSla)} pendingOrders={pendingOrders} pendingPaymentOrders={pendingPaymentOrders} eventSources={eventSources} /><section className="reports-export"><div><span className="eyebrow eyebrow--blue">DADOS OPERACIONAIS</span><h2>Baixe o recorte que precisa.</h2><p>Exportações restritas a administradores, com apenas os campos necessários para operação, conferência e prestação de contas.</p></div><div className="reports-export__grid">{exports.map(([dataset, label, Icon]) => <article key={dataset}><Icon size={18} /><strong>{label}</strong><div><a href={`/api/admin/export?dataset=${dataset}&format=csv&period=${period}`}><Download size={13} /> CSV</a><a href={`/api/admin/export?dataset=${dataset}&format=xlsx&period=${period}`}><FileSpreadsheet size={13} /> XLSX</a><a href={`/api/admin/export?dataset=${dataset}&format=pdf&period=${period}`}><FileText size={13} /> PDF</a></div></article>)}</div></section></main>;
}
