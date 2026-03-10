
import { getProducts, getBrands, getProductTypes } from "@/lib/data";
import type { Product, Brand, ProductType } from "@/lib/types";
import ProductGrid from "@/components/product-grid";

export const dynamic = 'force-dynamic';

export default async function StationaryPage() {
  let products: Product[] = [];
  let brands: Brand[] = [];
  let productTypes: ProductType[] = [];
  let error: string | null = null;

  try {
    [products, brands, productTypes] = await Promise.all([
      getProducts("stationary"),
      getBrands("stationary"),
      getProductTypes("stationary"),
    ]);
  } catch (e: any) {
    error = "Failed to fetch stationary products. Please try again later.";
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="font-headline text-3xl font-bold text-destructive">Error</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <ProductGrid 
      initialProducts={products}
      brands={brands}
      productTypes={productTypes}
      pageTitle="Stationary"
      pageDescription="Find all your stationary needs here."
      searchPlaceholder="Search for stationary..."
      category="stationary"
    />
  );
}
