import { timingSafeEqual } from "node:crypto";

/**
 * Compara o segredo de cron sem encurtar a comparação conforme o prefixo recebido.
 * Retorna falso antes da comparação criptográfica se o cabeçalho tiver tamanho distinto.
 */
export function isAuthorizedCronRequest(authorization: string | null, cronSecret: string | undefined) {
  if (!authorization || !cronSecret) return false;
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const received = Buffer.from(authorization);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
