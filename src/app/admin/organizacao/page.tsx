import Link from "next/link";
import { ArrowLeft, Building2, KeyRound, UserRoundPlus, UsersRound } from "lucide-react";
import { requirePresident } from "@/lib/auth/require-president";
import { PERMISSION_ACTIONS, SECTOR_MEMBERSHIP_ROLES } from "@/lib/governance/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import { assignSectorMember, createSector, grantSectorPermission, revokeSectorPermission, setSectorStatus } from "./actions";

export const dynamic = "force-dynamic";

type Profile = { id: string; email: string | null; display_name: string | null; is_president: boolean };
type Sector = { id: string; name: string; slug: string; description: string | null; is_active: boolean };
type Membership = { id: string; sector_id: string; profile_id: string; role: "diretor" | "membro" | "visualizador"; started_at: string; ended_at: string | null; profile: Profile | null };
type Grant = { id: string; sector_id: string | null; profile_id: string; resource_key: string; action: string; created_at: string; profile: Profile | null; sector: Pick<Sector, "name"> | null };

function profileName(profile: Profile | null) {
  return profile?.display_name || profile?.email || "Perfil sem identificação";
}

export default async function OrganizationAdminPage() {
  await requirePresident();
  const service = createServiceClient();
  const [{ data: sectors }, { data: profiles }, { data: memberships }, { data: grants }] = await Promise.all([
    service.from("sectors").select("id,name,slug,description,is_active").order("sort_order").returns<Sector[]>(),
    service.from("profiles").select("id,email,display_name,is_president").order("display_name").returns<Profile[]>(),
    service.from("sector_memberships").select("id,sector_id,profile_id,role,started_at,ended_at,profile:profiles!sector_memberships_profile_id_fkey(id,email,display_name,is_president)").is("ended_at", null).order("started_at", { ascending: false }).returns<Membership[]>(),
    service.from("permission_grants").select("id,sector_id,profile_id,resource_key,action,created_at,profile:profiles!permission_grants_profile_id_fkey(id,email,display_name,is_president),sector:sectors!permission_grants_sector_id_fkey(name)").is("revoked_at", null).order("created_at", { ascending: false }).returns<Grant[]>(),
  ]);
  const activeSectors = (sectors ?? []).filter((sector) => sector.is_active);
  const activeMemberships = memberships ?? [];

  return <main className="members-page">
    <header className="members-header"><div><p className="eyebrow eyebrow--blue">PRESIDÊNCIA / GOVERNANÇA</p><h1>Estrutura em campo.</h1><p>Organize setores, diretorias e permissões explícitas. A presidência mantém visibilidade integral e o histórico de movimentações é preservado.</p></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header>
    <section className="members-summary"><article><Building2 size={24} /><span><strong>{activeSectors.length}</strong><small>setores ativos</small></span></article><article><UsersRound size={24} /><span><strong>{activeMemberships.length}</strong><small>vínculos ativos</small></span></article></section>
    <section className="members-layout">
      <article className="members-invite-card"><div className="members-card-title"><Building2 size={19} /><div><span>ESTRUTURA</span><h2>Novo setor</h2></div></div><form action={createSector} className="members-form"><label>Nome<input name="name" required minLength={2} placeholder="Ex.: Comunicação" /></label><label>Identificador<input name="slug" required pattern="[a-z0-9-]+" placeholder="comunicacao" /></label><label>Contexto<textarea name="description" rows={3} placeholder="Responsabilidade e escopo do setor" /></label><button type="submit">Criar setor</button></form><p>Um setor pode ser renomeado, reorganizado ou desativado sem apagar seu histórico.</p></article>
      <section className="members-list-card"><div className="members-list-card__head"><div><span>SETORES ATIVOS</span><h2>Direção e membros</h2></div><span>{activeSectors.length} setores</span></div><div className="members-table-wrap"><table><thead><tr><th>Setor</th><th>Direção atual</th><th>Vínculos</th><th>Estado</th></tr></thead><tbody>{(sectors ?? []).map((sector) => { const sectorMembers = activeMemberships.filter((membership) => membership.sector_id === sector.id); const director = sectorMembers.find((membership) => membership.role === "diretor"); return <tr key={sector.id}><td><strong>{sector.name}</strong><small>{sector.description || sector.slug}</small></td><td><small>{director ? profileName(director.profile) : "Diretoria não atribuída"}</small></td><td><small>{sectorMembers.length} pessoa(s) ativa(s)</small></td><td><form action={setSectorStatus} className="member-role-form"><input type="hidden" name="sectorId" value={sector.id} /><input type="hidden" name="isActive" value={sector.is_active ? "false" : "true"} /><button type="submit">{sector.is_active ? "Desativar" : "Reativar"}</button></form></td></tr>; })}</tbody></table></div></section>
    </section>
    <section className="members-layout" style={{ marginTop: 20 }}>
      <article className="members-invite-card"><div className="members-card-title"><UserRoundPlus size={19} /><div><span>VÍNCULOS</span><h2>Alocar pessoa</h2></div></div><form action={assignSectorMember} className="members-form"><label>Setor<select name="sectorId" required>{activeSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></label><label>Integrante<select name="profileId" required>{(profiles ?? []).map((profile) => <option key={profile.id} value={profile.id}>{profileName(profile)}{profile.is_president ? " · presidente" : ""}</option>)}</select></label><label>Função no setor<select name="role" defaultValue="membro">{SECTOR_MEMBERSHIP_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></label><label>Nota<input name="note" placeholder="Ex.: gestão 2026" /></label><button type="submit">Salvar vínculo</button></form><p>Ao trocar diretoria ou setor, o vínculo anterior é encerrado e permanece no histórico.</p></article>
      <section className="members-list-card"><div className="members-list-card__head"><div><span>PERMISSÕES EXPLÍCITAS</span><h2>Concessões especiais</h2></div><span>{(grants ?? []).length} ativas</span></div><form action={grantSectorPermission} className="members-form" style={{ padding: 25, borderBottom: "1px solid var(--line)" }}><label>Integrante<select name="profileId" required>{(profiles ?? []).map((profile) => <option key={profile.id} value={profile.id}>{profileName(profile)}</option>)}</select></label><label>Setor (opcional)<select name="sectorId" defaultValue=""><option value="">Todos os setores</option>{activeSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></label><label>Recurso<input name="resourceKey" defaultValue="*" required placeholder="Ex.: tabela:calendario-posts" /></label><label>Ação<select name="action" defaultValue="ver">{PERMISSION_ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}</select></label><button type="submit">Conceder acesso</button></form><div className="members-table-wrap"><table><thead><tr><th>Pessoa</th><th>Escopo</th><th>Ação</th><th></th></tr></thead><tbody>{(grants ?? []).map((grant) => <tr key={grant.id}><td><strong>{profileName(grant.profile)}</strong></td><td><small>{grant.sector?.name || "Todos os setores"} · {grant.resource_key}</small></td><td><span className="member-role member-role--caixa">{grant.action}</span></td><td><form action={revokeSectorPermission}><input type="hidden" name="grantId" value={grant.id} /><button type="submit">Revogar</button></form></td></tr>)}{(grants ?? []).length === 0 && <tr><td colSpan={4} className="members-empty">Nenhuma permissão especial ativa.</td></tr>}</tbody></table></div></section>
    </section>
  </main>;
}
