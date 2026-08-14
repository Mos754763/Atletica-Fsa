"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { uploadCatalogImage } from "@/lib/storage/catalog-images";

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
const variantSchema = z.object({ productId: z.string().uuid(), name: z.string().trim().min(1).max(80), sku: z.string().trim().max(64).optional(), priceCents: z.coerce.number().int().min(0).optional(), stockQuantity: z.coerce.number().int().min(0), attributes: z.string().trim().max(400).optional() });
const salesBatchSchema = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), name: z.string().trim().min(2).max(100), priceCents: z.coerce.number().int().min(0).optional(), minimumQuantity: z.coerce.number().int().positive().optional(), targetQuantity: z.coerce.number().int().positive().optional(), opensAt: z.string().optional(), closesAt: z.string().optional(), instructions: z.string().trim().max(1000).optional() });

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function createCategory(formData: FormData) {
  const { supabase } = await requireRole(["admin", "caixa"]);
  const { name } = categorySchema.parse({ name: formData.get("name") });
  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("categories").insert({ name, slug });
  if (error) throw new Error("Não foi possível criar a categoria.");
  revalidatePath("/admin/catalogo");
  revalidatePath("/loja");
}

export async function createProduct(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin", "caixa"]);
  const values = productSchema.parse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    priceCents: formData.get("priceCents"),
    stockQuantity: formData.get("stockQuantity"),
    imageUrl: formData.get("imageUrl"),
    isFeatured: formData.get("isFeatured") === "on",
  });
  const imageFile = formData.get("imageFile");
  const baseSlug = slugify(values.name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  const { data: product, error } = await supabase.from("products").insert({
    name: values.name,
    slug,
    sku: values.sku || null,
    description: values.description || null,
    category_id: values.categoryId || null,
    price_cents: values.priceCents,
    stock_quantity: values.stockQuantity,
    is_featured: values.isFeatured,
  }).select("id").single();
  if (error || !product) throw new Error("Não foi possível cadastrar o produto.");
  let image: { publicUrl: string; storageKey: string | null; provider: string } | null = values.imageUrl ? { publicUrl: values.imageUrl, storageKey: null, provider: "external" } : null;
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadCatalogImage(imageFile, product.id);
    image = { publicUrl: uploaded.publicUrl, storageKey: uploaded.storageKey, provider: "supabase-s3" };
  }
  if (image) {
    const { error: imageError } = await supabase.from("product_images").insert({ product_id: product.id, public_url: image.publicUrl, storage_key: image.storageKey, alt_text: values.name, storage_provider: image.provider });
    if (imageError) throw new Error("Produto criado, mas a foto não pôde ser associada.");
  }
  if (values.stockQuantity > 0) {
    const { error: inventoryError } = await supabase.from("inventory_movements").insert({ product_id: product.id, quantity_delta: values.stockQuantity, reason: "Estoque inicial", reference_type: "product", reference_id: product.id, created_by: userId });
    if (inventoryError) throw new Error("Produto criado, mas o estoque inicial não pôde ser registrado.");
  }
  revalidatePath("/admin/catalogo");
  revalidatePath("/loja");
}

export async function createVariant(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin", "caixa"]);
  const values = variantSchema.parse({ productId: formData.get("productId"), name: formData.get("name"), sku: formData.get("sku") || undefined, priceCents: formData.get("priceCents") || undefined, stockQuantity: formData.get("stockQuantity"), attributes: formData.get("attributes") || undefined });
  const attributes = values.attributes ? { descricao: values.attributes } : {};
  const { data: variant, error } = await supabase.from("product_variants").insert({ product_id: values.productId, name: values.name, sku: values.sku || null, price_cents: values.priceCents ?? null, stock_quantity: values.stockQuantity, attributes }).select("id").single();
  if (error || !variant) throw new Error("Não foi possível cadastrar a variação.");
  await supabase.from("products").update({ has_variants: true }).eq("id", values.productId);
  if (values.stockQuantity > 0) await supabase.from("inventory_movements").insert({ product_id: values.productId, quantity_delta: values.stockQuantity, reason: `Estoque inicial da variação ${values.name}`, reference_type: "product_variant", reference_id: variant.id, created_by: userId });
  revalidatePath("/admin/catalogo");
  revalidatePath("/loja");
}

export async function createSalesBatch(formData: FormData) {
  const { supabase, userId } = await requireRole(["admin", "caixa"]);
  const values = salesBatchSchema.parse({ productId: formData.get("productId"), variantId: formData.get("variantId") || undefined, name: formData.get("name"), priceCents: formData.get("priceCents") || undefined, minimumQuantity: formData.get("minimumQuantity") || undefined, targetQuantity: formData.get("targetQuantity") || undefined, opensAt: formData.get("opensAt") || undefined, closesAt: formData.get("closesAt") || undefined, instructions: formData.get("instructions") || undefined });
  const opensAt = values.opensAt ? new Date(values.opensAt).toISOString() : null;
  const closesAt = values.closesAt ? new Date(values.closesAt).toISOString() : null;
  if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) throw new Error("O encerramento do lote deve ocorrer depois da abertura.");
  const { error } = await supabase.from("sales_batches").insert({ product_id: values.productId, variant_id: values.variantId || null, name: values.name, price_cents: values.priceCents ?? null, minimum_quantity: values.minimumQuantity ?? null, target_quantity: values.targetQuantity ?? null, opens_at: opensAt, closes_at: closesAt, instructions: values.instructions || null, status: "rascunho", created_by: userId });
  if (error) throw new Error("Não foi possível criar o lote de pré-venda.");
  await supabase.from("products").update({ preorder_enabled: true }).eq("id", values.productId);
  revalidatePath("/admin/catalogo");
  revalidatePath("/loja");
}
