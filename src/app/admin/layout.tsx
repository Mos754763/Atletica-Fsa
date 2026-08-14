import { ErpMotionWorkspace } from "@/components/admin/ErpMotionWorkspace";
import { ErpSidebar } from "@/components/admin/ErpSidebar";
import { requireRole } from "@/lib/auth/require-role";
import type { UserRole } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await requireRole(["admin", "caixa", "cozinha"]);
  const displayName = profile.display_name || profile.email.split("@")[0] || "Equipe FSA";

  return <div className="erp-shell"><ErpSidebar displayName={displayName} role={profile.role as UserRole} /><ErpMotionWorkspace>{children}</ErpMotionWorkspace></div>;
}
