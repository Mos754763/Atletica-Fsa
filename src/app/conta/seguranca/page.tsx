import { AccountSecurityCenter } from "@/components/auth/AccountSecurityCenter";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const supabase = await createServerAuthClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login?next=%2Fconta%2Fseguranca");
  return <AccountSecurityCenter />;
}
