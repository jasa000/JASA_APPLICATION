
"use client";

import { Bell, LogIn, ShoppingCart, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-provider';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/context/notification-provider';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const isMobile = useIsMobile();

  const getInitials = (name?: string | null) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

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
            {user && (
              <>
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
                
                <Button asChild variant="ghost" size="icon" className="rounded-full h-9 w-9 p-0 hover:bg-white/20">
                  <Link href="/profile">
                    <Avatar className="h-8 w-8 border border-white/20">
                      <AvatarImage src={user.photoURL || undefined} alt={user.name} />
                      <AvatarFallback className="bg-blue-700 text-white text-[10px]">
                        {getInitials(user.displayName || user.name) || <UserIcon className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </Button>
              </>
            )}
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
