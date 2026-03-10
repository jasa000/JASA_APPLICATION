
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WelcomeCardProps = {
    imageUrl?: string;
    className?: string;
}

export default function WelcomeCard({ imageUrl, className }: WelcomeCardProps) {
  const [typedText, setTypedText] = useState("");
  const [isClient, setIsClient] = useState(false);
  const fullText = "Welcome to Jasa Essential";

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let currentIndex = 0;
    let isDeleting = false;

    const type = () => {
      if (isDeleting) {
        setTypedText(fullText.substring(0, currentIndex - 1));
        currentIndex--;
        if (currentIndex === 0) {
          isDeleting = false;
        }
      } else {
        setTypedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
        if (currentIndex === fullText.length) {
          setTimeout(() => {
            isDeleting = true;
          }, 2000); // Pause before deleting
        }
      }
    };

    const typingInterval = setInterval(type, isDeleting ? 100 : 150);

    return () => clearInterval(typingInterval);
  }, [isClient]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {!imageUrl && (
        <div className="absolute inset-0 bg-black dark:bg-gray-200"></div>
      )}
      <Card className={cn(
        "relative z-10 w-full flex flex-col justify-center rounded-2xl",
        imageUrl ? "bg-transparent" : "bg-transparent border-0",
        className
      )}>
        {imageUrl && (
            <Image 
                src={imageUrl} 
                alt="Welcome background" 
                fill 
                className="object-cover rounded-2xl -z-10"
            />
        )}
        {imageUrl && <div className="absolute inset-0 bg-black/30 rounded-2xl -z-10"></div>}
        <CardHeader className="text-center">
          <CardTitle className={cn(
            "font-headline text-3xl md:text-4xl",
            imageUrl ? "text-white" : "text-white dark:text-black"
          )}>
            <span className="inline-block h-[45px]">
              {typedText}
              <span className={cn(
                "animate-blink border-r-2",
                imageUrl ? "border-white" : "border-white dark:border-black"
              )}></span>
            </span>
          </CardTitle>
          <CardDescription className={cn(
            "text-base",
             imageUrl ? "text-gray-200" : "text-gray-200 dark:text-gray-800"
          )}>Your one-stop destination for all creative and academic needs.</CardDescription>
        </CardHeader>
        <CardContent>
        </CardContent>
      </Card>
    </div>
  );
}
