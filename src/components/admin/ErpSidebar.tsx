"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, CalendarDays, ChevronRight, LayoutDashboard, ListChecks, ShoppingBag, UsersRound } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { roleLabel } from "@/lib/auth/roles";
import type { UserRole } from "@/types/domain";

type ErpSidebarProps = {
  displayName: string;
  role: UserRole;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navigationItems: NavigationItem[] = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/catalogo", label: "Catálogo", icon: Boxes, adminOnly: true },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays, adminOnly: true },
  { href: "/admin/membros", label: "Pessoas", icon: UsersRound, adminOnly: true },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function ErpSidebar({ displayName, role }: ErpSidebarProps) {
  const pathname = usePathname();
  const availableItems = role === "cozinha"
    ? navigationItems.filter((item) => item.href === "/admin")
    : navigationItems.filter((item) => !item.adminOnly || role === "admin");

  return (
    <aside className="erp-sidebar">
      <div className="erp-sidebar__top">
        <Link href="/admin" className="erp-sidebar__brand" aria-label="ERP ATLETICA FSA - visão geral"><FsaWordmark /></Link>
        <div className="erp-sidebar__context"><span>ERP FSA</span><strong>Operação</strong></div>
      </div>

      <nav className="erp-sidebar__nav" aria-label="Navegação do ERP">
        <span className="erp-sidebar__label">OPERAÇÃO</span>
        {availableItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return <Link href={href} className={isActive ? "is-active" : ""} key={href}><Icon size={17} /><span>{label}</span>{isActive && <ChevronRight size={15} />}</Link>;
        })}
        {(role === "admin" || role === "cozinha") && <Link href="/ods"><ListChecks size={17} /><span>ODS de pedidos</span></Link>}
      </nav>

      <div className="erp-sidebar__footer">
        <Link href="/conta" className="erp-sidebar__account"><span className="erp-sidebar__avatar">{displayName.slice(0, 1).toUpperCase()}</span><span><strong>{displayName}</strong><small>{roleLabel(role)}</small></span></Link>
        <SignOutButton />
      </div>
    </aside>
  );
}
