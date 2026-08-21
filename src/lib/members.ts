import type { UserRole } from "@/types/domain";

export const manageableRoles: Array<{ value: UserRole; label: string; description: string }> = [
  { value: "admin", label: "Administrador", description: "Acesso completo e gestão de membros." },
  { value: "caixa", label: "Caixa", description: "Catálogo, pedidos e relatórios." },
  { value: "cozinha", label: "Backoffice", description: "Acesso à operação do ODS." },
  { value: "cliente", label: "Cliente", description: "Loja, conta e inscrições em eventos." },
];

export function roleDescription(role: UserRole) {
  return manageableRoles.find((item) => item.value === role)?.description ?? "Acesso não identificado.";
}

export function rolesDescription(roles: readonly UserRole[]) {
  return roles.map(roleDescription).join(" ");
}

export function assertMemberRolesChange(input: {
  actorId: string;
  targetId: string;
  currentRoles: readonly UserRole[];
  nextRoles: readonly UserRole[];
  adminCount: number;
}) {
  if (input.actorId === input.targetId) throw new Error("Altere o próprio acesso por outro administrador.");
  if (!input.nextRoles.length) throw new Error("Todo integrante precisa manter ao menos uma atribuição.");
  if (input.currentRoles.includes("admin") && !input.nextRoles.includes("admin") && input.adminCount <= 1) {
    throw new Error("A plataforma precisa manter ao menos um administrador.");
  }
}
