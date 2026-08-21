import { USER_ROLES, type UserRole, type UserRoles } from "@/types/domain";

export function canAccessRole(role: UserRole | null | undefined, allowedRoles: readonly UserRole[]) {
  return canAccessRoles(role ? [role] : [], allowedRoles);
}

export function normalizeRoles(roles: readonly UserRole[] | UserRole | null | undefined, fallback: UserRole = "cliente"): UserRole[] {
  const values = Array.isArray(roles) ? roles : roles ? [roles] : [];
  const normalized = USER_ROLES.filter((role) => values.includes(role));
  return normalized.length ? normalized : [fallback];
}

export function canAccessRoles(roles: UserRoles | null | undefined, allowedRoles: readonly UserRole[]) {
  return normalizeRoles(roles).some((role) => allowedRoles.includes(role));
}

export function roleLabel(role: UserRole) {
  return {
    admin: "Administração",
    backoffice: "Backoffice",
    caixa: "Caixa",
    cliente: "Cliente",
  }[role];
}

export function roleLabels(roles: UserRoles | null | undefined) {
  return normalizeRoles(roles).map(roleLabel);
}
