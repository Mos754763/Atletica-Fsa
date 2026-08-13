"use client";

import { useMemo, useState } from "react";
import { Activity, ChevronRight, CircleGauge, TimerReset } from "lucide-react";
import { formatBRL } from "@/lib/format";

type TrendPoint = { label: string; cents: number };
type StatusPoint = { key: string; label: string; count: number };

export function ReportsDashboard({ trend, status, period, preparedSla, pendingOrders }: { trend: TrendPoint[]; status: StatusPoint[]; period: number; preparedSla: string; pendingOrders: number }) {
  const [mode, setMode] = useState<"revenue" | "operation">("revenue");
  const peak = useMemo(() => Math.max(...trend.map((point) => point.cents), 1), [trend]);
  const totalStatus = status.reduce((sum, item) => sum + item.count, 0);
  return <section className="analytics-grid">
    <article className="analytics-card analytics-card--chart"><div className="analytics-card__head"><div><span>RITMO DE OPERAÇÃO</span><h2>{mode === "revenue" ? "Receita aprovada por dia" : "Pedidos por etapa"}</h2></div><div className="analytics-tabs" aria-label="Modo de visualização"><button className={mode === "revenue" ? "is-active" : ""} onClick={() => setMode("revenue")}>Vendas</button><button className={mode === "operation" ? "is-active" : ""} onClick={() => setMode("operation")}>Operação</button></div></div>{mode === "revenue" ? <div className="revenue-chart" role="img" aria-label={`Receita aprovada nos últimos ${period} dias`}>{trend.map((point) => <div className="revenue-bar" key={point.label}><span className="revenue-bar__tooltip">{formatBRL(point.cents)}</span><i style={{ height: `${Math.max((point.cents / peak) * 100, point.cents ? 6 : 2)}%` }} /><small>{point.label}</small></div>)}</div> : <div className="status-breakdown">{status.map((item) => <div className="status-breakdown__row" key={item.key}><span>{item.label}</span><div><i style={{ width: `${totalStatus ? (item.count / totalStatus) * 100 : 0}%` }} /></div><strong>{item.count}</strong></div>)}{status.length === 0 && <p>Sem pedidos na janela selecionada.</p>}</div>}</article>
    <article className="analytics-card analytics-card--service"><div className="analytics-card__head"><div><span>QUALIDADE DE ATENDIMENTO</span><h2>SLA e fila</h2></div><CircleGauge size={21} /></div><div className="service-kpi"><TimerReset size={25} /><div><small>Pagamento → pronto</small><strong>{preparedSla}</strong><span>média dos pedidos concluídos</span></div></div><div className="service-kpi service-kpi--queue"><Activity size={25} /><div><small>Fila ativa</small><strong>{pendingOrders}</strong><span>pedidos aguardando operação</span></div></div><a href="/ods" className="analytics-ods-link">Abrir monitor operacional <ChevronRight size={16} /></a></article>
  </section>;
}
