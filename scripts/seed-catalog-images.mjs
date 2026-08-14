import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) throw new Error("As credenciais do Supabase para semear imagens não estão disponíveis.");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const assets = [
  { name: "Camiseta Oficial FSA", file: "/home/ubuntu/webdev-static-assets/fsa-product-camiseta-clean.png", key: "seed/camiseta-oficial-fsa.png" },
  { name: "Copo FSA", file: "/home/ubuntu/webdev-static-assets/fsa-product-copo-clean.png", key: "seed/copo-fsa.png" },
  { name: "Moletom Titular FSA", file: "/home/ubuntu/webdev-static-assets/fsa-product-moletom-clean.png", key: "seed/moletom-titular-fsa.png" },
  { name: "Chaveiro Coelho FSA", file: "/home/ubuntu/webdev-static-assets/fsa-product-chaveiro-clean.png", key: "seed/chaveiro-coelho-fsa.png" },
];

for (const asset of assets) {
  const { data: product, error: productError } = await supabase.from("products").select("id").eq("name", asset.name).maybeSingle();
  if (productError || !product) throw new Error(`Produto de imagem padrão não encontrado: ${asset.name}`);
  const { count, error: countError } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", product.id);
  if (countError) throw new Error(`Não foi possível conferir as fotos de ${asset.name}.`);
  if ((count ?? 0) > 0) {
    console.log(`Mantida a foto já cadastrada: ${asset.name}`);
    continue;
  }
  const bytes = await readFile(asset.file);
  const { error: uploadError } = await supabase.storage.from("catalog-assets").upload(asset.key, bytes, { contentType: "image/png", upsert: false });
  if (uploadError && !/already exists/i.test(uploadError.message)) throw new Error(`Não foi possível enviar ${asset.name}.`);
  const { data: publicUrl } = supabase.storage.from("catalog-assets").getPublicUrl(asset.key);
  const { error: insertError } = await supabase.from("product_images").insert({
    product_id: product.id,
    storage_key: asset.key,
    storage_provider: "supabase-s3",
    public_url: publicUrl.publicUrl,
    alt_text: asset.name,
    sort_order: 0,
  });
  if (insertError) throw new Error(`A foto de ${asset.name} foi enviada, mas não pôde ser cadastrada.`);
  console.log(`Foto publicada: ${asset.name}`);
}
