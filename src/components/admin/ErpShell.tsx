"use client";

import { useEffect, useState } from "react";
import { ErpSidebar } from "@/components/admin/ErpSidebar";
import { ErpMotionWorkspace } from "@/components/admin/ErpMotionWorkspace";
import type { UserRoles } from "@/types/domain";

const STORAGE_KEY = "fsa-erp-sidebar-collapsed";

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
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function handleCollapsedChange(nextValue: boolean) {
    setCollapsed(nextValue);
    window.localStorage.setItem(STORAGE_KEY, String(nextValue));
  }

  return <div className={`erp-shell${collapsed ? " is-collapsed" : ""}`}>
    <ErpSidebar displayName={displayName} roles={roles} isPresident={isPresident} canAccessBuilder={canAccessBuilder} collapsed={collapsed} onCollapsedChange={handleCollapsedChange} />
    <ErpMotionWorkspace>{children}</ErpMotionWorkspace>
  </div>;
}
