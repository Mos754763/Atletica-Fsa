import Link from "next/link";
import { BarChart3, Boxes, CalendarCog, UsersRound } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";

export default async function AdminPage() {
  const { profile } = await requireRole(["admin"]);
  const shortcuts = [
    ["Catálogo", "Produtos, categorias, fotos e estoque", Boxes],
    ["Eventos", "Agenda, inscrições e check-in", CalendarCog],
    ["Pessoas", "Usuários e permissões", UsersRound],
    ["Relatórios", "Vendas, eventos e operação", BarChart3],
  ];
  return <main className="protected-page"><p className="eyebrow">BACKOFFICE FSA</p><h1>Operação sob controle.</h1><p>Bem-vindo(a), {profile.display_name || profile.email}. Os módulos administrativos serão ativados nas próximas fases.</p><div className="protected-grid">{shortcuts.map(([title, text, Icon]) => { const ItemIcon = Icon as typeof Boxes; return <article key={title as string}><ItemIcon size={25} /><h2>{title as string}</h2><p>{text as string}</p></article>; })}</div><Link href="/conta" className="protected-back">Voltar à minha conta</Link></main>;
}
