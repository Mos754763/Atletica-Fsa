import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isAuthorizedCronRequest } from "@/lib/api/cron-auth";
import { syncSymplaEventCatalog } from "@/lib/integrations/sympla-sync";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!isAuthorizedCronRequest(authorization, env.cronSecret)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!env.symplaApiToken) return NextResponse.json({ error: "Integração Sympla não configurada." }, { status: 503 });

  const startedAt = Date.now();
  const supabase = createServiceClient();
  try {
    const result = await syncSymplaEventCatalog(undefined, "cron");
    await supabase.from("scheduled_route_heartbeats").insert({ route_path: "/api/cron/sympla-sync", status: "succeeded", duration_ms: Date.now() - startedAt });
    return NextResponse.json({ ok: true, mode: "read_only", ...result });
  } catch {
    await supabase.from("scheduled_route_heartbeats").insert({ route_path: "/api/cron/sympla-sync", status: "failed", duration_ms: Date.now() - startedAt, detail: "A sincronização Sympla falhou; consultar event_sync_runs." });
    return NextResponse.json({ error: "A sincronização Sympla falhou; a execução foi auditada para reprocessamento." }, { status: 503 });
  }
}
