import Link from "next/link";
import { ArrowLeft, Filter, MailPlus, ShieldCheck, UsersRound } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { manageableRoles, roleDescription } from "@/lib/members";
import type { UserRole } from "@/types/domain";
import { inviteMember, updateMemberRole } from "./actions";

export const dynamic = "force-dynamic";

type MemberProfile = { id: string; email: string | null; display_name: string | null; role: UserRole; created_at: string };
type SearchParams = Promise<{ q?: string; role?: string }>;

export default async function MembersAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase(); const selectedRole = manageableRoles.some((role) => role.value === params.role) ? params.role! : "all";
  const { supabase, userId } = await requireRole(["admin"]);
  const { data } = await supabase.from("profiles").select("id,email,display_name,role,created_at").order("created_at", { ascending: false }).returns<MemberProfile[]>();
  const allMembers = data ?? [];
  const members = allMembers.filter((member) => (selectedRole === "all" || member.role === selectedRole) && (!q || [member.display_name, member.email].filter(Boolean).join(" ").toLowerCase().includes(q)));
  const adminCount = allMembers.filter((member) => member.role === "admin").length;

  return <main className="members-page">
    <header className="members-header"><div><p className="eyebrow eyebrow--blue">BACKOFFICE / PESSOAS</p><h1>Time em campo.</h1><p>Convide integrantes e defina os acessos necessários para cada frente da operação.</p></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header>
    <section className="members-summary"><article><UsersRound size={24} /><span><strong>{allMembers.length}</strong><small>membros cadastrados</small></span></article><article><ShieldCheck size={24} /><span><strong>{adminCount}</strong><small>administradores ativos</small></span></article></section>
    <section className="members-layout">
      <article className="members-invite-card"><div className="members-card-title"><MailPlus size={19} /><div><span>CONVITE POR E-MAIL</span><h2>Novo integrante</h2></div></div><form action={inviteMember} className="members-form"><label>Nome completo<input name="displayName" required minLength={2} placeholder="Ex.: Ana da Silva" /></label><label>E-mail institucional ou pessoal<input name="email" type="email" required placeholder="ana@exemplo.com" /></label><label>Papel inicial<select name="role" defaultValue="cliente">{manageableRoles.map((role) => <option key={role.value} value={role.value}>{role.label} — {role.description}</option>)}</select></label><button type="submit">Enviar convite</button></form><p>O convite é enviado pelo Supabase Auth. A pessoa escolhe a senha no primeiro acesso e recebe o papel definido acima.</p></article>
      <section className="members-list-card"><div className="members-list-card__head"><div><span>ACESSOS ATUAIS</span><h2>Membros e permissões</h2></div><span>{members.length} registros</span></div><form className="data-filterbar data-filterbar--compact" method="get"><label><span>Buscar</span><input name="q" defaultValue={q} placeholder="Nome ou e-mail" /></label><label><span>Papel</span><select name="role" defaultValue={selectedRole}><option value="all">Todos os papéis</option>{manageableRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label><button type="submit"><Filter size={15} /> Filtrar</button><Link href="/admin/membros">Limpar</Link></form><div className="members-table-wrap"><table><thead><tr><th>Integrante</th><th>Papel</th><th>Escopo</th><th>Ação</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.display_name || "Sem nome"}</strong><small>{member.email || "E-mail não informado"}{member.id === userId ? " · você" : ""}</small></td><td><span className={`member-role member-role--${member.role}`}>{manageableRoles.find((role) => role.value === member.role)?.label}</span></td><td><small>{roleDescription(member.role)}</small></td><td><form action={updateMemberRole} className="member-role-form"><input name="memberId" type="hidden" value={member.id} /><select name="role" defaultValue={member.role} disabled={member.id === userId}>{manageableRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><button type="submit" disabled={member.id === userId}>Salvar</button></form></td></tr>)}{members.length === 0 && <tr><td colSpan={4} className="members-empty">Nenhum membro corresponde aos filtros.</td></tr>}</tbody></table></div></section>
    </section>
  </main>;
}
