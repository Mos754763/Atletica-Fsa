import { ErpMotionWorkspace } from "@/components/admin/ErpMotionWorkspace";
import { ErpSidebar } from "@/components/admin/ErpSidebar";
import { requireAdminShell } from "@/lib/auth/require-admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile, canAccessBuilder } = await requireAdminShell();
  const displayName = profile.display_name || profile.email.split("@")[0] || "Equipe FSA";

  return <div className="erp-shell"><ErpSidebar displayName={displayName} role={profile.role} isPresident={profile.is_president} canAccessBuilder={canAccessBuilder} /><ErpMotionWorkspace>{children}</ErpMotionWorkspace></div>;
}
