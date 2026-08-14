export const SECTOR_MEMBERSHIP_ROLES = ["diretor", "membro", "visualizador"] as const;
export const PERMISSION_ACTIONS = ["ver", "criar", "editar", "apagar"] as const;

export type SectorMembershipRole = (typeof SECTOR_MEMBERSHIP_ROLES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export function canPerformSectorAction(input: {
  isPresident: boolean;
  membershipRole?: SectorMembershipRole | null;
  hasExplicitGrant: boolean;
  action: PermissionAction;
}) {
  if (input.isPresident) return true;
  if (input.membershipRole === "diretor") return true;
  if (input.membershipRole === "visualizador") return input.action === "ver" || input.hasExplicitGrant;
  return input.hasExplicitGrant;
}
