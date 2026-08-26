import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function ErpEntryPage() {
  await requireRole(["admin", "caixa", "backoffice"]);
  redirect("/admin");
}
