import Link from "next/link";
import { Database, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { syncSymplaCatalog } from "./actions";

export const dynamic = "force-dynamic";

type IntegrationRow = { id: string; sync_mode: string; is_enabled: boolean; last_synced_at: string | null; last_sync_status: string | null };
type SyncRunRow = { id: string; status: string; records_read: number; started_at: string; completed_at: string | null; error_detail: string | null };

export default async function SymplaIntegrationPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data: integration } = await supabase.from("event_integrations").select("id,sync_mode,is_enabled,last_synced_at,last_sync_status").eq("provider", "sympla").maybeSingle<IntegrationRow>();
  const { data: runs } = integration ? await supabase.from("event_sync_runs").select("id,status,records_read,started_at,completed_at,error_detail").eq("integration_id", integration.id).order("started_at", { ascending: false }).limit(8).returns<SyncRunRow[]>() : { data: [] as SyncRunRow[] };
  const { count: cachedEvents } = integration ? await supabase.from("external_event_records").select("id", { count: "exact", head: true }).eq("integration_id", integration.id).eq("record_type", "event") : { count: 0 };

  return <section className="erp-page erp-integration-page">
    <header className="erp-page__header"><div><Link className="erp-page__back" href="/admin/eventos">← Eventos</Link><p className="erp-eyebrow">INTEGRAÇÕES · HOMOLOGAÇÃO</p><h1>Sympla</h1><p>Consulta de eventos em modo somente leitura. O checkout, estoque, ingresso e check-in internos permanecem isolados.</p></div><form action={syncSymplaCatalog}><button className="erp-btn erp-btn--primary" type="submit"><RefreshCw size={16} /> Sincronizar catálogo</button></form></header>
    <div className="erp-kpi-grid"><article className="erp-kpi"><Database size={18}/><span>Eventos externos</span><strong>{cachedEvents ?? 0}</strong><small>Dados armazenados para conferência</small></article><article className="erp-kpi"><ShieldCheck size={18}/><span>Modo</span><strong>{integration?.sync_mode === "read_only" ? "Somente leitura" : "Aguardando"}</strong><small>Sem escrita na Sympla ou impacto financeiro</small></article><article className="erp-kpi"><RefreshCw size={18}/><span>Última execução</span><strong>{integration?.last_synced_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(integration.last_synced_at)) : "Não executada"}</strong><small>{integration?.last_sync_status ?? "Aguardando homologação"}</small></article></div>
    <section className="erp-card erp-integration-note"><h2>Limites de segurança da homologação</h2><p>Esta etapa apenas lê a lista oficial de eventos da conta produtora. Antes de vincular um evento, será preciso definir o sistema mestre de vendas, capacidade, ingressos e check-in. Divergências serão apresentadas para revisão, nunca conciliadas automaticamente.</p><a href="https://developers.sympla.com.br/api-doc/" target="_blank" rel="noreferrer">Documentação da API Sympla <ExternalLink size={14}/></a></section>
    <section className="erp-card"><div className="erp-card__header"><div><p className="erp-eyebrow">AUDITORIA</p><h2>Execuções recentes</h2></div></div>{runs?.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Início</th><th>Status</th><th>Eventos lidos</th><th>Detalhe</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(run.started_at))}</td><td><span className={`erp-status erp-status--${run.status}`}>{run.status}</span></td><td>{run.records_read}</td><td>{run.error_detail ?? "Concluída sem alterações no fluxo interno"}</td></tr>)}</tbody></table></div> : <div className="erp-empty">Ainda não há sincronizações. Execute uma consulta manual para validar a conta e importar somente o catálogo externo.</div>}</section>
  </section>;
}
