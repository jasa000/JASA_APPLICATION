"use client";

import { useLoading } from "@/hooks/use-loading";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export default function PageLoader() {
  const { isLoading } = useLoading();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setProgress(0);
      // Simulate loading progress
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(timer);
            return prev;
          }
          return prev + 5;
        });
      }, 100);
    } else {
      setProgress(100);
      timer = setTimeout(() => setProgress(0), 500); // Hide after completion
    }

    return () => {
      clearInterval(timer);
    };
  }, [isLoading]);

  if (!isLoading && progress === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-[80px] left-0 w-full z-[201]", // Positioned below the header
        "transition-opacity duration-300",
        isLoading ? "opacity-100" : "opacity-0"
      )}
    >
      <Progress value={progress} className="h-0.5 w-full bg-transparent" />
    </div>
  );
}
