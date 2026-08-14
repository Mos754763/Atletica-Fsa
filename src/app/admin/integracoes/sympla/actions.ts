"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { syncSymplaEventCatalog } from "@/lib/integrations/sympla-sync";

export async function syncSymplaCatalog() {
  const { userId } = await requireRole(["admin"]);
  await syncSymplaEventCatalog(userId, "manual");
  revalidatePath("/admin/integracoes/sympla");
}
