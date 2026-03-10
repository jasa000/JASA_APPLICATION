
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-provider";
import { getMyOrders } from "@/lib/data";
import { getShops } from "@/lib/shops";
import type { Order, OrderStatus, Shop } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { History, Phone, UploadCloud, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function ActiveOrders() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchActiveOrders = async () => {
      setIsLoading(true);
      try {
        const [myOrders, allShops] = await Promise.all([getMyOrders(user.uid), getShops()]);
        
        const activeStatuses: OrderStatus[] = [
          "Pending Confirmation",
          "Processing",
          "Packed",
          "Shipped",
          "Out for Delivery",
          "Pending Delivery Confirmation",
          "Return Requested",
          "Return Approved",
          "Out for Pickup",
          "Picked Up",
          "Pending Return Confirmation",
          "Replacement Confirmed",
          "Pending Replacement Confirmation",
        ];
        
        const filteredOrders = myOrders.filter(order => activeStatuses.includes(order.status));
        setActiveOrders(filteredOrders);
        setShops(allShops);
      } catch (error) {
        console.error("Failed to fetch active orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveOrders();
  }, [user]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `Copied: ${text}`,
    });
  };

  if (!user || (!isLoading && activeOrders.length === 0)) {
    return null; // Don't render anything if not logged in or no active orders
  }
  
  const getShopPhoneNumber = (sellerId: string) => {
    const shop = shops.find(s => s.id === sellerId);
    return shop?.mobileNumbers?.[0] || 'N/A';
  }

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-72 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
          Track Orders ({activeOrders.length})
        </h2>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/orders">
            <History className="mr-2 h-4 w-4" />
            View All
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {activeOrders.map(order => {
          const phoneNumber = getShopPhoneNumber(order.sellerId);
          return (
            <Link key={order.id} href={`/orders/${order.groupId}`} className="block w-72 flex-shrink-0 h-full">
              <Card className="w-full h-full flex-shrink-0 flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">{order.productName}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-sm">
                    <p><strong>Quantity:</strong> {order.quantity}</p>
                    {order.category === 'xerox' && (
                        <div className="space-y-1">
                            <strong>Upload Status:</strong>
                            {order.productImage ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">Uploaded</Badge>
                            ) : (
                                <div className="flex flex-col items-start gap-2">
                                    <Badge variant="destructive">Pending</Badge>
                                    <Button size="sm" variant="secondary" onClick={(e) => { e.preventDefault(); router.push(`/orders/${order.groupId}`); }}>
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                        Upload Now
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                      <strong>Seller Contact:</strong> 
                      <div className="flex items-center gap-1 text-primary">
                        <Phone className="h-4 w-4" />
                        <span>{phoneNumber}</span>
                        {phoneNumber !== 'N/A' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={(e) => {
                              e.preventDefault();
                              handleCopy(phoneNumber);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                </CardContent>
                <CardFooter className="p-0">
                    <div className="w-full text-center py-2 px-4 bg-primary/10 rounded-b-lg">
                        <p className="font-semibold text-sm text-primary">{order.status}</p>
                    </div>
                </CardFooter>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

    