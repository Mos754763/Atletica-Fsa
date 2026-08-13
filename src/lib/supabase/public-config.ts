export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function isPublicSupabaseConfig(value: unknown): value is PublicSupabaseConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PublicSupabaseConfig>;
  if (typeof candidate.url !== "string" || typeof candidate.publishableKey !== "string") return false;
  try {
    const parsed = new URL(candidate.url);
    return parsed.protocol === "https:" && candidate.publishableKey.trim().length > 20;
  } catch {
    return false;
  }
}
