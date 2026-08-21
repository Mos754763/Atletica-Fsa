"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Bot, Boxes, Building2, CalendarDays, ChevronRight, LayoutDashboard, ListChecks, PanelLeftClose, PanelLeftOpen, PlugZap, ScrollText, ShoppingBag, Table2, UsersRound } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { canAccessRoles, roleLabels } from "@/lib/auth/roles";
import { MOTION_SPRING } from "@/lib/motion-config";
import type { UserRoles } from "@/types/domain";

type ErpSidebarProps = {
  displayName: string;
  roles: UserRoles;
  isPresident: boolean;
  canAccessBuilder: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};
type NavigationItem = { href: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean; presidentOnly?: boolean };

const navigationItems: NavigationItem[] = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/catalogo", label: "Catálogo", icon: Boxes, adminOnly: true },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays, adminOnly: true },
  { href: "/admin/membros", label: "Pessoas", icon: UsersRound, adminOnly: true, presidentOnly: true },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function ErpSidebar({ displayName, roles, isPresident, canAccessBuilder, collapsed, onCollapsedChange }: ErpSidebarProps) {
  const pathname = usePathname() ?? "";
  const reducedMotion = useReducedMotion();
  const isAdmin = canAccessRoles(roles, ["admin"]);
  const isOperational = canAccessRoles(roles, ["admin", "backoffice", "caixa"]);
  const availableItems = !isOperational ? [] : navigationItems.filter((item) => (!item.adminOnly || isAdmin) && (!item.presidentOnly || isPresident));
  const getItemClassName = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href)) ? "is-active" : "";

  return (
    <aside className={`erp-sidebar${collapsed ? " is-collapsed" : ""}`}>
      <motion.div className="erp-sidebar__top" initial={false} animate={{ opacity: 1, x: 0 }} transition={reducedMotion ? { duration: 0 } : { ...MOTION_SPRING, delay: 0.04 }}>
        <Link href="/admin" className="erp-sidebar__brand" aria-label="ERP ATLETICA FSA - visão geral"><FsaWordmark /><span className="erp-sidebar__brand-mark" aria-hidden="true">FSA</span></Link>
        <button className="erp-sidebar__collapse" type="button" onClick={() => onCollapsedChange(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? "Expandir a navegação do ERP" : "Recolher a navegação do ERP"} title={collapsed ? "Expandir navegação" : "Recolher navegação"}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
        <div className="erp-sidebar__context"><span>ERP FSA</span><strong>Operação</strong></div>
      </motion.div>

      <motion.nav className="erp-sidebar__nav" aria-label="Navegação do ERP" initial={false} animate={{ opacity: 1, x: 0 }} transition={reducedMotion ? { duration: 0 } : { ...MOTION_SPRING, delay: 0.1 }}>
        <span className="erp-sidebar__label">OPERAÇÃO</span>
        {availableItems.map(({ href, label, icon: Icon }) => { const isActive = getItemClassName(href) === "is-active"; return <Link href={href} className={getItemClassName(href)} aria-current={isActive ? "page" : undefined} title={collapsed ? label : undefined} key={href}><Icon size={17} /><span>{label}</span>{isActive && <ChevronRight size={15} />}</Link>; })}
        {isPresident && <Link href="/admin/organizacao" className={getItemClassName("/admin/organizacao")} aria-current={pathname.startsWith("/admin/organizacao") ? "page" : undefined} title={collapsed ? "Governança" : undefined}><Building2 size={17} /><span>Governança</span>{pathname.startsWith("/admin/organizacao") && <ChevronRight size={15} />}</Link>}
        {isPresident && <Link href="/admin/automacoes" className={getItemClassName("/admin/automacoes")} aria-current={pathname.startsWith("/admin/automacoes") ? "page" : undefined} title={collapsed ? "Automações" : undefined}><Bot size={17} /><span>Automações</span>{pathname.startsWith("/admin/automacoes") && <ChevronRight size={15} />}</Link>}
        {isAdmin && <Link href="/admin/integracoes/sympla" className={getItemClassName("/admin/integracoes/sympla")} aria-current={pathname.startsWith("/admin/integracoes/sympla") ? "page" : undefined} title={collapsed ? "Integração Sympla" : undefined}><PlugZap size={17} /><span>Integração Sympla</span>{pathname.startsWith("/admin/integracoes/sympla") && <ChevronRight size={15} />}</Link>}
        {isPresident && isAdmin && <Link href="/admin/atividades" className={getItemClassName("/admin/atividades")} aria-current={pathname.startsWith("/admin/atividades") ? "page" : undefined} title={collapsed ? "Atividades" : undefined}><ScrollText size={17} /><span>Atividades</span>{pathname.startsWith("/admin/atividades") && <ChevronRight size={15} />}</Link>}
        {canAccessBuilder && <Link href="/admin/tabelas" className={getItemClassName("/admin/tabelas")} aria-current={pathname.startsWith("/admin/tabelas") ? "page" : undefined} title={collapsed ? "Tabelas" : undefined}><Table2 size={17} /><span>Tabelas</span>{pathname.startsWith("/admin/tabelas") && <ChevronRight size={15} />}</Link>}
        {isOperational && <Link href="/ods" className={getItemClassName("/ods")} aria-current={pathname === "/ods" ? "page" : undefined} title={collapsed ? "ODS de pedidos" : undefined}><ListChecks size={17} /><span>ODS de pedidos</span>{pathname === "/ods" && <ChevronRight size={15} />}</Link>}
      </motion.nav>

      <div className="erp-sidebar__footer"><Link href="/conta" className="erp-sidebar__account" title={collapsed ? "Minha conta" : undefined}><span className="erp-sidebar__avatar">{displayName.slice(0, 1).toUpperCase()}</span><span className="erp-sidebar__account-copy"><strong>{displayName}</strong><small>{roleLabels(roles).join(" · ")}</small></span></Link><SignOutButton /></div>
    </aside>
  );
}
