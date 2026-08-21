import { ErpShell } from "@/components/admin/ErpShell";
import { requireAdminShell } from "@/lib/auth/require-admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { profile, canAccessBuilder } = await requireAdminShell();
  const displayName = profile.display_name || profile.email.split("@")[0] || "Equipe FSA";

  return <ErpShell displayName={displayName} roles={profile.roles} isPresident={profile.is_president} canAccessBuilder={canAccessBuilder}>{children}</ErpShell>;
}
