

"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { getMyOrders, getOrderSettings } from "@/lib/data";
import { getShops } from "@/lib/shops";
import type { Order, Shop, OrderSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Phone, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from 'date-fns';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText, Package } from "lucide-react";

type GroupedOrders = {
    [groupId: string]: {
        orders: Order[];
        createdAt: any;
    }
}

export default function OrdersPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [orderSettings, setOrderSettings] = useState<OrderSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
                return;
            }
            const fetchInitialData = async () => {
                setIsLoading(true);
                try {
                    const [fetchedOrders, fetchedShops, fetchedSettings] = await Promise.all([
                        getMyOrders(user.uid),
                        getShops(),
                        getOrderSettings(),
                    ]);
                    setOrders(fetchedOrders);
                    setShops(fetchedShops);
                    setOrderSettings(fetchedSettings);
                } catch (error: any) {
                    toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch data: ${error.message}` });
                } finally {
                    setIsLoading(false);
                }
            }
            fetchInitialData();
        }
    }, [user, authLoading, router, toast]);

    const groupedOrders = useMemo((): GroupedOrders => {
        if (!orders) return {};
        return orders.reduce((acc, order) => {
            const groupId = order.groupId;
            if (!acc[groupId]) {
                acc[groupId] = {
                    orders: [],
                    createdAt: order.createdAt,
                };
            }
            acc[groupId].orders.push(order);
            return acc;
        }, {} as GroupedOrders);
    }, [orders]);
    
    const sortedGroupIds = useMemo(() => {
        return Object.keys(groupedOrders).sort((a, b) => {
            return (groupedOrders[b].createdAt?.seconds || 0) - (groupedOrders[a].createdAt?.seconds || 0);
        });
    }, [groupedOrders]);

    if (authLoading || isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Order Status & History</h1>
                <p className="mt-2 text-muted-foreground">Loading your order history...</p>
                <div className="mt-8 grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-72 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    if (orders.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">No Orders Found</h2>
                <p className="text-muted-foreground">You haven't placed any orders yet.</p>
                <Button asChild className="mt-6">
                    <Link href="/">Start Shopping</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Order Status & History</h1>
            <p className="mt-2 text-muted-foreground">Here are the orders you've placed.</p>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {sortedGroupIds.map(groupId => {
                    const group = groupedOrders[groupId];
                    const firstOrder = group.orders[0];
                    
                    const subtotal = group.orders.reduce((sum, order) => sum + (order.price * order.quantity), 0);
                    const totalDeliveryFee = group.orders.reduce((sum, order) => sum + order.deliveryCharge, 0);

                    const total = subtotal + totalDeliveryFee;
                    const isDeliveryFeePaid = group.orders.every(o => o.isDeliveryFeePaid);

                    const ordersBySeller = group.orders.reduce((acc, order) => {
                            if (!acc[order.sellerId]) {
                                acc[order.sellerId] = [];
                            }
                            acc[order.sellerId].push(order);
                            return acc;
                        }, {} as Record<string, Order[]>);

                    return (
                        <div key={groupId} className="group rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1 transition-all duration-300 hover:shadow-2xl"
                             style={{ perspective: '1000px' }}>
                            <Link href={`/orders/${groupId}`} className="block h-full w-full">
                                <div className="h-full w-full rounded-lg bg-background transition-transform duration-300 group-hover:[transform:rotateX(5deg)_rotateY(-5deg)]" style={{ transformStyle: 'preserve-3d' }}>
                                    <Card className="flex flex-col h-full bg-transparent border-0">
                                       <CardHeader>
                                            <CardTitle className="text-lg">
                                                Ordered on <span className="block sm:inline">{format(firstOrder.createdAt.toDate(), 'PPP, p')}</span>
                                            </CardTitle>
                                            <CardDescription className="break-all">
                                                Group ID: {groupId}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow space-y-4">
                                            {Object.entries(ordersBySeller).map(([sellerId, sellerOrders]) => {
                                                const shop = shops.find(s => s.id === sellerId);
                                                return (
                                                    <div key={sellerId} className="border rounded-lg p-4 bg-muted/50">
                                                        <h3 className="font-semibold text-base">{shop?.name || 'Unknown Seller'}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                                            <Phone className="h-4 w-4 flex-shrink-0" />
                                                            <span className="truncate">{shop?.mobileNumbers?.join(', ') || 'Contact not available'}</span>
                                                        </div>
                                                        <Separator />
                                                        <div className="space-y-2 mt-2">
                                                            {sellerOrders.map(order => (
                                                                <div key={order.id} className="flex justify-between items-center text-sm gap-2">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                      {order.category === 'xerox' ? <FileText className="h-5 w-5 flex-shrink-0"/> : <Package className="h-5 w-5 flex-shrink-0"/>}
                                                                      <p className="font-medium truncate">{order.productName}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <Badge className="font-mono bg-green-600 text-white">Qty: {order.quantity}</Badge>
                                                                        <Badge className={cn("w-28 justify-center text-center", order.status.includes("Cancelled") || order.status.includes("Rejected") ? "bg-red-600" : "bg-blue-600", "text-white")}>{order.status}</Badge>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            
                                            <Separator className="my-2" />
                                            <div className="text-sm space-y-1">
                                                <div className="flex justify-between"><p>Subtotal:</p> <p>Rs {subtotal.toFixed(2)}</p></div>
                                                {totalDeliveryFee > 0 && (
                                                    <div className="flex justify-between text-destructive items-center">
                                                        <p>Delivery Fee:</p> 
                                                        <div className="flex items-center gap-2">
                                                            <p>Rs {totalDeliveryFee.toFixed(2)}</p>
                                                            <Badge variant={isDeliveryFeePaid ? "default" : "destructive"} className={isDeliveryFeePaid ? "bg-green-600" : ""}>
                                                                {isDeliveryFeePaid ? "Paid" : "Not Paid"}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <Separator className="my-2" />
                                            <div className="flex justify-between font-bold text-lg"><p>Total:</p> <p>Rs {total.toFixed(2)}</p></div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button size="lg" className="w-full relative overflow-hidden pointer-events-none">
                                                <div className="shining-button" />
                                                View Details &amp; Status
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
