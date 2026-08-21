import Link from "next/link";
import { ArrowLeft, Filter, Inbox, MailPlus, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import { requirePresident } from "@/lib/auth/require-president";
import { manageableRoles, rolesDescription } from "@/lib/members";
import { normalizeRoles } from "@/lib/auth/roles";
import type { UserRole } from "@/types/domain";
import { inviteMember, updateMemberInterestStatus, updateMemberRoles } from "./actions";

export const dynamic = "force-dynamic";

type MemberProfile = { id: string; email: string | null; display_name: string | null; role: UserRole; created_at: string; roles: UserRole[] };
type MemberInterestApplication = { id: string; full_name: string; email: string; whatsapp: string | null; course: string | null; semester: string | null; interests: string[]; message: string | null; status: "novo" | "em_contato" | "convidado" | "arquivado"; created_at: string };
type AbuseSummary = { events_24h: number; honeypot_24h: number; rate_limited_24h: number; validation_rejected_24h: number; distinct_sources_24h: number; last_event_at: string | null };
type AbuseDailyMetric = { metric_day: string; honeypot_count: number; rate_limited_count: number; validation_rejected_count: number };
type SearchParams = Promise<{ q?: string; role?: string }>;
const interestStatusLabels = { novo: "Novo", em_contato: "Em contato", convidado: "Convidado", arquivado: "Arquivado" } as const;

export default async function MembersAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const selectedRole = manageableRoles.some((role) => role.value === params.role) ? params.role! : "all";
  const { supabase, userId } = await requirePresident();
  const [{ data: profiles }, { data: assignments }, { data: interestApplications }, { data: abuseSummary }, { data: abuseDailyMetrics }] = await Promise.all([
    supabase.from("profiles").select("id,email,display_name,role,created_at").order("created_at", { ascending: false }).returns<MemberProfile[]>(),
    supabase.from("profile_role_assignments").select("profile_id,role"),
    supabase.from("member_interest_applications").select("id,full_name,email,whatsapp,course,semester,interests,message,status,created_at").order("created_at", { ascending: false }).limit(12).returns<MemberInterestApplication[]>(),
    supabase.rpc("get_member_interest_abuse_summary").maybeSingle<AbuseSummary>(),
    supabase.rpc("get_member_interest_abuse_daily_metrics", { p_days: 7 }).returns<AbuseDailyMetric[]>(),
  ]);
  const rolesByProfile = new Map<string, UserRole[]>();
  for (const assignment of assignments ?? []) rolesByProfile.set(assignment.profile_id, [...(rolesByProfile.get(assignment.profile_id) ?? []), assignment.role as UserRole]);
  const allMembers = (profiles ?? []).map((member) => ({ ...member, roles: normalizeRoles(rolesByProfile.get(member.id), member.role) }));
  const members = allMembers.filter((member) => (selectedRole === "all" || member.roles.includes(selectedRole as UserRole)) && (!q || [member.display_name, member.email].filter(Boolean).join(" ").toLowerCase().includes(q)));
  const adminCount = allMembers.filter((member) => member.roles.includes("admin")).length;
  const abuseMetrics = Array.isArray(abuseDailyMetrics) ? abuseDailyMetrics : [];

  return <main className="members-page">
    <header className="members-header"><div><p className="eyebrow eyebrow--blue">BACKOFFICE / PESSOAS</p><h1>Time em campo.</h1><p>Convide integrantes, acompanhe interesses recebidos e defina os acessos necessários para cada frente da operação.</p></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header>
    <section className="members-summary"><article><UsersRound size={24} /><span><strong>{allMembers.length}</strong><small>membros cadastrados</small></span></article><article><ShieldCheck size={24} /><span><strong>{adminCount}</strong><small>administradores ativos</small></span></article></section>
    <section className="members-abuse-card" aria-labelledby="abuse-metrics-title">
      <div className="members-list-card__head"><div><span>SEGURANÇA DA LANDING</span><h2 id="abuse-metrics-title">Tentativas bloqueadas</h2></div><ShieldAlert size={19} /></div>
      <p>Eventos minimizados de proteção, visíveis apenas para a Presidência. Endereços de origem permanecem pseudonimizados e os eventos expiram em 30 dias.</p>
      <div className="members-abuse-kpis">
        <article><strong>{abuseSummary?.events_24h ?? 0}</strong><span>eventos nas últimas 24h</span></article>
        <article><strong>{abuseSummary?.honeypot_24h ?? 0}</strong><span>honeypots acionados</span></article>
        <article><strong>{abuseSummary?.rate_limited_24h ?? 0}</strong><span>limites de taxa</span></article>
        <article><strong>{abuseSummary?.validation_rejected_24h ?? 0}</strong><span>validações recusadas</span></article>
        <article><strong>{abuseSummary?.distinct_sources_24h ?? 0}</strong><span>origens distintas</span></article>
      </div>
      <small className="members-abuse-card__last">
        {abuseSummary?.last_event_at ? `Último evento: ${new Date(abuseSummary.last_event_at).toLocaleString("pt-BR")}` : "Nenhum evento de abuso registrado nas últimas 24 horas."}
      </small>
      <div className="members-table-wrap"><table><thead><tr><th>Dia</th><th>Honeypot</th><th>Rate limit</th><th>Validação recusada</th></tr></thead><tbody>{abuseMetrics.map((metric) => <tr key={metric.metric_day}><td>{new Date(`${metric.metric_day}T12:00:00`).toLocaleDateString("pt-BR")}</td><td>{metric.honeypot_count}</td><td>{metric.rate_limited_count}</td><td>{metric.validation_rejected_count}</td></tr>)}</tbody></table></div>
    </section>
    <section className="members-layout">
      <article className="members-invite-card"><div className="members-card-title"><MailPlus size={19} /><div><span>CONVITE POR E-MAIL</span><h2>Novo integrante</h2></div></div><form action={inviteMember} className="members-form"><label>Nome completo<input name="displayName" required minLength={2} placeholder="Ex.: Ana da Silva" /></label><label>E-mail institucional ou pessoal<input name="email" type="email" required placeholder="ana@exemplo.com" /></label><fieldset><legend>Atribuições iniciais</legend>{manageableRoles.map((role) => <label key={role.value}><input name="roles" type="checkbox" value={role.value} defaultChecked={role.value === "cliente"} /> {role.label}</label>)}</fieldset><button type="submit">Enviar convite</button></form><p>O convite é enviado pelo Supabase Auth. Selecione uma ou mais atribuições; a pessoa escolhe a senha no primeiro acesso.</p></article>
      <section className="members-list-card"><div className="members-list-card__head"><div><span>ACESSOS ATUAIS</span><h2>Membros e permissões</h2></div><span>{members.length} registros</span></div><form className="data-filterbar data-filterbar--compact" method="get"><label><span>Buscar</span><input name="q" defaultValue={q} placeholder="Nome ou e-mail" /></label><label><span>Papel</span><select name="role" defaultValue={selectedRole}><option value="all">Todos os papéis</option>{manageableRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label><button type="submit"><Filter size={15} /> Filtrar</button><Link href="/admin/membros">Limpar</Link></form><div className="members-table-wrap"><table><thead><tr><th>Integrante</th><th>Atribuições</th><th>Escopo</th><th>Ação</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.display_name || "Sem nome"}</strong><small>{member.email || "E-mail não informado"}{member.id === userId ? " · você" : ""}</small></td><td>{member.roles.map((role) => <span key={role} className={`member-role member-role--${role}`}>{manageableRoles.find((item) => item.value === role)?.label}</span>)}</td><td><small>{rolesDescription(member.roles)}</small></td><td><form action={updateMemberRoles} className="member-role-form"><input name="memberId" type="hidden" value={member.id} /><fieldset disabled={member.id === userId}><legend className="sr-only">Atribuições de {member.display_name || member.email}</legend>{manageableRoles.map((role) => <label key={role.value}><input name="roles" type="checkbox" value={role.value} defaultChecked={member.roles.includes(role.value)} /> {role.label}</label>)}</fieldset><button type="submit" disabled={member.id === userId}>Salvar atribuições</button></form></td></tr>)}{members.length === 0 && <tr><td colSpan={4} className="members-empty">Nenhum membro corresponde aos filtros.</td></tr>}</tbody></table></div></section>
    </section>
    <section className="members-interest-card"><div className="members-list-card__head"><div><span>CADASTROS DA LANDING</span><h2>Interesse em participar</h2></div><span>{interestApplications?.length ?? 0} mais recentes</span></div><p className="members-interest-card__intro"><Inbox size={17} /> Cadastros públicos chegam aqui antes de qualquer convite ou criação de conta.</p><div className="members-table-wrap"><table><thead><tr><th>Pessoa</th><th>Contato e curso</th><th>Frentes de interesse</th><th>Etapa</th><th>Enviado em</th></tr></thead><tbody>{(interestApplications ?? []).map((application) => <tr key={application.id}><td><strong>{application.full_name}</strong><small>{application.email}</small></td><td><small>{[application.whatsapp, application.course, application.semester].filter(Boolean).join(" · ") || "Dados acadêmicos não informados"}</small></td><td><small>{application.interests.length ? application.interests.join(" · ") : "Sem frentes selecionadas"}{application.message ? ` — ${application.message}` : ""}</small></td><td><form action={updateMemberInterestStatus} className="member-role-form"><input name="applicationId" type="hidden" value={application.id} /><select name="status" defaultValue={application.status} aria-label={`Status do cadastro de ${application.full_name}`}>{Object.entries(interestStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="submit">Salvar</button></form></td><td><small><span className={`member-interest-status member-interest-status--${application.status}`}>{interestStatusLabels[application.status]}</span><br />{new Date(application.created_at).toLocaleDateString("pt-BR")}</small></td></tr>)}{(interestApplications ?? []).length === 0 && <tr><td colSpan={5} className="members-empty">Nenhum cadastro de interesse recebido até o momento.</td></tr>}</tbody></table></div></section>
  </main>;
}
