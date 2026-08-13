import Link from "next/link";
import { BarChart3, Boxes, CalendarCog, UsersRound } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";

export default async function AdminPage() {
  const { profile } = await requireRole(["admin"]);
  const shortcuts = [
    ["Catálogo", "Produtos, categorias, fotos e estoque", Boxes, "/admin/catalogo"],
    ["Eventos", "Agenda, inscrições e check-in", CalendarCog],
    ["Pessoas", "Usuários e permissões", UsersRound],
    ["Relatórios", "Vendas, eventos e operação", BarChart3],
  ];
  return <main className="protected-page"><p className="eyebrow">BACKOFFICE FSA</p><h1>Operação sob controle.</h1><p>Bem-vindo(a), {profile.display_name || profile.email}. Gerencie o catálogo agora e acompanhe os próximos módulos por aqui.</p><div className="protected-grid">{shortcuts.map(([title, text, Icon, href]) => { const ItemIcon = Icon as typeof Boxes; const content = <><ItemIcon size={25} /><h2>{title as string}</h2><p>{text as string}</p></>; return href ? <Link href={href as string} key={title as string}>{content}</Link> : <article key={title as string}>{content}</article>; })}</div><Link href="/conta" className="protected-back">Voltar à minha conta</Link></main>;
}
