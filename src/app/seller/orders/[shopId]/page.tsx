
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getOrdersBySeller } from '@/lib/data';
import { getAllUsers } from '@/lib/users';
import type { Order, UserProfile, OrderStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Package, FileText, Phone, MapPin, Clock, CheckCircle, AlertTriangle, Undo2, X, ChevronDown, ArrowRight, Copy, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';


type GroupedOrders = {
  [groupId: string]: {
    user: UserProfile;
    orders: Order[];
    createdAt: any;
  };
};

const StatCard = ({ title, value, icon: Icon, loading }: { title: string, value: number, icon: React.ElementType, loading: boolean }) => (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
        <CardTitle className="text-xs font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-2 pt-0">
        {loading ? (
          <Skeleton className="h-6 w-10" />
        ) : (
          <div className="text-xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
);

export default function ManageShopOrdersPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [groupedOrders, setGroupedOrders] = useState<GroupedOrders>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [isStatsVisible, setIsStatsVisible] = useState(true);

  const isEmployeeOnly = user?.roles.includes('employee') && !user.roles.includes('seller');

  const fetchOrdersAndUsers = useCallback(async () => {
    if (!shopId) return;
    setIsLoading(true);
    try {
      const [shopOrders, allUsers] = await Promise.all([
        getOrdersBySeller(shopId),
        getAllUsers(),
      ]);
      setOrders(shopOrders);

      const usersMap = new Map(allUsers.map(u => [u.uid, u]));

      const grouped: GroupedOrders = shopOrders.reduce((acc, order) => {
        const groupId = order.groupId;
        if (!acc[groupId]) {
          const orderUser = usersMap.get(order.userId);
          if (orderUser) {
            acc[groupId] = { user: orderUser, orders: [], createdAt: order.createdAt };
          }
        }
        if (acc[groupId]) {
          acc[groupId].orders.push(order);
        }
        return acc;
      }, {} as GroupedOrders);

      setGroupedOrders(grouped);
      toast({ title: "Orders Refreshed", description: "The latest order data has been loaded." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [shopId, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || (!user.roles.includes("seller") && !user.roles.includes("employee"))) {
        router.push("/");
        return;
      }
      fetchOrdersAndUsers();
    }
  }, [authLoading, user, shopId, router, fetchOrdersAndUsers]);

  const ordersByStatus = useMemo(() => {
    const pending: GroupedOrders = {};
    const processing: GroupedOrders = {};
    const completed: GroupedOrders = {};
    
    Object.entries(groupedOrders).forEach(([groupId, group]) => {
      const hasPending = group.orders.some(o => o.status === 'Pending Confirmation' || o.status === 'Return Requested');
      const hasCompleted = group.orders.every(o => ['Delivered', 'Cancelled', 'Rejected', 'Return Completed', 'Return Rejected', 'Replacement Completed'].includes(o.status));

      if (hasPending) {
        pending[groupId] = group;
      } else if (hasCompleted) {
        completed[groupId] = group;
      } else {
        processing[groupId] = group;
      }
    });

    return { pending, processing, completed };
  }, [groupedOrders]);

  const orderStats = useMemo(() => {
    const activeStatuses: OrderStatus[] = ["Pending Confirmation", "Processing", "Packed", "Shipped", "Out for Delivery", "Replacement Confirmed"];
    const filteredOrders = orders.filter(o => o.productId !== 'DELIVERY_FEE' && o.productId !== 'DELIVERY_FEE_XEROX');
    
    return {
        active: filteredOrders.filter(o => activeStatuses.includes(o.status)).length,
        returns: filteredOrders.filter(o => o.status.startsWith('Return') || o.status.startsWith('Replacement') || o.status === 'Picked Up').length,
        completed: filteredOrders.filter(o => o.status === 'Delivered' || o.status === 'Replacement Completed').length,
        sellerRejected: filteredOrders.filter(o => o.status === 'Rejected' || o.status === 'Return Rejected').length,
        userCancelled: filteredOrders.filter(o => o.status === 'Cancelled').length
    };
  }, [orders]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied to Clipboard",
      description: `Customer ID: ${id}`,
    });
  };
  
  const renderOrderList = (filteredGroupedOrders: GroupedOrders) => {
    if (isLoading) {
      return (
         <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
         </div>
      );
    }

    const sortedGroupIds = Object.keys(filteredGroupedOrders).sort((a, b) => {
        return (filteredGroupedOrders[b].createdAt?.seconds || 0) - (filteredGroupedOrders[a].createdAt?.seconds || 0);
    });

    if (sortedGroupIds.length === 0) {
      return (
        <Card className="mt-8 text-center py-12">
            <CardHeader>
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle>No orders in this category</CardTitle>
                <CardDescription>There are currently no orders with this status.</CardDescription>
            </CardHeader>
        </Card>
      );
    }
    
    return (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedGroupIds.map((groupId) => {
            const group = filteredGroupedOrders[groupId];
            const { user, orders, createdAt } = group;
            const firstOrder = orders[0];
            if (!firstOrder) return null;
            const address = firstOrder.shippingAddress;
            
            return (
              <Card key={groupId} className="flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                            Group ID: <span className="font-mono text-sm">{groupId}</span>
                        </CardTitle>
                         <p className="text-sm text-muted-foreground flex-shrink-0">
                            {orders.length} item(s)
                        </p>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-sm">
                      <Table>
                        <TableBody>
                          <TableRow className="border-0">
                            <TableCell className="font-bold w-[100px] p-1">Customer ID</TableCell>
                            <TableCell className="font-semibold p-1 flex items-center gap-1">
                                {user.shortId}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyId(user.shortId)}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-0">
                            <TableCell className="font-bold w-[100px] p-1">Customer</TableCell>
                            <TableCell className="font-semibold p-1">{user.name}</TableCell>
                          </TableRow>
                          <TableRow className="border-0">
                            <TableCell className="font-bold w-[100px] p-1">Mobile</TableCell>
                            <TableCell className="font-semibold p-1">{firstOrder.mobile}</TableCell>
                          </TableRow>
                          {firstOrder.altMobiles && firstOrder.altMobiles.length > 0 && (
                             <TableRow className="border-0">
                               <TableCell className="font-bold w-[100px] p-1 align-top">Alt. Mobiles</TableCell>
                               <TableCell className="font-semibold p-1">{firstOrder.altMobiles.map(m => m.value).join(', ')}</TableCell>
                             </TableRow>
                          )}
                           <TableRow className="border-0">
                             <TableCell className="font-bold w-[100px] p-1 align-top">Address</TableCell>
                             <TableCell className="font-semibold p-1">
                                <p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
                                <p>{address.city}, {address.state} - {address.postalCode}</p>
                             </TableCell>
                           </TableRow>
                           <TableRow className="border-0">
                             <TableCell className="font-bold w-[100px] p-1">Ordered On</TableCell>
                             <TableCell className="font-semibold p-1">{format(createdAt.toDate(), 'PPP p')}</TableCell>
                           </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                   
                   <p className="text-sm font-medium">Items in this Delivery:</p>
                   <div className="space-y-1">
                      {orders.map(order => (
                        <div key={order.id} className="flex justify-between items-center text-sm gap-2 p-1 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2 min-w-0">
                                {order.category === 'xerox' ? <FileText className="h-5 w-5 flex-shrink-0"/> : <Package className="h-5 w-5 flex-shrink-0"/>}
                                <p className="font-medium truncate">{order.productName}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline" className="font-mono">Qty: {order.quantity}</Badge>
                                <Badge variant={order.status.includes("Cancelled") || order.status.includes("Rejected") ? "destructive" : "secondary"} className="w-28 justify-center text-center">{order.status}</Badge>
                            </div>
                        </div>
                      ))}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href={`/seller/orders/${shopId}/${groupId}`}>
                            View Details & Manage <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="pb-4">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
          Manage Shop Orders
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review and process incoming orders for your shop.
        </p>
      </div>
      
      <div className="sticky top-[80px] z-40 bg-background py-2 space-y-2">
        <Collapsible open={isStatsVisible} onOpenChange={setIsStatsVisible}>
            <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-between bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
                    >
                        Order Statistics
                        <ChevronDown className={cn("transition-transform duration-300 group-hover:animate-slide-right", isStatsVisible && "rotate-180")} />
                    </Button>
                </CollapsibleTrigger>
                <Button
                    onClick={fetchOrdersAndUsers}
                    disabled={isLoading}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    size="icon"
                    aria-label="Refresh orders"
                >
                    <RefreshCw className={isLoading ? "animate-spin" : ""} />
                </Button>
            </div>
            <CollapsibleContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2">
                    <StatCard title="Active" value={orderStats.active} icon={Clock} loading={isLoading} />
                    <StatCard title="Returns" value={orderStats.returns} icon={Undo2} loading={isLoading} />
                    <StatCard title="Completed" value={orderStats.completed} icon={CheckCircle} loading={isLoading} />
                    <StatCard title="Rejected" value={orderStats.sellerRejected} icon={AlertTriangle} loading={isLoading} />
                    <StatCard title="Cancelled" value={orderStats.userCancelled} icon={X} loading={isLoading} />
                </div>
            </CollapsibleContent>
        </Collapsible>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-red-600 p-1 h-auto rounded-md">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-red-600 text-white h-auto py-1.5 px-1 text-sm">Pending ({Object.keys(ordersByStatus.pending).length})</TabsTrigger>
              <TabsTrigger value="processing" className="data-[state=active]:bg-white data-[state=active]:text-red-600 text-white h-auto py-1.5 px-1 text-sm">Processing ({Object.keys(ordersByStatus.processing).length})</TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:text-red-600 text-white h-auto py-1.5 px-1 text-sm">Completed ({Object.keys(ordersByStatus.completed).length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="pending" className="mt-0">
            {renderOrderList(ordersByStatus.pending)}
          </TabsContent>
          <TabsContent value="processing" className="mt-0">
            {renderOrderList(ordersByStatus.processing)}
          </TabsContent>
          <TabsContent value="completed" className="mt-0">
            {renderOrderList(ordersByStatus.completed)}
          </TabsContent>
      </Tabs>
    </div>
  );
}

    