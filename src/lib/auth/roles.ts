import type { UserRole } from "@/types/domain";

export function canAccessRole(role: UserRole | null | undefined, allowedRoles: readonly UserRole[]) {
  return Boolean(role && allowedRoles.includes(role));
}

export function roleLabel(role: UserRole) {
  return {
    admin: "Administração",
    cozinha: "Cozinha",
    caixa: "Caixa",
    cliente: "Cliente",
  }[role];
}
