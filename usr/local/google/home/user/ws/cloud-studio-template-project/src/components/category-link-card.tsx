
"use client";

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';
import Image from 'next/image';

type CategoryLinkCardProps = {
  category: Category;
  index: number;
};

export default function CategoryLinkCard({ category, index }: CategoryLinkCardProps) {
  const hasUploadedImage = category.image.src && category.image.src.startsWith('http');
  
  return (
    <Link href={category.href} className="group block w-full text-center">
        <Card className={cn(
          "relative w-full overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-lg group-hover:-translate-y-1",
          "border-border bg-background"
        )}>
           <div 
            className="shining-card-animation"
            style={{ animationDelay: `${index * 0.2}s` }}
          />
          <CardContent className="relative aspect-square w-full p-0">
             {hasUploadedImage ? (
                <Image 
                    src={category.image.src} 
                    alt={category.name}
                    fill
                    className="object-cover"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                    <p className="font-bold text-2xl text-muted-foreground">JASA</p>
                </div>
            )}
          </CardContent>
        </Card>
        <p className="mt-2 font-headline text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
            {category.name}
        </p>
      </Link>
  );
}
