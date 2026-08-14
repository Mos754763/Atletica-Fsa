import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

export async function getApiProfile(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 }) } as const;
  const supabase = createServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { error: NextResponse.json({ error: "Sessão inválida." }, { status: 401 }) } as const;
  const { data: profile } = await supabase.from("profiles").select("id,email,display_name,role").eq("id", userData.user.id).single();
  if (!profile) return { error: NextResponse.json({ error: "Perfil não localizado." }, { status: 403 }) } as const;
  return { supabase, accessToken: token, profile: { ...profile, role: profile.role as UserRole } } as const;
}
