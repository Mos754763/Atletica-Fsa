import { createServiceClient } from "../supabase/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
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

export async function uploadCatalogImage(file: File, productId: string) {
  if (file.size === 0) throw new Error("A imagem enviada está vazia.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("A imagem deve ter no máximo 5 MB.");
  const extension = catalogImageExtension(file.type);
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
