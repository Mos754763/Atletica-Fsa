import { z } from "zod";

export const MEMBER_INTEREST_OPTIONS = ["Esportes", "Eventos", "Marketing", "Sociais", "Suprimentos", "Bateria"] as const;

export const memberInterestSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(255).transform((value) => value.toLowerCase()),
  whatsapp: z.string().trim().max(32).optional(),
  course: z.string().trim().max(120).optional(),
  semester: z.string().trim().max(32).optional(),
  interests: z.array(z.enum(MEMBER_INTEREST_OPTIONS)).max(4),
  message: z.string().trim().max(700).optional(),
  consent: z.literal("on", { errorMap: () => ({ message: "Confirme que podemos usar seus dados para responder ao cadastro." }) }),
});

export type MemberInterestInput = z.infer<typeof memberInterestSchema>;

export function parseMemberInterest(input: unknown) {
  return memberInterestSchema.safeParse(input);
}
