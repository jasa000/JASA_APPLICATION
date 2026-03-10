
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { getProductById, getProducts, getBrands, getAuthors, getProductTypes } from "@/lib/data";
import type { Product, Brand, Author, ProductType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ProductCard from "@/components/product-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [allAuthors, setAllAuthors] = useState<Author[]>([]);
  const [allProductTypes, setAllProductTypes] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNameExpanded, setIsNameExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const [emblaApi, setEmblaApi] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (typeof id !== 'string') return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [
          fetchedProduct, 
          fetchedProducts,
          fetchedBrands,
          fetchedAuthors,
          fetchedTypes,
        ] = await Promise.all([
          getProductById(id as string),
          getProducts(),
          getBrands(),
          getAuthors(),
          getProductTypes(),
        ]);

        setProduct(fetchedProduct);
        setAllProducts(fetchedProducts);
        setAllBrands(fetchedBrands);
        setAllAuthors(fetchedAuthors);
        setAllProductTypes(fetchedTypes);
      } catch (error) {
        console.error("Failed to fetch product data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load product details.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setCurrentSlide(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    addItem(product);
    router.push('/cart');
  };
  
  const renderRelatedSection = (title: string, products: Product[]) => {
    if (products.length === 0) return null;

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
            <h3 className="font-headline text-xl font-bold tracking-tight sm:text-2xl mb-4">{title}</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {products.map((p) => (
                <div key={p.id} className="w-[40vw] flex-shrink-0 sm:w-48">
                  <ProductCard product={p} showButtons={true} />
                </div>
            ))}
            </div>
        </CardContent>
      </Card>
    );
  }

  const relatedProducts = {
    byCategory: product
      ? allProducts.filter(p => p.category === product.category && p.id !== product.id)
      : [],
    byBrand: product?.brandIds
      ? allProducts.filter(p => p.id !== product.id && p.brandIds?.some(id => product.brandIds!.includes(id)))
      : [],
    byType: product?.productTypeIds
      ? allProducts.filter(p => p.id !== product.id && p.productTypeIds?.some(id => product.productTypeIds!.includes(id)))
      : [],
  };
  
  const getBrandNames = () => {
    if (!product?.brandIds) return '';
    return product.brandIds.map(id => allBrands.find(b => b.id === id)?.name).filter(Boolean).join(', ');
  }

  const getProductTypeNames = () => {
    if (!product?.productTypeIds) return '';
    return product.productTypeIds.map(id => allProductTypes.find(t => t.id === id)?.name).filter(Boolean).join(', ');
  }


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <div className="space-y-6">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="font-headline text-3xl font-bold">Product Not Found</h1>
        <p className="mt-2 text-muted-foreground">The product you're looking for does not exist.</p>
        <Button onClick={() => router.push('/')} className="mt-6">Go to Homepage</Button>
      </div>
    );
  }
  
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPercent = hasDiscount ? Math.round(((product.price - product.discountPrice!) / product.price) * 100) : 0;
  const images = (product.imageNames || []).filter(img => typeof img === 'string' && img.startsWith('http'));

  return (
    <div className="container mx-auto px-4 py-8">
        <Button onClick={() => router.back()} className="mb-4 bg-blue-600 text-white hover:bg-blue-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-4">
                {images.length > 0 ? (
                    <Carousel setApi={setEmblaApi} className="w-full">
                        <CarouselContent>
                        {images.map((imgUrl, index) => (
                            <CarouselItem key={index}>
                                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                                    <Image src={imgUrl} alt={`${product.name} image ${index + 1}`} fill className="object-contain" />
                                </div>
                            </CarouselItem>
                        ))}
                        </CarouselContent>
                        {images.length > 1 && (
                        <>
                            <CarouselPrevious className="hidden md:flex left-4" />
                            <CarouselNext className="hidden md:flex right-4" />
                        </>
                        )}
                    </Carousel>
                ) : (
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground font-bold text-3xl">
                            JASA
                        </div>
                    </div>
                )}
                 {images.length > 1 && (
                    <div className="mt-2 flex justify-center gap-2">
                        {images.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => emblaApi?.scrollTo(index)}
                            className={cn(
                            "h-2 w-2 rounded-full transition-all duration-300",
                            currentSlide === index ? "w-6 bg-primary" : "bg-muted-foreground/50"
                            )}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-col space-y-4">
                 <div className="flex items-start gap-2">
                    <h1 className={cn(
                        "font-headline text-2xl font-bold tracking-tight lg:text-3xl line-clamp-3"
                    )}>
                        {product.name}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                <p className="text-2xl font-bold text-primary">
                    Rs {hasDiscount ? product.discountPrice?.toFixed(2) : product.price.toFixed(2)}
                </p>
                {hasDiscount && (
                    <>
                    <p className="text-xl text-muted-foreground line-through">
                        Rs {product.price.toFixed(2)}
                    </p>
                    <Badge variant="destructive">{discountPercent}% OFF</Badge>
                    </>
                )}
                </div>

                <div>
                <p className={cn(
                    "text-muted-foreground leading-relaxed",
                    !isDescriptionExpanded && "line-clamp-3"
                )}>
                    {product.description}
                </p>
                <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                    {isDescriptionExpanded ? "View Less" : "View More"}
                </Button>
                </div>
                
                <div className="space-y-2 pt-4">
                    <Button size="lg" className="w-full" onClick={handleAddToCart} disabled={!user}>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        {user ? 'Add to Cart' : 'Login to Add'}
                    </Button>
                    <Button size="lg" variant="secondary" className="w-full" onClick={handleBuyNow} disabled={!user}>
                        <ShoppingBag className="mr-2 h-5 w-5" />
                        {user ? 'Buy Now' : 'Login to Buy'}
                    </Button>
                </div>
            </div>
        </div>
        
        <div className="mt-16 space-y-12">
            {renderRelatedSection(`More ${product.category}`, relatedProducts.byCategory)}
            {product.brandIds && relatedProducts.byBrand.length > 0 && renderRelatedSection(`More from ${getBrandNames()}`, relatedProducts.byBrand)}
            {product.productTypeIds && relatedProducts.byType.length > 0 && renderRelatedSection(`Related ${getProductTypeNames()} products`, relatedProducts.byType)}
        </div>
    </div>
  );
}

    

    