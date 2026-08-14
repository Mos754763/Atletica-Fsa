import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { syncSymplaEventCatalog } from "@/lib/integrations/sympla-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!env.cronSecret || authorization !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!env.symplaApiToken) return NextResponse.json({ error: "Integração Sympla não configurada." }, { status: 503 });

  try {
    const result = await syncSymplaEventCatalog(undefined, "cron");
    return NextResponse.json({ ok: true, mode: "read_only", ...result });
  } catch {
    return NextResponse.json({ error: "A sincronização Sympla falhou; a execução foi auditada para reprocessamento." }, { status: 503 });
  }
}
