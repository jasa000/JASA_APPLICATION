import Link from 'next/link';
import Image from 'next/image';
import type { Category } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

type CategoryCardProps = {
  category: Category;
};

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href="#" className="group block">
      <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
        <CardContent className="flex flex-col items-center justify-center p-4 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent sm:h-32 sm:w-32">
                <Image
                    src={category.image.src}
                    alt={category.image.alt}
                    width={category.image.width}
                    height={category.image.height}
                    className="object-contain"
                    data-ai-hint={category.image.hint}
                />
            </div>
            <h3 className="mt-4 font-headline text-sm font-semibold sm:text-base">{category.name}</h3>
        </CardContent>
      </Card>
    </Link>
  );
}
