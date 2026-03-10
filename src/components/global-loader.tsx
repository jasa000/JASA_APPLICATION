
"use client";

import { useLoading } from "@/hooks/use-loading";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function FullScreenLoader() {
  const { isLoading } = useLoading();

  return (
    <>
      {/* The full screen loader can be activated if needed by changing the condition below */}
      {false && isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className={cn(
            "flex flex-col items-center justify-center p-8 rounded-lg shadow-2xl",
            "w-64 h-64",
            "bg-black text-white",
            "dark:bg-white dark:text-black"
          )}>
            <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin" />
                <p className="font-semibold text-lg">Loading please wait...</p>
                <Image 
                    src="/favicon.ico" 
                    alt="Loading" 
                    width={48} 
                    height={48} 
                    className="mt-2"
                />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
