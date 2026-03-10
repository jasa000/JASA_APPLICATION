
"use client";

import { useState, useEffect, useMemo } from "react";
import type { Product, Brand, ProductType } from "@/lib/types";
import ProductCard from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SlidersHorizontal, Search, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

type ProductGridProps = {
  initialProducts: Product[];
  brands?: Brand[];
  productTypes: ProductType[];
  pageTitle: string;
  pageDescription: string;
  searchPlaceholder: string;
  category: 'stationary' | 'books' | 'electronics';
};

export default function ProductGrid({
  initialProducts,
  brands = [],
  productTypes,
  pageTitle,
  pageDescription,
  searchPlaceholder,
  category,
}: ProductGridProps) {
  const [isClient, setIsClient] = useState(false);

  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // State for applied filters
  const [appliedBrands, setAppliedBrands] = useState<string[]>([]);
  const [appliedTypes, setAppliedTypes] = useState<string[]>([]);
  const [appliedPriceSort, setAppliedPriceSort] = useState<"all" | "asc" | "desc">("all");

  // State for temporary selections in the dialog
  const [tempBrands, setTempBrands] = useState<string[]>([]);
  const [tempTypes, setTempTypes] = useState<string[]>([]);
  const [tempPriceSort, setTempPriceSort] = useState<"all" | "asc" | "desc">("all");
  
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredProducts = useMemo(() => {
    let tempProducts = [...initialProducts];

    // Filter by brand (if applicable)
    if (brands.length > 0 && appliedBrands.length > 0) {
      tempProducts = tempProducts.filter(
        (product) => product.brandIds && product.brandIds.some(id => appliedBrands.includes(id))
      );
    }
    
    // Filter by product type
    if (appliedTypes.length > 0) {
      tempProducts = tempProducts.filter(
        (product) => product.productTypeIds && product.productTypeIds.some(id => appliedTypes.includes(id))
      );
    }

    // Filter by search query
    if (debouncedSearchQuery.length > 1) {
      const searchTerms = debouncedSearchQuery.toLowerCase().split(' ').filter(term => term);
      tempProducts = tempProducts.filter(product => {
        const productNameLower = product.name.toLowerCase();
        return searchTerms.every(term => productNameLower.includes(term));
      });
    }
    
    // Sort by price
    if (appliedPriceSort !== "all") {
        tempProducts.sort((a, b) => {
            const priceA = a.discountPrice || a.price;
            const priceB = b.discountPrice || b.price;
            return appliedPriceSort === 'asc' ? priceA - priceB : priceB - a.price;
        });
    }

    return tempProducts;
  }, [appliedBrands, appliedTypes, appliedPriceSort, debouncedSearchQuery, initialProducts, brands]);


  const handleApplyFilters = () => {
    setAppliedBrands(tempBrands);
    setAppliedTypes(tempTypes);
    setAppliedPriceSort(tempPriceSort);
    setIsFilterSheetOpen(false);
  };

  const handleResetFilters = () => {
    // Reset temp state for the sheet
    setTempBrands([]);
    setTempTypes([]);
    setTempPriceSort("all");
    
    // Immediately apply the reset
    setAppliedBrands([]);
    setAppliedTypes([]);
    setAppliedPriceSort("all");
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // When dialog opens, sync temp state with applied state
      setTempBrands(appliedBrands);
      setTempTypes(appliedTypes);
      setTempPriceSort(appliedPriceSort);
    }
    setIsFilterSheetOpen(open);
  };
  
  const handleClearSearch = () => {
      setSearchQuery('');
  };

  const renderProductGrid = () => {
    if (!isClient) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
             <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="py-16 text-center">
          <h2 className="text-xl font-semibold">No Products Found</h2>
          <p className="text-muted-foreground">
            There are no products available that match your search/filters.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} showButtons={true} />
        ))}
      </div>
    );
  };
  
   const FilterCheckboxGroup = ({ title, items, selected, onSelectionChange }: {
    title: string;
    items: { id: string, name: string }[];
    selected: string[];
    onSelectionChange: (newSelection: string[]) => void;
  }) => (
    <div>
      <h3 className="mb-4 text-lg font-medium">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox
              id={`${title}-${item.id}`}
              checked={selected.includes(item.id)}
              onCheckedChange={(checked) => {
                const newSelection = checked
                  ? [...selected, item.id]
                  : selected.filter((id) => id !== item.id);
                onSelectionChange(newSelection);
              }}
            />
            <Label htmlFor={`${title}-${item.id}`} className="font-normal">
              {item.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  const SortRadioGroup = ({ selected, onSelectionChange }: {
    selected: string;
    onSelectionChange: (value: "all" | "asc" | "desc") => void;
  }) => {
    const sortOptions: { label: string, value: "all" | "asc" | "desc" }[] = [
      { label: 'Default', value: 'all' },
      { label: 'Low to High', value: 'asc' },
      { label: 'High to Low', value: 'desc' },
    ];

    return (
      <div>
          <h3 className="mb-4 text-lg font-medium">Sort by Price</h3>
          <div className="flex flex-col space-y-2">
              {sortOptions.map(option => (
                  <Button
                      key={option.value}
                      variant={selected === option.value ? 'default' : 'ghost'}
                      onClick={() => onSelectionChange(option.value)}
                      className={cn(
                          "justify-start",
                          selected === option.value && "bg-blue-600 hover:bg-blue-700 text-white"
                      )}
                  >
                      {option.label}
                  </Button>
              ))}
          </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
          {pageTitle}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {pageDescription}
        </p>
      </div>

       <div className="mt-8 flex gap-2">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder={searchPlaceholder}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={handleClearSearch}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
          <Sheet open={isFilterSheetOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-shrink-0">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters & Sort
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col p-0">
              <SheetHeader className="p-4 border-b">
                 <SheetTitle>Filters &amp; Sorting</SheetTitle>
                 <div className="flex justify-between gap-4 pt-2">
                    <Button variant="secondary" onClick={handleResetFilters} className="w-full border border-black dark:border-white">Reset</Button>
                    <Button onClick={handleApplyFilters} className="w-full">Apply Filters</Button>
                 </div>
              </SheetHeader>
              <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                 <div className="h-7 w-7 rounded-full flex items-center justify-center bg-background dark:bg-foreground">
                    <X className="h-5 w-5 text-destructive" />
                 </div>
                 <span className="sr-only">Close</span>
              </SheetClose>
              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {brands.length > 0 && category !== 'books' && (
                  <>
                    <FilterCheckboxGroup title="Filter by Brand" items={brands} selected={tempBrands} onSelectionChange={setTempBrands} />
                    <Separator />
                  </>
                )}
                <FilterCheckboxGroup title="Filter by Type" items={productTypes} selected={tempTypes} onSelectionChange={setTempTypes} />
                <Separator />
                <SortRadioGroup selected={tempPriceSort} onSelectionChange={setTempPriceSort} />
              </div>
            </SheetContent>
          </Sheet>
      </div>

      <div className="mt-8">{renderProductGrid()}</div>
    </div>
  );
}
