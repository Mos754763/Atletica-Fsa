"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Boxes, CalendarDays, ChevronRight, LayoutDashboard, ListChecks, ShoppingBag, UsersRound } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { RabbitMascot } from "@/components/brand/RabbitMascot";
import { roleLabel } from "@/lib/auth/roles";
import { MOTION_SPRING } from "@/lib/motion-config";
import type { UserRole } from "@/types/domain";

type ErpSidebarProps = { displayName: string; role: UserRole };
type NavigationItem = { href: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };

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
  const reducedMotion = useReducedMotion();
  const availableItems = role === "cozinha" ? navigationItems.filter((item) => item.href === "/admin") : navigationItems.filter((item) => !item.adminOnly || role === "admin");

  return (
    <aside className="erp-sidebar">
      <motion.div className="erp-sidebar__top" initial={false} animate={{ opacity: 1, x: 0 }} transition={reducedMotion ? { duration: 0 } : { ...MOTION_SPRING, delay: 0.04 }}>
        <Link href="/admin" className="erp-sidebar__brand" aria-label="ERP ATLETICA FSA - visão geral"><FsaWordmark /></Link>
        <div className="erp-sidebar__context"><span>ERP FSA</span><strong>Operação</strong></div>
        <motion.div className="erp-sidebar__mascot" animate={reducedMotion ? undefined : { y: [0, -4, 0], rotate: [0, -1, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}><RabbitMascot compact /></motion.div>
      </motion.div>

      <motion.nav className="erp-sidebar__nav" aria-label="Navegação do ERP" initial={false} animate={{ opacity: 1, x: 0 }} transition={reducedMotion ? { duration: 0 } : { ...MOTION_SPRING, delay: 0.1 }}>
        <span className="erp-sidebar__label">OPERAÇÃO</span>
        {availableItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return <Link href={href} className={isActive ? "is-active" : ""} key={href}><Icon size={17} /><span>{label}</span>{isActive && <ChevronRight size={15} />}</Link>;
        })}
        {(role === "admin" || role === "cozinha") && <Link href="/ods"><ListChecks size={17} /><span>ODS de pedidos</span></Link>}
      </motion.nav>

      <div className="erp-sidebar__footer">
        <Link href="/conta" className="erp-sidebar__account"><span className="erp-sidebar__avatar">{displayName.slice(0, 1).toUpperCase()}</span><span><strong>{displayName}</strong><small>{roleLabel(role)}</small></span></Link>
        <SignOutButton />
      </div>
    </aside>
  );
}
