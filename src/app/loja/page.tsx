import { Storefront } from "@/components/store/Storefront";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const products = await getCatalog();
  return <Storefront products={products} />;
}
