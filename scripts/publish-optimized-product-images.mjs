import { mkdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("As credenciais de Storage de Production não estão disponíveis.");
}

const sourceDirectory = "/home/ubuntu/webdev-static-assets";
const outputDirectory = "/home/ubuntu/webdev-static-assets/atletica-fsa-optimized";
const assets = [
  { name: "Camiseta Oficial FSA", source: "atletica-fsa-produto-camiseta.png", key: "optimized/products/camiseta-oficial-fsa.webp" },
  { name: "Copo FSA", source: "atletica-fsa-produto-copo.png", key: "optimized/products/copo-fsa.webp" },
  { name: "Moletom Titular FSA", source: "atletica-fsa-produto-moletom.png", key: "optimized/products/moletom-titular-fsa.webp" },
  { name: "Chaveiro Coelho FSA", source: "atletica-fsa-produto-chaveiro.png", key: "optimized/products/chaveiro-coelho-fsa.webp" },
  { name: "Figurinhas FSA", source: "atletica-fsa-produto-adesivos.png", key: "optimized/products/figurinhas-fsa.webp" },
];

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

await mkdir(outputDirectory, { recursive: true });

for (const asset of assets) {
  const sourcePath = join(sourceDirectory, asset.source);
  const outputPath = join(outputDirectory, basename(asset.key));
  const original = await stat(sourcePath);

  await sharp(sourcePath)
    .rotate()
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toFile(outputPath);

  const optimized = await stat(outputPath);
  const bytes = await readFile(outputPath);
  const { error: uploadError } = await supabase.storage
    .from("catalog-assets")
    .upload(asset.key, bytes, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
  if (uploadError) throw new Error(`Não foi possível publicar ${asset.name}: ${uploadError.message}`);

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("name", asset.name)
    .maybeSingle();
  if (productError) throw new Error(`Não foi possível localizar ${asset.name}: ${productError.message}`);
  if (!product) {
    console.log(`Sem produto correspondente: ${asset.name}. O fallback institucional foi publicado.`);
    continue;
  }

  const { data: image, error: imageError } = await supabase
    .from("product_images")
    .select("id,alt_text,sort_order")
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (imageError) throw new Error(`Não foi possível consultar a imagem de ${asset.name}: ${imageError.message}`);
  if (!image) {
    console.log(`Sem imagem cadastrada para ${asset.name}. O fallback institucional foi publicado.`);
    continue;
  }

  const { data: publicUrl } = supabase.storage.from("catalog-assets").getPublicUrl(asset.key);
  const { error: updateError } = await supabase
    .from("product_images")
    .update({
      storage_key: asset.key,
      storage_provider: "supabase-storage",
      public_url: publicUrl.publicUrl,
      alt_text: image.alt_text || asset.name,
    })
    .eq("id", image.id);
  if (updateError) throw new Error(`Não foi possível atualizar a referência de ${asset.name}: ${updateError.message}`);

  const saving = Math.round((1 - optimized.size / original.size) * 100);
  console.log(`${asset.name}: ${original.size} B -> ${optimized.size} B (${saving}% menor), publicado em ${asset.key}`);
}
