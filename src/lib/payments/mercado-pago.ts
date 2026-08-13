import { createHmac, timingSafeEqual } from "node:crypto";

type SignatureInput = { signature: string | null; requestId: string | null; dataId: string | null; secret: string };

export function verifyMercadoPagoWebhook({ signature, requestId, dataId, secret }: SignatureInput) {
  if (!signature || !requestId || !dataId || !secret) return false;
  const parts = new Map(signature.split(",").map((part) => { const [key, value] = part.trim().split("="); return [key, value]; }));
  const timestamp = parts.get("ts"); const receivedHash = parts.get("v1");
  if (!timestamp || !receivedHash) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");
  if (receivedHash.length !== expectedHash.length) return false;
  return timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash));
}
