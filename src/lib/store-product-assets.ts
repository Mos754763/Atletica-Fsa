export const fsaStoreAssets = {
  camiseta: "/manus-storage/atletica-fsa-produto-camiseta_e311f6b9.png",
  copo: "/manus-storage/atletica-fsa-produto-copo_1d782280.png",
  moletom: "/manus-storage/atletica-fsa-produto-moletom_55d0ab13.png",
  chaveiro: "/manus-storage/atletica-fsa-produto-chaveiro_37b43413.png",
  adesivos: "/manus-storage/atletica-fsa-produto-adesivos_7d26c6e1.png",
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
