"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { deleteCatalogImages, uploadCatalogImage } from "@/lib/storage/catalog-images";
import { brlInputToCents } from "@/lib/money";

const productSchema = z.object({
  name: z.string().trim().min(3).max(120),
  sku: z.string().trim().max(64).optional(),
  description: z.string().trim().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  priceCents: z.coerce.number().int().min(0),
  stockQuantity: z.coerce.number().int().min(0),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isFeatured: z.boolean(),
});
const categorySchema = z.object({ name: z.string().trim().min(2).max(80) });
const variantSchema = z.object({ productId: z.string().uuid(), name: z.string().trim().max(80).optional(), color: z.string().trim().max(50).optional(), size: z.string().trim().max(32).optional(), sku: z.string().trim().max(64).optional(), priceCents: z.coerce.number().int().min(0).optional(), stockQuantity: z.coerce.number().int().min(0), notes: z.string().trim().max(400).optional() });
const salesBatchSchema = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), name: z.string().trim().min(2).max(100), priceCents: z.coerce.number().int().min(0).optional(), minimumQuantity: z.coerce.number().int().positive().optional(), targetQuantity: z.coerce.number().int().positive().optional(), opensAt: z.string().optional(), closesAt: z.string().optional(), instructions: z.string().trim().max(1000).optional() });
const productIdSchema = z.string().uuid();
const productImageIdSchema = z.string().uuid();

function priceInCents(value: FormDataEntryValue | null) {
  const cents = brlInputToCents(value);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Informe um preço válido em reais, como 69,90.");
  return cents;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/loja");
  revalidatePath("/admin/catalogo");
}

function parseProduct(formData: FormData) {
  return productSchema.parse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    priceCents: priceInCents(formData.get("priceBrl")),
    stockQuantity: formData.get("stockQuantity"),
    imageUrl: formData.get("imageUrl") || "",
    isFeatured: formData.get("isFeatured") === "on",
  });
}

export async function createCategory(formData: FormData) {
  const { supabase } = await requireRole(["admin", "caixa"]);
  const { name } = categorySchema.parse({ name: formData.get("name") });
  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("categories").insert({ name, slug });
  if (error) throw new Error("Não foi possível criar a categoria.");
  revalidateCatalog();
}

export async function createProduct(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin", "caixa"]);
  const values = parseProduct(formData);
  const imageFile = formData.get("imageFile");
  const slug = `${slugify(values.name)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data: product, error } = await supabase.from("products").insert({
    name: values.name, slug, sku: values.sku || null, description: values.description || null,
    category_id: values.categoryId || null, price_cents: values.priceCents, stock_quantity: values.stockQuantity,
    is_featured: values.isFeatured,
  }).select("id").single();
  if (error || !product) throw new Error("Não foi possível cadastrar o produto.");

  let image: { publicUrl: string; storageKey: string | null; provider: string } | null = values.imageUrl ? { publicUrl: values.imageUrl, storageKey: null, provider: "external" } : null;
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadCatalogImage(imageFile, product.id);
    image = { publicUrl: uploaded.publicUrl, storageKey: uploaded.storageKey, provider: "supabase-s3" };
  }
  if (image) {
    const { error: imageError } = await supabase.from("product_images").insert({ product_id: product.id, public_url: image.publicUrl, storage_key: image.storageKey, alt_text: values.name, storage_provider: image.provider, sort_order: 0 });
    if (imageError) {
      if (image.provider === "supabase-s3") await deleteCatalogImages([image.storageKey]);
      throw new Error("Produto criado, mas a foto não pôde ser associada.");
    }
  }
  if (values.stockQuantity > 0) {
    const { error: inventoryError } = await supabase.from("inventory_movements").insert({ product_id: product.id, quantity_delta: values.stockQuantity, reason: "Estoque inicial", reference_type: "product", reference_id: product.id, created_by: userId });
    if (inventoryError) throw new Error("Produto criado, mas o estoque inicial não pôde ser registrado.");
  }
  revalidateCatalog();
}

export async function updateProduct(formData: FormData) {
  const { supabase } = await requireRole(["admin", "caixa"]);
  const productId = productIdSchema.parse(formData.get("productId"));
  const values = parseProduct(formData);
  const { error } = await supabase.rpc("update_catalog_product", {
    p_product_id: productId,
    p_name: values.name,
    p_sku: values.sku || null,
    p_description: values.description || null,
    p_category_id: values.categoryId || null,
    p_price_cents: values.priceCents,
    p_stock_quantity: values.stockQuantity,
    p_is_active: formData.get("isActive") === "on",
    p_is_featured: values.isFeatured,
  });
  if (error) throw new Error("Não foi possível atualizar o produto.");
  revalidateCatalog();
}

export async function addProductImage(formData: FormData) {
  const { supabase } = await requireRole(["admin", "caixa"]);
  const productId = productIdSchema.parse(formData.get("productId"));
  const externalUrl = z.string().url().optional().or(z.literal("")).parse(formData.get("imageUrl") || "");
  const imageFile = formData.get("imageFile");
  if (!externalUrl && !(imageFile instanceof File && imageFile.size > 0)) throw new Error("Envie uma foto ou informe uma URL válida.");
  const { data: existingImages, error: existingError } = await supabase.from("product_images").select("sort_order").eq("product_id", productId).order("sort_order", { ascending: false }).limit(1);
  if (existingError) throw new Error("Não foi possível organizar as fotos do produto.");
  let image: { publicUrl: string; storageKey: string | null; provider: string } | null = externalUrl ? { publicUrl: externalUrl, storageKey: null, provider: "external" } : null;
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadCatalogImage(imageFile, productId);
    image = { publicUrl: uploaded.publicUrl, storageKey: uploaded.storageKey, provider: "supabase-s3" };
  }
  const { error } = await supabase.from("product_images").insert({
    product_id: productId, public_url: image!.publicUrl, storage_key: image!.storageKey, storage_provider: image!.provider,
    alt_text: formData.get("altText")?.toString().trim() || null, sort_order: (existingImages?.[0]?.sort_order ?? -1) + 1,
  });
  if (error) {
    if (image?.provider === "supabase-s3") await deleteCatalogImages([image.storageKey]);
    throw new Error("A foto foi enviada, mas não pôde ser associada ao produto.");
  }
  revalidateCatalog();
}

export async function setPrimaryProductImage(formData: FormData) {
  const { supabase } = await requireRole(["admin", "caixa"]);
  const productId = productIdSchema.parse(formData.get("productId"));
  const imageId = productImageIdSchema.parse(formData.get("imageId"));
  const { data: images, error: imagesError } = await supabase.from("product_images").select("id").eq("product_id", productId).order("sort_order");
  if (imagesError || !images?.some((image) => image.id === imageId)) throw new Error("A foto selecionada não pertence a este produto.");
  const orderedIds = [imageId, ...images.filter((image) => image.id !== imageId).map((image) => image.id)];
  const updates = await Promise.all(orderedIds.map((id, index) => supabase.from("product_images").update({ sort_order: index }).eq("id", id).eq("product_id", productId)));
  if (updates.some(({ error }) => error)) throw new Error("Não foi possível definir a foto principal.");
  revalidateCatalog();
}

export async function deleteProductImage(formData: FormData) {
  const { supabase } = await requireRole(["admin", "caixa"]);
  const productId = productIdSchema.parse(formData.get("productId"));
  const imageId = productImageIdSchema.parse(formData.get("imageId"));
  const { data: image, error: imageError } = await supabase.from("product_images").select("storage_key,storage_provider").eq("id", imageId).eq("product_id", productId).maybeSingle();
  if (imageError || !image) throw new Error("A foto informada não foi encontrada.");
  const { error } = await supabase.from("product_images").delete().eq("id", imageId).eq("product_id", productId);
  if (error) throw new Error("Não foi possível remover a foto do produto.");
  if (image.storage_provider === "supabase-s3") await deleteCatalogImages([image.storage_key]);
  revalidateCatalog();
}

export async function deleteProduct(formData: FormData) {
  const { supabase } = await requireRole(["admin", "caixa"]);
  const productId = productIdSchema.parse(formData.get("productId"));
  if (formData.get("confirmDelete") !== "excluir") throw new Error("Confirme a exclusão do produto antes de continuar.");
  const { data: images, error: imagesError } = await supabase.from("product_images").select("storage_key,storage_provider").eq("product_id", productId);
  if (imagesError) throw new Error("Não foi possível preparar a exclusão das fotos do produto.");
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw new Error("Não foi possível excluir o produto. Se ele já possui operação registrada, desative-o em vez de apagá-lo.");
  await deleteCatalogImages((images ?? []).filter((image) => image.storage_provider === "supabase-s3").map((image) => image.storage_key));
  revalidateCatalog();
}

export async function createVariant(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin", "caixa"]);
  const rawPrice = formData.get("priceBrl");
  const values = variantSchema.parse({ productId: formData.get("productId"), name: formData.get("name") || undefined, color: formData.get("color") || undefined, size: formData.get("size") || undefined, sku: formData.get("sku") || undefined, priceCents: rawPrice ? priceInCents(rawPrice) : undefined, stockQuantity: formData.get("stockQuantity"), notes: formData.get("notes") || undefined });
  const name = values.name || [values.color && `Cor ${values.color}`, values.size && `Tamanho ${values.size}`].filter(Boolean).join(" · ");
  if (!name) throw new Error("Informe uma cor, um tamanho ou um nome para identificar a variação.");
  const attributes = Object.fromEntries(Object.entries({ cor: values.color, tamanho: values.size, observacoes: values.notes }).filter(([, value]) => Boolean(value)));
  const { data: variant, error } = await supabase.from("product_variants").insert({ product_id: values.productId, name, sku: values.sku || null, price_cents: values.priceCents ?? null, stock_quantity: values.stockQuantity, attributes }).select("id").single();
  if (error || !variant) throw new Error("Não foi possível cadastrar a variação.");
  await supabase.from("products").update({ has_variants: true }).eq("id", values.productId);
  if (values.stockQuantity > 0) await supabase.from("inventory_movements").insert({ product_id: values.productId, quantity_delta: values.stockQuantity, reason: `Estoque inicial da variação ${name}`, reference_type: "product_variant", reference_id: variant.id, created_by: userId });
  revalidateCatalog();
}

export async function createSalesBatch(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin", "caixa"]);
  const rawPrice = formData.get("priceBrl");
  const values = salesBatchSchema.parse({ productId: formData.get("productId"), variantId: formData.get("variantId") || undefined, name: formData.get("name"), priceCents: rawPrice ? priceInCents(rawPrice) : undefined, minimumQuantity: formData.get("minimumQuantity") || undefined, targetQuantity: formData.get("targetQuantity") || undefined, opensAt: formData.get("opensAt") || undefined, closesAt: formData.get("closesAt") || undefined, instructions: formData.get("instructions") || undefined });
  const opensAt = values.opensAt ? new Date(values.opensAt).toISOString() : null;
  const closesAt = values.closesAt ? new Date(values.closesAt).toISOString() : null;
  if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) throw new Error("O encerramento do lote deve ocorrer depois da abertura.");
  const { error } = await supabase.from("sales_batches").insert({ product_id: values.productId, variant_id: values.variantId || null, name: values.name, price_cents: values.priceCents ?? null, minimum_quantity: values.minimumQuantity ?? null, target_quantity: values.targetQuantity ?? null, opens_at: opensAt, closes_at: closesAt, instructions: values.instructions || null, status: "rascunho", created_by: userId });
  if (error) throw new Error("Não foi possível criar o lote de pré-venda.");
  await supabase.from("products").update({ preorder_enabled: true }).eq("id", values.productId);
  revalidateCatalog();
}
