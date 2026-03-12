"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, ShoppingCart, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";

export default function BottomNav() {
  const pathname = usePathname();
  const { items } = useCart();
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      active: pathname === "/",
    },
    {
      label: "Xerox",
      href: "/xerox",
      icon: Printer,
      active: pathname.startsWith("/xerox"),
    },
    {
      label: "Orders",
      href: "/orders",
      icon: History,
      active: pathname.startsWith("/orders"),
    },
    {
      label: "Cart",
      href: "/cart",
      icon: ShoppingCart,
      active: pathname === "/cart",
      badge: cartCount > 0 ? cartCount : null,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg lg:left-[var(--sidebar-width)] transition-[left] duration-200">
      <div className="container mx-auto flex h-16 items-center justify-around px-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors hover:text-primary",
              item.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className={cn(
              "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
              item.active ? "bg-primary/10" : "hover:bg-muted"
            )}>
              <item.icon className="h-5 w-5" />
              {item.badge && (
                <Badge className="absolute -right-1 -top-1 h-4 min-w-[1rem] justify-center p-0 text-[10px]">
                  {item.badge}
                </Badge>
              )}
            </div>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
