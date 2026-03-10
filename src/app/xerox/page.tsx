
import { Suspense } from 'react';
import XeroxPageClient from './XeroxPageClient';
import { Skeleton } from '@/components/ui/skeleton';

const XeroxPageSkeleton = () => (
    <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-1/2 mx-auto" />
        <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
        <div className="mt-4 flex justify-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="mt-8">
            <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
    </div>
);

export default function XeroxPage() {
  return (
    <Suspense fallback={<XeroxPageSkeleton />}>
      <XeroxPageClient />
    </Suspense>
  );
}
