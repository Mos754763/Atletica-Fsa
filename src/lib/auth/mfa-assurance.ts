export type AssuranceLevel = string | null;

export function requiresMfaChallenge(currentLevel: AssuranceLevel, nextLevel: AssuranceLevel) {
  return currentLevel !== "aal2" && nextLevel === "aal2";
}

export function formatMfaFactorType(factorType: string) {
  if (factorType === "totp") return "Aplicativo autenticador";
  if (factorType === "phone") return "Telefone";
  if (factorType === "webauthn") return "Chave de segurança";
  return "Segundo fator";
}
