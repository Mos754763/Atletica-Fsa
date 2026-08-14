import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, Clock3, Filter, Plus, ShieldAlert, UserRoundCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { activityActionLabel, activityOutcomeLabel, getExpectationState, type CrmActivityOutcome } from "@/lib/crm/activity";
import { completeActivityExpectation, createActivityExpectation } from "./actions";

export const dynamic = "force-dynamic";

type ActivityRow = { id: string; actor_id: string | null; actor_kind: string; action: string; outcome: CrmActivityOutcome; resource_type: string; summary: string; occurred_at: string };
type ExpectationRow = { id: string; assigned_to: string; title: string; expected_action: string; priority: "low" | "normal" | "high" | "urgent"; due_at: string | null; completed_at: string | null; cancelled_at: string | null };
type MemberRow = { id: string; display_name: string | null; email: string; role: string };
type SearchParams = Promise<{ outcome?: string; state?: string; q?: string }>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function CrmActivitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const selectedOutcome = ["all", "succeeded", "blocked", "failed", "ignored"].includes(params.outcome ?? "") ? params.outcome! : "all";
  const selectedState = ["all", "em_aberto", "em_atraso", "concluida", "cancelada"].includes(params.state ?? "") ? params.state! : "all";
  const query = (params.q ?? "").trim().toLowerCase();
  const { supabase } = await requireRole(["admin"]);
  const [{ data: rawActivities }, { data: rawExpectations }, { data: rawMembers }] = await Promise.all([
    supabase.from("crm_activity_logs").select("id,actor_id,actor_kind,action,outcome,resource_type,summary,occurred_at").order("occurred_at", { ascending: false }).limit(160),
    supabase.from("crm_activity_expectations").select("id,assigned_to,title,expected_action,priority,due_at,completed_at,cancelled_at").order("due_at", { ascending: true, nullsFirst: false }).limit(120),
    supabase.from("profiles").select("id,display_name,email,role").order("display_name", { ascending: true }).limit(300),
  ]);
  const activities = (rawActivities ?? []) as ActivityRow[];
  const expectations = (rawExpectations ?? []) as ExpectationRow[];
  const members = (rawMembers ?? []) as MemberRow[];
  const memberById = new Map(members.map((member) => [member.id, member]));
  const filteredActivities = activities.filter((item) => {
    const actor = item.actor_id ? memberById.get(item.actor_id) : undefined;
    const matchesOutcome = selectedOutcome === "all" || item.outcome === selectedOutcome;
    const searchable = [activityActionLabel(item.action), item.summary, item.resource_type, actor?.display_name, actor?.email].filter(Boolean).join(" ").toLowerCase();
    return matchesOutcome && (!query || searchable.includes(query));
  });
  const filteredExpectations = expectations.filter((item) => selectedState === "all" || getExpectationState(item) === selectedState);
  const openExpectations = expectations.filter((item) => getExpectationState(item) === "em_aberto").length;
  const overdueExpectations = expectations.filter((item) => getExpectationState(item) === "em_atraso").length;
  const blockedActivities = activities.filter((item) => item.outcome === "blocked").length;

  return <main className="crm-activities-page"><header className="crm-activities-page__header"><div><p className="eyebrow eyebrow--blue">CRM / GOVERNANÇA</p><h1>Linha do tempo operacional.</h1><p>Fatos realizados, tentativas bloqueadas e obrigações atribuídas — sem inferir ausências que não tenham sido definidas.</p></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header>
    <section className="crm-activities-kpis" aria-label="Indicadores de atividade"><article><Activity size={18} /><span>Fatos recentes</span><strong>{activities.length}</strong></article><article><Clock3 size={18} /><span>Em aberto</span><strong>{openExpectations}</strong></article><article><ShieldAlert size={18} /><span>Em atraso</span><strong>{overdueExpectations}</strong></article><article><UserRoundCheck size={18} /><span>Bloqueadas</span><strong>{blockedActivities}</strong></article></section>
    <section className="crm-activities-layout"><aside className="crm-expectation-panel"><div className="crm-section-heading"><div><span>OBRIGAÇÕES</span><h2>O que está pendente</h2></div><Plus size={18} /></div><form action={createActivityExpectation} className="crm-expectation-form"><label>Responsável<select required name="assignedTo" defaultValue=""><option value="" disabled>Selecione uma pessoa</option>{members.map((member) => <option value={member.id} key={member.id}>{member.display_name || member.email} · {member.role}</option>)}</select></label><label>Título<input required name="title" maxLength={180} placeholder="Ex.: Confirmar fornecedor" /></label><label>Ação esperada<input required name="expectedAction" maxLength={160} placeholder="Ex.: registrar confirmação" /></label><div><label>Prazo<input name="dueAt" type="datetime-local" /></label><label>Prioridade<select name="priority" defaultValue="normal"><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label></div><button type="submit"><Plus size={15} /> Atribuir obrigação</button></form>
      <form className="crm-filterbar" method="get"><label>Estado<select name="state" defaultValue={selectedState}><option value="all">Todos</option><option value="em_aberto">Em aberto</option><option value="em_atraso">Em atraso</option><option value="concluida">Concluídas</option><option value="cancelada">Canceladas</option></select></label><input type="hidden" name="outcome" value={selectedOutcome} /><input type="hidden" name="q" value={params.q ?? ""} /><button type="submit"><Filter size={14} /> Filtrar</button></form>
      <div className="crm-expectation-list">{filteredExpectations.map((item) => { const state = getExpectationState(item); const member = memberById.get(item.assigned_to); return <article className={`crm-expectation-card is-${state}`} key={item.id}><div><span className="crm-state-pill">{state.replaceAll("_", " ")}</span><h3>{item.title}</h3><p>{item.expected_action}</p><small>{member?.display_name || member?.email || "Responsável indisponível"}{item.due_at ? ` · ${formatDate(item.due_at)}` : " · Sem prazo"}</small></div>{(state === "em_aberto" || state === "em_atraso") && <form action={completeActivityExpectation}><input type="hidden" name="expectationId" value={item.id} /><button type="submit" aria-label={`Concluir ${item.title}`}><CheckCircle2 size={16} /></button></form>}</article>; })}{filteredExpectations.length === 0 && <p className="crm-empty">Nenhuma obrigação neste filtro.</p>}</div></aside>
      <section className="crm-timeline-panel"><div className="crm-section-heading"><div><span>ATIVIDADES</span><h2>Quem fez o quê</h2></div><span>{filteredActivities.length} registros</span></div><form className="crm-filterbar" method="get"><label>Buscar<input name="q" defaultValue={params.q ?? ""} placeholder="Pessoa, ação ou recurso" /></label><label>Resultado<select name="outcome" defaultValue={selectedOutcome}><option value="all">Todos</option><option value="succeeded">Concluídas</option><option value="blocked">Bloqueadas</option><option value="failed">Falhas</option><option value="ignored">Ignoradas</option></select></label><input type="hidden" name="state" value={selectedState} /><button type="submit"><Filter size={14} /> Filtrar</button></form>
        <div className="crm-timeline">{filteredActivities.map((item) => { const member = item.actor_id ? memberById.get(item.actor_id) : undefined; return <article className={`crm-timeline-item is-${item.outcome}`} key={item.id}><span className="crm-timeline-item__dot" /><div className="crm-timeline-item__content"><div><strong>{activityActionLabel(item.action)}</strong><span>{activityOutcomeLabel(item.outcome)}</span></div><p>{item.summary}</p><small>{member?.display_name || member?.email || (item.actor_kind === "system" ? "Sistema" : "Integração")} · {item.resource_type} · {formatDate(item.occurred_at)}</small></div></article>; })}{filteredActivities.length === 0 && <p className="crm-empty">Nenhum registro corresponde aos filtros.</p>}</div>
      </section>
    </section>
  </main>;
}
