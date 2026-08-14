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

export function assertMemberRoleChange(input: {
  actorId: string;
  targetId: string;
  currentRole: UserRole;
  nextRole: UserRole;
  adminCount: number;
}) {
  if (input.actorId === input.targetId) throw new Error("Altere o próprio acesso por outro administrador.");
  if (input.currentRole === "admin" && input.nextRole !== "admin" && input.adminCount <= 1) {
    throw new Error("A plataforma precisa manter ao menos um administrador.");
  }
}
