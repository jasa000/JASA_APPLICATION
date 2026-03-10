
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { getOrdersBySeller } from "@/lib/data";
import { getShopById } from "@/lib/shops";
import type { Order, Shop, ShopService } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ArrowLeft, BarChart2, DollarSign, Package, PackageOpen, Repeat, Truck } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { cn } from "@/lib/utils";

const StatCard = ({ title, value, icon: Icon, loading }: { title: string, value: string | number, icon: React.ElementType, loading: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
);

export default function ShopAnalyticsPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  
  useEffect(() => {
    // Set initial date range on client to avoid hydration mismatch
    setFromDate(startOfDay(new Date()));
    setToDate(endOfDay(new Date()));
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.roles.includes("admin")) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have permission to view this page.",
        });
        router.push("/");
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router, toast, shopId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedShop, fetchedOrders] = await Promise.all([
        getShopById(shopId),
        getOrdersBySeller(shopId),
      ]);
      setShop(fetchedShop);
      setOrders(fetchedOrders);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to fetch shop data: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!fromDate) return [];
    
    const start = startOfDay(fromDate);
    const end = toDate ? endOfDay(toDate) : endOfDay(fromDate);

    return orders.filter(order => {
      const orderDate = order.createdAt.toDate();
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, fromDate, toDate]);

  const stats = useMemo(() => {
    const deliveredOrders = filteredOrders.filter(o => o.status === 'Delivered');
    const returnedOrders = filteredOrders.filter(o => o.status === 'Return Completed' && o.returnType === 'refund');
    
    const revenueFromDelivered = deliveredOrders.reduce((acc, order) => acc + (order.price * order.quantity), 0);
    const valueOfReturned = returnedOrders.reduce((acc, order) => acc + (order.price * order.quantity), 0);
    
    const totalRevenue = revenueFromDelivered - valueOfReturned;
    const totalDeliveryCharges = deliveredOrders.reduce((acc, order) => acc + order.deliveryCharge, 0);

    return {
      totalRevenue,
      totalDeliveryCharges,
      itemsDelivered: deliveredOrders.length,
      itemsReturned: filteredOrders.filter(o => o.status === 'Return Completed' || o.status === 'Replacement Issued').length,
    };
  }, [filteredOrders]);


  return (
    <div className="container mx-auto px-4 py-8">
      <Button onClick={() => router.back()} className="mb-4 bg-blue-600 text-white hover:bg-blue-700">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="mb-8">
        <CardHeader>
          {isLoading ? (
            <>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-1/3 mt-2" />
            </>
          ) : (
            <>
              <CardTitle>{shop?.name}</CardTitle>
              <CardDescription>{shop?.address}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
            <h4 className="text-sm font-medium mb-2">Services Provided</h4>
            <div className="flex flex-wrap gap-2">
                {isLoading ? <Skeleton className="h-6 w-48" /> : (
                    shop?.services.map(service => <Badge key={service} variant="secondary">{service}</Badge>)
                )}
            </div>
        </CardContent>
      </Card>
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => {
                const today = new Date();
                setFromDate(startOfDay(today));
                setToDate(endOfDay(today));
            }}>Today</Button>
            <Button variant="outline" onClick={() => {
                const yesterday = subDays(new Date(), 1);
                setFromDate(startOfDay(yesterday));
                setToDate(endOfDay(yesterday));
            }}>Yesterday</Button>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="from-date"
                    variant={"outline"}
                    className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !fromDate && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "LLL dd, y") : <span>From Date</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                />
                </PopoverContent>
            </Popover>
             <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="to-date"
                    variant={"outline"}
                    className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !toDate && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "LLL dd, y") : <span>To Date</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                />
                </PopoverContent>
            </Popover>
        </div>
        <span className="text-sm text-muted-foreground">
            {fromDate && `Showing data for ${format(fromDate, "PPP")}${toDate ? ` to ${format(toDate, "PPP")}` : ''}`}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Revenue" value={`Rs ${stats.totalRevenue.toFixed(2)}`} icon={DollarSign} loading={isLoading} />
        <StatCard title="Delivery Fees Collected" value={`Rs ${stats.totalDeliveryCharges.toFixed(2)}`} icon={Truck} loading={isLoading} />
        <StatCard title="Items Delivered" value={stats.itemsDelivered} icon={Package} loading={isLoading} />
        <StatCard title="Returns/Replacements" value={stats.itemsReturned} icon={Repeat} loading={isLoading} />
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>All orders within the selected date range.</CardDescription>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Total Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? Array.from({length: 5}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                    )) : filteredOrders.length > 0 ? filteredOrders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="text-xs text-muted-foreground">{order.id}</TableCell>
                            <TableCell className="font-medium">{order.productName}</TableCell>
                            <TableCell>Rs {(order.price * order.quantity + order.deliveryCharge).toFixed(2)}</TableCell>
                            <TableCell><Badge variant={order.status.includes('Delivered') ? 'default' : 'secondary'}>{order.status}</Badge></TableCell>
                            <TableCell>{format(order.createdAt.toDate(), "PPP")}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center">No orders found for the selected date range.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    