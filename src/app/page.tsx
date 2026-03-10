
"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import type { EmblaCarouselType } from "embla-carousel-react";
import BannerCard from '@/components/banner-card';
import WelcomeCard from '@/components/welcome-card';
import CategoryLinkCard from '@/components/category-link-card';
import { categories as defaultCategories, getProducts, getHomepageContent } from '@/lib/data';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import type { Product, HomepageContent, Category } from "@/lib/types";
import ProductCard from "@/components/product-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Search, X, ChevronRight, ChevronDown, Notebook, Book, CircuitBoard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import XeroxTicker from "@/components/xerox-ticker";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import ActiveOrders from "@/components/active-orders";
import Fuse from "fuse.js";

export const dynamic = 'force-dynamic';

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}


export default function Home() {
  const AUTOPLAY_DELAY = 8000;
  const plugin = React.useRef(
    Autoplay({ 
      delay: AUTOPLAY_DELAY, 
      stopOnInteraction: false,
      stopOnLastSnap: false,
    })
  );
  
  const router = useRouter();

  const [productsByCategory, setProductsByCategory] = React.useState<{ [key in Product['category']]?: Product[] }>({});
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [homepageContent, setHomepageContent] = React.useState<HomepageContent | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [displayCategories, setDisplayCategories] = React.useState<Category[]>(defaultCategories);
  
  const [emblaApi, setEmblaApi] = React.useState<EmblaCarouselType | null>(null);
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeSearch, setActiveSearch] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Product[]>([]);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const fuse = React.useMemo(() => {
    return new Fuse(allProducts, {
      keys: ['name', 'description'],
      includeScore: true,
      threshold: 0.4,
    });
  }, [allProducts]);

  React.useEffect(() => {
    const fetchPageData = async () => {
      setIsLoading(true);
      try {
        const [
          all,
          stationary, 
          books, 
          electronics, 
          content
        ] = await Promise.all([
          getProducts(),
          getProducts('stationary'),
          getProducts('books'),
          getProducts('electronics'),
          getHomepageContent(),
        ]);
        setAllProducts(all);
        setProductsByCategory({ stationary, books, electronics });
        setHomepageContent(content);

        // Always use default categories, but enrich with images if they exist
        const categoriesWithImages = defaultCategories.map(cat => {
            const categoryKey = cat.href.replace('/', '') as keyof HomepageContent['categoryImages'];
            const dynamicImageUrl = content?.categoryImages?.[categoryKey];
            return { 
                ...cat, 
                image: { 
                    ...cat.image, 
                    src: dynamicImageUrl || '',
                }
            };
        });
        setDisplayCategories(categoriesWithImages);


      } catch (error) {
        console.error("Failed to fetch data for home page:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPageData();
  }, []);
  
  React.useEffect(() => {
    if (activeSearch.length > 1) {
      const results = fuse.search(activeSearch).map(result => result.item);
      setSearchResults(results);
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  }, [activeSearch, fuse]);
  
  React.useEffect(() => {
    if (!emblaApi) return;
  
    const onSelect = () => {
      setCurrentSlide(emblaApi.selectedScrollSnap());
      setProgress(0); // Reset progress on manual slide change
    };
  
    const onSettle = () => {
      // This is triggered after the carousel settles on a new slide.
      // We restart the progress animation here.
      setProgress(0); // Ensure it's reset
       setTimeout(() => setProgress(100), 50); // Start the animation
    };
    
    emblaApi.on("select", onSelect);
    emblaApi.on("settle", onSettle);
    onSettle(); // Initial call
  
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("settle", onSettle);
    };
  }, [emblaApi]);

  const isWelcomeVisible = homepageContent?.isWelcomeVisible ?? true;
  const visibleBanners = (homepageContent?.banners || []).filter(banner => banner.imageUrl && banner.isVisible);
  const carouselItems = [
    ...(isWelcomeVisible ? [{ type: 'welcome' }] : []),
    ...visibleBanners.map(banner => ({ type: 'banner', banner }))
  ];

  const categoryDisplayInfo = {
      stationary: { title: "Featured Stationary", href: "/stationary", className: "bg-gradient-to-t from-blue-500 to-white border-black dark:border-white rounded-2xl", icon: <Notebook className="text-black" /> },
      books: { title: "Latest Books", href: "/books", className: "bg-gradient-to-t from-green-500 to-white border-black dark:border-white rounded-2xl", icon: <Book className="text-black" /> },
      electronics: { title: "Top Electronic Kits", href: "/electronics", className: "bg-gradient-to-t from-orange-500 to-white border-black dark:border-white rounded-2xl", icon: <CircuitBoard className="text-black" /> },
  }
  
  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
    setIsSearchOpen(false);
    setSearchQuery('');
    setActiveSearch('');
  };
  
  const handleClearSearch = () => {
      setSearchQuery('');
      setActiveSearch('');
      setIsSearchOpen(false);
  }
  
  const handleSearch = () => {
      setActiveSearch(searchQuery);
  }

  const renderProductSection = (category: Product['category']) => {
    const catInfo = categoryDisplayInfo[category];
    const [shuffledProducts, setShuffledProducts] = React.useState<Product[]>([]);

    React.useEffect(() => {
        const productList = productsByCategory[category] || [];
        if (productList.length > 0) {
            setShuffledProducts(shuffleArray(productList).slice(0, 4));
        }
    }, [productsByCategory, category]);


    if (isLoading) {
      return (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                      <div className="flex flex-col space-y-3">
                        <Skeleton className="h-[220px] w-full rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-5/6" />
                        </div>
                      </div>
                  </div>
                ))}
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      )
    }

    if (shuffledProducts.length === 0 || !catInfo) return null;

    const isGradient = catInfo.className.includes('bg-gradient-to-t');

    return (
      <Card className={cn("overflow-hidden", catInfo.className)}>
        <CardHeader className="text-center">
            <CardTitle className={cn(
                "font-headline text-2xl font-bold tracking-tight sm:text-3xl flex items-center justify-center gap-2",
                isGradient ? "text-black" : "text-foreground"
            )}>
                {catInfo.icon}
                {catInfo.title}
            </CardTitle>
        </CardHeader>
        <CardContent>
             <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {shuffledProducts.map((product) => (
                <ProductCard key={product.id} product={product} showButtons={true} />
              ))}
            </div>
        </CardContent>
        <CardFooter>
            <Link href={catInfo.href} className={cn(
                "mx-auto flex flex-col items-center text-sm font-semibold transition-transform hover:-translate-y-1",
                 isGradient ? "text-black" : "text-muted-foreground"
            )}>
                <span>View More</span>
                <ChevronDown className="h-6 w-6 animate-float-up" />
            </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
      <div className="w-full">
        <div className="container mx-auto px-4 pt-4">
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <PopoverAnchor asChild>
                <div className="flex w-full gap-2">
                  <div className="relative flex-grow">
                    <Input
                      type="text"
                      placeholder="Search your product"
                      className="h-12 rounded-md border-primary pl-12 pr-4"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                    />
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <Image
                        src="/favicon.ico"
                        alt="Jasa Essentials"
                        width={32}
                        height={32}
                        className="rounded-full border-2 border-primary"
                      />
                    </span>
                  </div>
                  {activeSearch ? (
                     <Button
                      variant="destructive"
                      className="h-12"
                      onClick={handleClearSearch}
                    >
                      <X className="mr-2 h-4 w-4" /> Clear
                    </Button>
                  ) : (
                    <Button
                      className="h-12"
                      onClick={handleSearch}
                    >
                      <Search className="mr-2 h-4 w-4" /> Search
                    </Button>
                  )}
                </div>
              </PopoverAnchor>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
                <div className="max-h-60 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((product) => (
                      <Button
                        key={product.id}
                        variant="ghost"
                        className="w-full justify-between h-auto p-2"
                        onClick={() => handleProductClick(product.id)}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="relative h-10 w-10 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                            {product.imageNames?.[0] ? (
                              <Image
                                src={product.imageNames[0]}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                                JASA
                              </div>
                            )}
                          </div>
                          <span className="truncate text-left text-sm">
                            {product.name}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </Button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No products found.
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
        </div>
        <div className="overflow-hidden pt-4">
           <Carousel
            setApi={setEmblaApi}
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
            opts={{
              loop: carouselItems.length > 1,
            }}
          >
            <CarouselContent className="px-4 -ml-4">
              {isLoading ? (
                   <CarouselItem className="pl-4">
                      <div className="relative w-full overflow-hidden">
                          <Skeleton className="relative h-40 md:h-80 lg:h-[23rem]" />
                      </div>
                   </CarouselItem>
              ) : carouselItems.map((item, index) => {
                const cardHeight = "h-40 md:h-80 lg:h-[23rem]";
                if (item.type === 'welcome') {
                  return (
                    <CarouselItem key="welcome" className="pl-4">
                      <WelcomeCard imageUrl={homepageContent?.welcomeImageUrl} className={cardHeight}/>
                    </CarouselItem>
                  );
                }
                if (item.type === 'banner' && item.banner) {
                  const banner = item.banner;
                  return (
                    <CarouselItem key={banner.id} className="pl-4">
                      <BannerCard
                        href={banner.href}
                        title={banner.title}
                        cta={banner.cta}
                        imageSrc={banner.imageUrl}
                        imageAlt={banner.title}
                        className={cardHeight}
                      />
                    </CarouselItem>
                  );
                }
                return null;
              })}
               {
                !isLoading && carouselItems.length === 0 && (
                  <CarouselItem className="pl-4">
                      <div className="relative w-full overflow-hidden">
                         <div className="relative h-40 w-full rounded-2xl md:h-80 lg:h-[23rem] bg-muted flex items-center justify-center">
                            <p className="text-muted-foreground">No promotional content available right now.</p>
                         </div>
                      </div>
                   </CarouselItem>
                )
              }
            </CarouselContent>
          </Carousel>
          {carouselItems.length > 1 && (
              <div className="container mx-auto mt-2 flex justify-center gap-2 px-4">
                  {carouselItems.map((_, index) => {
                      const isActive = index === currentSlide;
                      return (
                          <button
                              key={index}
                              className={cn(
                                  "h-2 rounded-full bg-muted dark:bg-muted transition-all duration-300 relative overflow-hidden",
                                  isActive ? "w-6" : "w-2 bg-black/50 dark:bg-muted-foreground/50 hover:bg-black/70 dark:hover:bg-muted-foreground"
                              )}
                              onClick={() => emblaApi?.scrollTo(index)}
                          >
                              {isActive && (
                                  <div
                                      className="absolute left-0 top-0 h-full rounded-full bg-primary"
                                      style={{
                                        width: `${progress}%`,
                                        transition: progress > 1 ? `width ${AUTOPLAY_DELAY}ms linear` : 'none',
                                      }}
                                  />
                              )}
                              <span className="sr-only">Go to slide {index + 1}</span>
                          </button>
                      );
                  })}
              </div>
          )}
        </div>

         <div className="py-8">
            <div className="grid grid-cols-4 w-full gap-4 container mx-auto px-4">
                {displayCategories.map((category, index) => (
                    <CategoryLinkCard key={category.id} category={category} index={index} />
                ))}
            </div>
         </div>

         <div className="container mx-auto px-4 space-y-8">
           <ActiveOrders />
           <div className="overflow-hidden py-8">
              <XeroxTicker />
           </div>

           <div className="overflow-hidden">
            {renderProductSection('stationary')}
           </div>
           <div className="overflow-hidden">
            {renderProductSection('books')}
           </div>
           <div className="overflow-hidden">
            {renderProductSection('electronics')}
           </div>
         </div>
      </div>
    </>
  );
}
