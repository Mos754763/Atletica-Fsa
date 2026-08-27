"use client";

import { useEffect, useState } from "react";
import { ErpSidebar } from "@/components/admin/ErpSidebar";
import { ErpMotionWorkspace } from "@/components/admin/ErpMotionWorkspace";
import type { UserRoles } from "@/types/domain";

export const ERP_SIDEBAR_STORAGE_KEY = "fsa-erp-sidebar-collapsed";

export function readErpSidebarCollapsed(value: string | null) {
  return value === "true";
}

export function persistErpSidebarCollapsed(storage: Pick<Storage, "setItem">, collapsed: boolean) {
  storage.setItem(ERP_SIDEBAR_STORAGE_KEY, String(collapsed));
}

type ErpShellProps = {
  children: React.ReactNode;
  displayName: string;
  roles: UserRoles;
  isPresident: boolean;
  canAccessBuilder: boolean;
};

export function ErpShell({ children, displayName, roles, isPresident, canAccessBuilder }: ErpShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(readErpSidebarCollapsed(window.localStorage.getItem(ERP_SIDEBAR_STORAGE_KEY)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function handleCollapsedChange(nextValue: boolean) {
    setCollapsed(nextValue);
    persistErpSidebarCollapsed(window.localStorage, nextValue);
  }

  return <div className={`erp-shell${collapsed ? " is-collapsed" : ""}`}>
    <ErpSidebar displayName={displayName} roles={roles} isPresident={isPresident} canAccessBuilder={canAccessBuilder} collapsed={collapsed} onCollapsedChange={handleCollapsedChange} />
    <ErpMotionWorkspace>{children}</ErpMotionWorkspace>
  </div>;
}
