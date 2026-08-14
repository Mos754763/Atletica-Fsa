export type TableGrant = { resourceKey: string; sectorId: string | null; action: string };

export function grantMatchesTable(grant: TableGrant, tableId: string, tableSectorId: string, action: string) {
  return grant.action === action
    && grant.sectorId === tableSectorId
    && (grant.resourceKey === "table:*" || grant.resourceKey === `table:${tableId}`);
}

export function isValidTableGrantScope(resourceKey: string, sectorId: string | undefined) {
  if (resourceKey === "table:*") return Boolean(sectorId);
  return /^table:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resourceKey) && Boolean(sectorId);
}
