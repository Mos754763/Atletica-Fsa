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
