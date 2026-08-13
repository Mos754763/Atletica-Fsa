import { env, hasSupabaseConfig } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { institutionalAsset } from "@/lib/institutional-assets";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
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
};

const previewCatalog: CatalogProduct[] = [
  { id: "preview-camiseta", name: "Camiseta Oficial FSA", slug: "camiseta-oficial-fsa", description: "Camiseta da torcida para qualquer rolê FSA.", sku: "FSA-CAM-001", category: { id: "vestuario", name: "Vestuário", slug: "vestuario" }, priceCents: 6990, stockQuantity: 12, isFeatured: true, imageUrl: institutionalAsset("store/fsa-product-camiseta.png") },
  { id: "preview-moletom", name: "Moletom Titular FSA", slug: "moletom-titular-fsa", description: "Moletom azul para representar em todos os eventos.", sku: "FSA-MOL-001", category: { id: "vestuario", name: "Vestuário", slug: "vestuario" }, priceCents: 14990, stockQuantity: 7, isFeatured: true, imageUrl: institutionalAsset("store/fsa-product-moletom.png") },
  { id: "preview-copo", name: "Copo FSA", slug: "copo-fsa", description: "Copo reutilizável da atlética.", sku: "FSA-COP-001", category: { id: "acessorios", name: "Acessórios", slug: "acessorios" }, priceCents: 2490, stockQuantity: 20, isFeatured: true, imageUrl: institutionalAsset("store/fsa-product-copo.png") },
  { id: "preview-chaveiro", name: "Chaveiro Coelho FSA", slug: "chaveiro-coelho-fsa", description: "Mascote FSA para levar junto.", sku: "FSA-CHA-001", category: { id: "acessorios", name: "Acessórios", slug: "acessorios" }, priceCents: 1490, stockQuantity: 22, isFeatured: false, imageUrl: institutionalAsset("store/fsa-product-chaveiro.png") },
  { id: "preview-figurinhas", name: "Figurinhas FSA", slug: "figurinhas-fsa", description: "Colecione os momentos da FSA.", sku: "FSA-FIG-001", category: { id: "colecionaveis", name: "Colecionáveis", slug: "colecionaveis" }, priceCents: 800, stockQuantity: 30, isFeatured: false, imageUrl: null },
  { id: "preview-bebida", name: "Bebida em lata", slug: "bebida-em-lata", description: "Gelada para os dias de evento.", sku: "FSA-BEB-001", category: { id: "bebidas", name: "Bebidas", slug: "bebidas" }, priceCents: 700, stockQuantity: 18, isFeatured: false, imageUrl: null },
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
  categories: CatalogCategory | null;
  product_images: Array<{ public_url: string; sort_order: number }> | null;
};

export async function getCatalog() {
  if (!hasSupabaseConfig() || !env.supabaseSecretKey) {
    return previewCatalog;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select("id,name,slug,description,sku,price_cents,stock_quantity,is_featured,categories(id,name,slug),product_images(public_url,sort_order)")
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
      imageUrl: [...(product.product_images ?? [])].sort((left, right) => left.sort_order - right.sort_order)[0]?.public_url ?? null,
    }));
  } catch {
    return previewCatalog;
  }
}
