"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { parseMemberInterest } from "@/lib/member-interest";

export type MemberInterestActionState = { status: "idle" | "success" | "error"; message: string };

export const initialMemberInterestState: MemberInterestActionState = { status: "idle", message: "" };

export async function submitMemberInterest(_previousState: MemberInterestActionState, formData: FormData): Promise<MemberInterestActionState> {
  if (String(formData.get("company") ?? "").trim()) return { status: "success", message: "Recebemos seu interesse. Em breve entraremos em contato." };

  const parsed = parseMemberInterest({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    whatsapp: formData.get("whatsapp") || undefined,
    course: formData.get("course") || undefined,
    semester: formData.get("semester") || undefined,
    interests: formData.getAll("interests"),
    message: formData.get("message") || undefined,
    consent: formData.get("consent"),
  });

  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revise os dados do cadastro." };

  const { fullName, email, whatsapp, course, semester, interests, message } = parsed.data;
  const service = createServiceClient();
  const { error } = await service.from("member_interest_applications").insert({
    full_name: fullName,
    email,
    whatsapp: whatsapp || null,
    course: course || null,
    semester: semester || null,
    interests,
    message: message || null,
    consent_at: new Date().toISOString(),
  });

  if (error?.code === "23505") return { status: "success", message: "Seu interesse já está registrado. A gestão vai entrar em contato em breve." };
  if (error) return { status: "error", message: "Não foi possível registrar seu interesse agora. Tente novamente em alguns instantes." };

  revalidatePath("/admin/membros");
  return { status: "success", message: "Cadastro recebido. A gestão da FSA vai analisar seu interesse e entrar em contato." };
}
