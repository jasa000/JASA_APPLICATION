
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="icon"
        onClick={scrollToTop}
        className={cn(
          'h-14 w-14 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 active:scale-95 transition-opacity',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        aria-label="Scroll to top"
      >
        <ArrowUp className="animate-float-up" />
      </Button>
    </div>
  );
}
