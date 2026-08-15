"use client";

import { useMemo, useState } from "react";
import { Activity, ChevronRight, CircleGauge, Ticket, TimerReset } from "lucide-react";
import { formatBRL } from "@/lib/format";

type TrendPoint = { label: string; cents: number };
type StatusPoint = { key: string; label: string; count: number };

type EventSources = { platform: number; sympla: number; manual: number; free: number; paid: number; pending: number };

export function ReportsDashboard({ trend, status, period, preparedSla, pendingOrders, pendingPaymentOrders, eventSources }: { trend: TrendPoint[]; status: StatusPoint[]; period: number; preparedSla: string; pendingOrders: number; pendingPaymentOrders: number; eventSources: EventSources }) {
  const [mode, setMode] = useState<"revenue" | "operation" | "events">("revenue");
  const peak = useMemo(() => Math.max(...trend.map((point) => point.cents), 1), [trend]);
  const totalStatus = status.reduce((sum, item) => sum + item.count, 0);
  const eventBreakdown: Array<readonly [string, number]> = [["Plataforma FSA", eventSources.platform], ["Sympla", eventSources.sympla], ["Lançamento manual", eventSources.manual], ["Gratuitos", eventSources.free], ["Pagos", eventSources.paid], ["Aguardando pagamento", eventSources.pending]]; const operationBreakdown: Array<readonly [string, number]> = status.map((item) => [item.label, item.count]); const totalEvents = eventBreakdown.reduce((sum, [, value]) => sum + value, 0); const currentBreakdown = mode === "operation" ? operationBreakdown : eventBreakdown; const currentTotal = mode === "operation" ? totalStatus : totalEvents;
  return <section className="analytics-grid">
    <article className="analytics-card analytics-card--chart"><div className="analytics-card__head"><div><span>PAINEL CONFIGURÁVEL</span><h2>{mode === "revenue" ? "Receita aprovada por dia" : mode === "operation" ? "Pedidos por etapa" : "Inscrições e origens"}</h2></div><div className="analytics-tabs" aria-label="Modo de visualização"><button className={mode === "revenue" ? "is-active" : ""} onClick={() => setMode("revenue")}>Vendas</button><button className={mode === "operation" ? "is-active" : ""} onClick={() => setMode("operation")}>Pedidos</button><button className={mode === "events" ? "is-active" : ""} onClick={() => setMode("events")}>Eventos</button></div></div>{mode === "revenue" ? <div className="revenue-chart" role="img" aria-label={`Receita aprovada nos últimos ${period} dias`}>{trend.map((point) => <div className="revenue-bar" key={point.label}><span className="revenue-bar__tooltip">{formatBRL(point.cents)}</span><i style={{ height: `${Math.max((point.cents / peak) * 100, point.cents ? 6 : 2)}%` }} /><small>{point.label}</small></div>)}</div> : <div className="status-breakdown">{currentBreakdown.map(([label, count]) => <div className="status-breakdown__row" key={label}><span>{label}</span><div><i style={{ width: `${currentTotal ? (count / currentTotal) * 100 : 0}%` }} /></div><strong>{count}</strong></div>)}{currentBreakdown.length === 0 && <p>Sem registros na janela selecionada.</p>}</div>}</article>
    <article className="analytics-card analytics-card--service"><div className="analytics-card__head"><div><span>QUALIDADE DE ATENDIMENTO</span><h2>SLA e fila</h2></div><CircleGauge size={21} /></div><div className="service-kpi"><TimerReset size={25} /><div><small>Pagamento → pronto</small><strong>{preparedSla}</strong><span>média dos pedidos concluídos</span></div></div><div className="service-kpi"><Activity size={25} /><div><small>Fila operacional</small><strong>{pendingOrders}</strong><span>pedidos já recebidos em andamento</span></div></div><div className="service-kpi service-kpi--queue"><Ticket size={25} /><div><small>Em aberto para recebimento</small><strong>{pendingPaymentOrders}</strong><span>encomendas antes da confirmação</span></div></div><a href="/ods" className="analytics-ods-link">Abrir gestão de pedidos <ChevronRight size={16} /></a></article>
  </section>;
}
