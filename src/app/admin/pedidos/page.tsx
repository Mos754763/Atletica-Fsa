import Link from "next/link";
import { ArrowLeft, Filter, ShoppingBag } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/orders/workflow";
import type { OrderState } from "@/types/domain";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; fulfillment?: string; period?: string }>;
type OrderRow = { id: string; order_number: number; status: OrderState; fulfillment: string; customer_name: string | null; customer_email: string | null; total_cents: number; created_at: string; paid_at: string | null; ready_at: string | null; events: { title: string } | null };
const periods = [{ value: "all", label: "Todo o histórico" }, { value: "7", label: "Últimos 7 dias" }, { value: "30", label: "Últimos 30 dias" }, { value: "90", label: "Últimos 90 dias" }];

export default async function OrdersAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase(); const status = params.status ?? "all"; const fulfillment = params.fulfillment ?? "all"; const period = periods.some((item) => item.value === params.period) ? params.period! : "30";
  const { supabase } = await requireRole(["admin", "caixa"]);
  let query = supabase.from("orders").select("id,order_number,status,fulfillment,customer_name,customer_email,total_cents,created_at,paid_at,ready_at,events(title)").order("created_at", { ascending: false }).limit(250);
  if (status !== "all") query = query.eq("status", status);
  if (fulfillment !== "all") query = query.eq("fulfillment", fulfillment);
  if (period !== "all") { const since = new Date(); since.setDate(since.getDate() - Number(period)); query = query.gte("created_at", since.toISOString()); }
  const { data } = await query.returns<OrderRow[]>();
  const orders = (data ?? []).filter((order) => !q || [order.order_number, order.customer_name, order.customer_email, order.events?.title].filter(Boolean).join(" ").toLowerCase().includes(q));
  return <main className="operations-page"><header className="operations-header"><div><p className="eyebrow eyebrow--blue">BACKOFFICE / PEDIDOS</p><h1>Fila sob controle.</h1><p>Pesquise por cliente, evento ou número do pedido. Os filtros preservam a URL para facilitar a rotina da equipe.</p></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header><form className="data-filterbar" method="get"><label><span>Buscar</span><input name="q" defaultValue={q} placeholder="Cliente, evento ou pedido" /></label><label><span>Status</span><select name="status" defaultValue={status}><option value="all">Todos os status</option>{Object.entries(ORDER_STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label><span>Retirada</span><select name="fulfillment" defaultValue={fulfillment}><option value="all">Todas as modalidades</option><option value="retirada">Retirada</option><option value="consumo_local">Consumo local</option><option value="entrega_evento">Entrega no evento</option></select></label><label><span>Período</span><select name="period" defaultValue={period}>{periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button type="submit"><Filter size={15} /> Filtrar</button><Link href="/admin/pedidos">Limpar</Link></form><section className="operations-table-card"><div className="operations-table-card__head"><div><ShoppingBag size={19} /><span>RESULTADO</span><h2>{orders.length} pedidos encontrados</h2></div><Link href="/ods">Abrir ODS</Link></div><div className="operations-table-wrap"><table><thead><tr><th>Pedido</th><th>Cliente / evento</th><th>Status</th><th>Modalidade</th><th>Valor</th><th>Recebido em</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>#{order.order_number}</strong><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.created_at))}</small></td><td><strong>{order.customer_name ?? "Cliente FSA"}</strong><small>{order.events?.title ?? order.customer_email ?? "Compra direta"}</small></td><td><span className={`order-status order-status--${order.status}`}>{ORDER_STATUS_LABEL[order.status]}</span></td><td>{order.fulfillment.replace("_", " ")}</td><td><strong>{formatBRL(order.total_cents)}</strong></td><td>{order.ready_at ? "Pronto" : order.paid_at ? "Pago" : "Pendente"}</td></tr>)}{orders.length === 0 && <tr><td className="operations-empty" colSpan={6}>Nenhum pedido corresponde aos filtros atuais.</td></tr>}</tbody></table></div></section></main>;
}
