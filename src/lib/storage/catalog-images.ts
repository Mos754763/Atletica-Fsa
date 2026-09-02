import { createServiceClient } from "../supabase/server";

export const MAX_CATALOG_IMAGE_MEGABYTES = 3;
const MAX_IMAGE_BYTES = MAX_CATALOG_IMAGE_MEGABYTES * 1024 * 1024;
const mimeToExtension: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function catalogImageExtension(mimeType: string) {
  const extension = mimeToExtension[mimeType];
  if (!extension) throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  return extension;
}

export function validateCatalogImage(file: Pick<File, "size" | "type">) {
  if (file.size === 0) throw new Error("A imagem enviada está vazia.");
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`A imagem deve ter no máximo ${MAX_CATALOG_IMAGE_MEGABYTES} MB.`);
  }
  return catalogImageExtension(file.type);
}

export async function uploadCatalogImage(file: File, productId: string) {
  const extension = validateCatalogImage(file);
  const storageKey = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from("catalog-assets").upload(storageKey, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw new Error("Não foi possível enviar a foto para o armazenamento.");
  const { data } = supabase.storage.from("catalog-assets").getPublicUrl(storageKey);
  return { storageKey, publicUrl: data.publicUrl };
}

export async function deleteCatalogImages(storageKeys: Array<string | null | undefined>) {
  const validKeys = storageKeys.filter((storageKey): storageKey is string => Boolean(storageKey));
  if (!validKeys.length) return;
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from("catalog-assets").remove(validKeys);
  if (error) throw new Error("O registro foi atualizado, mas não foi possível remover uma foto do armazenamento.");
}
