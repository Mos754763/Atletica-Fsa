import { institutionalAsset } from "@/lib/institutional-assets";

export const fsaStoreAssets = {
  camiseta: institutionalAsset("store/fsa-camiseta-estudio.png"),
  copo: institutionalAsset("store/fsa-copo-estudio.png"),
  moletom: institutionalAsset("store/fsa-moletom-estudio.png"),
  chaveiro: institutionalAsset("store/fsa-chaveiro-estudio.png"),
} as const;

export function resolveFsaProductImage(productName: string, fallback: string | null) {
  if (fallback) return fallback;
  const normalizedName = productName.toLocaleLowerCase("pt-BR");
  if (normalizedName.includes("camiseta")) return fsaStoreAssets.camiseta;
  if (normalizedName.includes("copo")) return fsaStoreAssets.copo;
  if (normalizedName.includes("moletom")) return fsaStoreAssets.moletom;
  if (normalizedName.includes("chaveiro")) return fsaStoreAssets.chaveiro;
  return fallback;
}
