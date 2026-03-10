
"use client";

import { Bell, LogIn, Search, ShoppingCart, User, UserPlus, ShoppingBag, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Button } from './ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-provider';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/context/notification-provider';

export default function Header() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const isMobile = useIsMobile();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-header text-header-foreground">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-2">
            <SidebarTrigger className="relative h-10 w-10 bg-transparent text-header-foreground hover:bg-white/20 [&>svg]:h-8 [&>svg]:w-8 [&>svg]:stroke-[2.5]" />
            <Link href="/">
              <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1 text-header-foreground">
                    <span className="font-headline text-2xl font-bold">JASA</span>
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="flex w-full justify-between text-xs font-bold">
                    <span>E</span>
                    <span>S</span>
                    <span>S</span>
                    <span>E</span>
                    <span>N</span>
                    <span>T</span>
                    <span>I</span>
                    <span>A</span>
                    <span className="font-bold">L</span>
                  </div>
              </div>
            </Link>
        </div>

        <div className="flex items-center justify-end space-x-2">
            <Button asChild variant="outline" size={isMobile ? "icon" : "default"} className='rounded-full h-9 w-9 md:w-auto text-blue-500 bg-white hover:bg-white/90'>
              <Link href="/">
                <Home className={isMobile ? "h-5 w-5" : "h-4 w-4"}/>
                <span className="hidden md:inline">Home</span>
              </Link>
            </Button>
            {user && (
              <Button asChild variant="ghost" size="icon" className='relative rounded-full h-9 w-9 text-white hover:bg-white/20'>
                  <Link href="/notifications">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 bg-red-600 text-white hover:bg-red-700">
                              {unreadCount}
                          </Badge>
                      )}
                      <span className="sr-only">Notifications</span>
                  </Link>
              </Button>
            )}
            <Button asChild variant="outline" size={isMobile ? "icon" : "default"} className='rounded-full h-9 w-9 md:w-auto text-blue-500 bg-white hover:bg-white/90'>
                <Link href="/cart">
                    <ShoppingCart className={isMobile ? "h-5 w-5" : "h-4 w-4"}/>
                    <span className="hidden md:inline">Cart</span>
                </Link>
            </Button>
          {!user && (
              <Button 
                asChild
                size={isMobile ? "icon" : "default"} 
                className='rounded-full h-9 w-9 md:w-auto text-blue-500 bg-white hover:bg-white/90'
              >
                <Link href="/login">
                  <LogIn className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                  <span className="hidden md:inline">Login</span>
                </Link>
              </Button>
          )}
        </div>
      </div>
    </header>
  );
}
