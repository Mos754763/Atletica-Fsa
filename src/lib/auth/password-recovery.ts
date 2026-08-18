export function buildPasswordRecoveryRedirect(origin: string) {
  return `${origin}/auth/callback?next=/redefinir-senha`;
}
