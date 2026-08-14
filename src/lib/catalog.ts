import { env, hasSupabaseConfig } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { fsaStoreAssets, resolveFsaProductImage } from "@/lib/store-product-assets";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
};

export type CatalogVariant = {
  id: string;
  name: string;
  sku: string | null;
  attributes: Record<string, string>;
  priceCents: number | null;
  stockQuantity: number;
};

export type CatalogSalesBatch = {
  id: string;
  name: string;
  priceCents: number | null;
  closesAt: string | null;
  pickupStartsAt: string | null;
  pickupEndsAt: string | null;
  instructions: string | null;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  category: CatalogCategory | null;
  priceCents: number;
  stockQuantity: number;
  isFeatured: boolean;
  imageUrl: string | null;
  hasVariants: boolean;
  preorderEnabled: boolean;
  variants: CatalogVariant[];
  salesBatches: CatalogSalesBatch[];
};

const previewCatalog: CatalogProduct[] = [
  { id: "preview-camiseta", name: "Camiseta Oficial FSA", slug: "camiseta-oficial-fsa", description: "Camiseta da torcida para qualquer rolê FSA.", sku: "FSA-CAM-001", category: { id: "vestuario", name: "Vestuário", slug: "vestuario" }, priceCents: 6990, stockQuantity: 12, isFeatured: true, imageUrl: fsaStoreAssets.camiseta, hasVariants: false, preorderEnabled: false, variants: [], salesBatches: [] },
  { id: "preview-moletom", name: "Moletom Titular FSA", slug: "moletom-titular-fsa", description: "Moletom azul para representar em todos os eventos.", sku: "FSA-MOL-001", category: { id: "vestuario", name: "Vestuário", slug: "vestuario" }, priceCents: 14990, stockQuantity: 7, isFeatured: true, imageUrl: fsaStoreAssets.moletom, hasVariants: false, preorderEnabled: false, variants: [], salesBatches: [] },
  { id: "preview-copo", name: "Copo FSA", slug: "copo-fsa", description: "Copo reutilizável da atlética.", sku: "FSA-COP-001", category: { id: "acessorios", name: "Acessórios", slug: "acessorios" }, priceCents: 2490, stockQuantity: 20, isFeatured: true, imageUrl: fsaStoreAssets.copo, hasVariants: false, preorderEnabled: false, variants: [], salesBatches: [] },
  { id: "preview-chaveiro", name: "Chaveiro Coelho FSA", slug: "chaveiro-coelho-fsa", description: "Mascote FSA para levar junto.", sku: "FSA-CHA-001", category: { id: "acessorios", name: "Acessórios", slug: "acessorios" }, priceCents: 1490, stockQuantity: 22, isFeatured: false, imageUrl: fsaStoreAssets.chaveiro, hasVariants: false, preorderEnabled: false, variants: [], salesBatches: [] },
  { id: "preview-figurinhas", name: "Figurinhas FSA", slug: "figurinhas-fsa", description: "Colecione os momentos da FSA.", sku: "FSA-FIG-001", category: { id: "colecionaveis", name: "Colecionáveis", slug: "colecionaveis" }, priceCents: 800, stockQuantity: 30, isFeatured: false, imageUrl: null, hasVariants: false, preorderEnabled: false, variants: [], salesBatches: [] },
  { id: "preview-bebida", name: "Bebida em lata", slug: "bebida-em-lata", description: "Gelada para os dias de evento.", sku: "FSA-BEB-001", category: { id: "bebidas", name: "Bebidas", slug: "bebidas" }, priceCents: 700, stockQuantity: 18, isFeatured: false, imageUrl: null, hasVariants: false, preorderEnabled: false, variants: [], salesBatches: [] },
];

type CatalogProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price_cents: number;
  stock_quantity: number;
  is_featured: boolean;
  has_variants: boolean;
  preorder_enabled: boolean;
  categories: CatalogCategory | null;
  product_images: Array<{ public_url: string; sort_order: number }> | null;
  product_variants: Array<{ id: string; name: string; sku: string | null; attributes: Record<string, string>; price_cents: number | null; stock_quantity: number; is_active: boolean; sort_order: number }> | null;
  sales_batches: Array<{ id: string; name: string; status: string; price_cents: number | null; closes_at: string | null; pickup_starts_at: string | null; pickup_ends_at: string | null; instructions: string | null }> | null;
};

export async function getCatalog() {
  if (!hasSupabaseConfig() || !env.supabaseSecretKey) return previewCatalog;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select("id,name,slug,description,sku,price_cents,stock_quantity,is_featured,has_variants,preorder_enabled,categories(id,name,slug),product_images(public_url,sort_order),product_variants(id,name,sku,attributes,price_cents,stock_quantity,is_active,sort_order),sales_batches(id,name,status,price_cents,closes_at,pickup_starts_at,pickup_ends_at,instructions)")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<CatalogProductRow[]>();

    if (error || !data?.length) return previewCatalog;

    return data.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      category: product.categories,
      priceCents: product.price_cents,
      stockQuantity: product.stock_quantity,
      isFeatured: product.is_featured,
      imageUrl: resolveFsaProductImage(product.name, [...(product.product_images ?? [])].sort((left, right) => left.sort_order - right.sort_order)[0]?.public_url ?? null),
      hasVariants: product.has_variants,
      preorderEnabled: product.preorder_enabled,
      variants: [...(product.product_variants ?? [])].filter((variant) => variant.is_active).sort((left, right) => left.sort_order - right.sort_order).map((variant) => ({ id: variant.id, name: variant.name, sku: variant.sku, attributes: variant.attributes ?? {}, priceCents: variant.price_cents, stockQuantity: variant.stock_quantity })),
      salesBatches: [...(product.sales_batches ?? [])].filter((batch) => batch.status === "aberto").map((batch) => ({ id: batch.id, name: batch.name, priceCents: batch.price_cents, closesAt: batch.closes_at, pickupStartsAt: batch.pickup_starts_at, pickupEndsAt: batch.pickup_ends_at, instructions: batch.instructions })),
    }));
  } catch {
    return previewCatalog;
  }
}
