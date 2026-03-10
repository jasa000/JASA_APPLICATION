
import { getProducts, getProductTypes } from "@/lib/data";
import type { Product, ProductType } from "@/lib/types";
import ProductGrid from "@/components/product-grid";

export const dynamic = 'force-dynamic';

export default async function BooksPage() {
  let products: Product[] = [];
  let productTypes: ProductType[] = [];
  let error: string | null = null;

  try {
    [products, productTypes] = await Promise.all([
      getProducts("books"),
      getProductTypes("books"),
    ]);
  } catch (e: any) {
    error = "Failed to fetch books. Please try again later.";
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
      productTypes={productTypes}
      pageTitle="Books"
      pageDescription="Browse our collection of books."
      searchPlaceholder="Search for books..."
      category="books"
    />
  );
}
