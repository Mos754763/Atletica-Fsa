"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { replaySymplaDeadLetter, syncSymplaEventCatalog } from "@/lib/integrations/sympla-sync";

export async function syncSymplaCatalog() {
  const { userId } = await requireRole(["admin"]);
  await syncSymplaEventCatalog(userId, "manual");
  revalidatePath("/admin/integracoes/sympla");
}

export async function replaySymplaFailure(formData: FormData) {
  const deadLetterId = String(formData.get("deadLetterId") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(deadLetterId)) throw new Error("Ocorrência inválida.");
  const { userId } = await requireRole(["admin"]);
  await replaySymplaDeadLetter(deadLetterId, userId);
  revalidatePath("/admin/integracoes/sympla");
}
