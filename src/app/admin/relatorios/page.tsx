import Link from "next/link";
import { ArrowLeft, CalendarDays, CreditCard, ShoppingBag, Users } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";

export default async function ReportsPage() {
  const { supabase } = await requireRole(["admin"]); const since = new Date(); since.setDate(since.getDate() - 30);
  const [{ data: payments }, { count: ordersCount }, { count: registrationsCount }, { count: eventsCount }] = await Promise.all([
    supabase.from("payments").select("amount_cents").eq("status", "aprovado").gte("approved_at", since.toISOString()),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString()),
    supabase.from("event_registrations").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString()),
    supabase.from("events").select("id", { count: "exact", head: true }).neq("status", "encerrado"),
  ]); const revenue = (payments ?? []).reduce((sum, payment) => sum + payment.amount_cents, 0);
  const cards = [["Receita aprovada", formatBRL(revenue), "últimos 30 dias", CreditCard], ["Pedidos", String(ordersCount ?? 0), "últimos 30 dias", ShoppingBag], ["Inscrições", String(registrationsCount ?? 0), "últimos 30 dias", Users], ["Eventos ativos", String(eventsCount ?? 0), "agenda atual", CalendarDays]];
  return <main className="reports-page"><header><div><p className="eyebrow eyebrow--blue">BACKOFFICE / RELATÓRIOS</p><h1>Números da torcida.</h1></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header><section className="reports-cards">{cards.map(([title, value, detail, Icon]) => { const CardIcon = Icon as typeof CreditCard; return <article key={title as string}><CardIcon size={23} /><span>{title as string}</span><strong>{value as string}</strong><small>{detail as string}</small></article>; })}</section><section className="reports-note"><h2>Leitura operacional</h2><p>Os indicadores consideram pagamentos aprovados e registros criados nos últimos 30 dias. A consolidação detalhada por evento e método de pagamento será complementada automaticamente quando o Mercado Pago for integrado.</p></section></main>;
}
