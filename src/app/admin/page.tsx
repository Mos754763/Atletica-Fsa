import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, CalendarCog, ListChecks, PackageCheck, ShoppingBag, UsersRound } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { profile, supabase } = await requireRole(["admin", "caixa", "cozinha"]);
  if (profile.role === "cozinha") {
    return <main className="erp-dashboard"><header className="erp-dashboard__header"><div><p className="eyebrow eyebrow--blue">BACKOFFICE FSA / OPERAÇÃO</p><h1>Pedidos em produção.</h1><p>Use o painel operacional para acompanhar a fila e atualizar cada pedido com rapidez durante o atendimento.</p></div><Link href="/conta">Minha conta <ArrowRight size={15} /></Link></header><section className="erp-dashboard__section"><div className="erp-dashboard__section-head"><div><p className="eyebrow eyebrow--blue">ATENDIMENTO</p><h2>Seu fluxo de trabalho.</h2></div><p>Os pedidos recebidos aparecem ao vivo no ODS.</p></div><div className="erp-dashboard__shortcuts"><Link href="/ods" className="erp-dashboard__shortcut"><ListChecks size={21} /><h3>ODS de pedidos</h3><p>Organize a produção, atualize os status e sinalize pedidos prontos para retirada.</p><span>Abrir operação <ArrowRight size={14} /></span></Link></div></section></main>;
  }
  const [{ count: productCount }, { count: orderCount }, { count: eventCount }, { count: memberCount }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["criado", "aguardando_pagamento", "pago", "em_preparo", "pronto"]),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const shortcuts = [
    ["Pedidos", "Acompanhe fila, retirada e pagamentos.", ShoppingBag, "/admin/pedidos"],
    ["Catálogo", "Produtos, imagens, estoque e categorias.", Boxes, "/admin/catalogo"],
    ["Eventos", "Agenda, inscrições e check-in em campo.", CalendarCog, "/admin/eventos"],
    ["Pessoas", "Convites, equipe e permissões de acesso.", UsersRound, "/admin/membros"],
    ["Relatórios", "Vendas, eventos e indicadores reais.", BarChart3, "/admin/relatorios"],
    ["ODS de pedidos", "Tela de produção para a operação ao vivo.", ListChecks, "/ods"],
  ];
  const visibleShortcuts = profile.role === "admin" ? shortcuts : shortcuts.filter(([title]) => title === "Pedidos" || title === "Relatórios");
  const stats = [["Produtos", productCount ?? 0, Boxes], ["Pedidos em andamento", orderCount ?? 0, PackageCheck], ["Eventos cadastrados", eventCount ?? 0, CalendarCog], ["Pessoas na plataforma", memberCount ?? 0, UsersRound]];
  return <main className="erp-dashboard"><header className="erp-dashboard__header"><div><p className="eyebrow eyebrow--blue">ERP FSA / VISÃO GERAL</p><h1>Operação em um só lugar.</h1><p>Olá, {profile.display_name || profile.email}. Acompanhe o essencial e acesse os módulos da ATLETICA FSA sem perder o contexto.</p></div><Link href="/conta">Minha conta <ArrowRight size={15} /></Link></header><section className="erp-dashboard__cards" aria-label="Resumo da operação">{stats.map(([label, value, Icon]) => { const StatIcon = Icon as typeof Boxes; return <article className="erp-dashboard__card" key={label as string}><StatIcon size={19} /><span>{label as string}</span><strong>{value as number}</strong></article>; })}</section><section className="erp-dashboard__section"><div className="erp-dashboard__section-head"><div><p className="eyebrow eyebrow--blue">MÓDULOS</p><h2>O que você precisa agora?</h2></div><p>Todos os dados são reais e atualizados pelo sistema.</p></div><div className="erp-dashboard__shortcuts">{visibleShortcuts.map(([title, text, Icon, href]) => { const ShortcutIcon = Icon as typeof Boxes; return <Link href={href as string} className="erp-dashboard__shortcut" key={title as string}><ShortcutIcon size={21} /><h3>{title as string}</h3><p>{text as string}</p><span>Abrir módulo <ArrowRight size={14} /></span></Link>; })}</div></section></main>;
}
