import { Storefront } from "@/components/store/Storefront";
import { getCatalog } from "@/lib/catalog";

export default async function StorePage() {
  const products = await getCatalog();
  return <Storefront products={products} />;
}
