
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type BannerCardProps = {
  href: string;
  title: string;
  cta: string;
  imageSrc: string;
  imageAlt: string;
  className?: string;
};

export default function BannerCard({ href, title, cta, imageSrc, imageAlt, className }: BannerCardProps) {
  return (
    <div className="relative w-full overflow-hidden">
        <Card className={cn("relative w-full overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl", className)}>
        <Link href={href} className="absolute inset-0 z-10">
            <span className="sr-only">{title}</span>
        </Link>
        <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 z-20 p-6">
            <h2 className="font-headline text-2xl font-bold text-white sm:text-3xl md:text-4xl">{title}</h2>
            <Button asChild variant="secondary" className="mt-4 rounded-full">
            <Link href={href}>
                {cta}
                <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            </Button>
        </div>
        </Card>
    </div>
  );
}
