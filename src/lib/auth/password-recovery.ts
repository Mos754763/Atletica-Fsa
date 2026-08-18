export function buildPasswordRecoveryRedirect(origin: string) {
  return `${origin}/auth/callback?next=/redefinir-senha`;
}

export const passwordResetSuccess = {
  eyebrow: "SENHA ATUALIZADA",
  title: "Tudo certo. Sua senha foi atualizada.",
  description: "Sua sessão permanece protegida e o acesso à sua conta FSA já está liberado.",
  sessionNote: "Para sua segurança, use a nova senha nas próximas entradas.",
  primaryAction: { href: "/conta?senha=atualizada", label: "Ir para minha conta" },
  secondaryAction: { href: "/loja", label: "Explorar a loja" },
} as const;
