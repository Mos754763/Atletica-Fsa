const PICKUP_QR_PREFIX = "FSA:PICKUP:";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildPickupQrPayload(token: string) {
  return `${PICKUP_QR_PREFIX}${token}`;
}

export function normalizePickupQrToken(value: string) {
  const trimmed = value.trim();
  const candidate = trimmed.toUpperCase().startsWith(PICKUP_QR_PREFIX) ? trimmed.slice(PICKUP_QR_PREFIX.length) : trimmed;
  const normalized = candidate.trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}
