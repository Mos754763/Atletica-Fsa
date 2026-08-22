const catalogAssetsBaseUrl = "https://tbxihkzuyzszrfxqmleq.supabase.co/storage/v1/object/public/catalog-assets/optimized/products";

export const fsaStoreAssets = {
  camiseta: `${catalogAssetsBaseUrl}/camiseta-oficial-fsa.webp`,
  copo: `${catalogAssetsBaseUrl}/copo-fsa.webp`,
  moletom: `${catalogAssetsBaseUrl}/moletom-titular-fsa.webp`,
  chaveiro: `${catalogAssetsBaseUrl}/chaveiro-coelho-fsa.webp`,
  adesivos: `${catalogAssetsBaseUrl}/figurinhas-fsa.webp`,
} as const;

export function resolveFsaProductImage(productName: string, fallback: string | null) {
  if (fallback) return fallback;
  const normalizedName = productName.toLocaleLowerCase("pt-BR");
  if (normalizedName.includes("camiseta")) return fsaStoreAssets.camiseta;
  if (normalizedName.includes("copo")) return fsaStoreAssets.copo;
  if (normalizedName.includes("moletom")) return fsaStoreAssets.moletom;
  if (normalizedName.includes("chaveiro")) return fsaStoreAssets.chaveiro;
  if (normalizedName.includes("figurinha") || normalizedName.includes("adesivo")) return fsaStoreAssets.adesivos;
  return fallback;
}
