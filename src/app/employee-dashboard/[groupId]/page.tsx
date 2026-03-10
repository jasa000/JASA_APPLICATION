
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { getOrdersByGroupId, getXeroxOptions, updateOrderStatus, markDeliveryFeeAsPaid } from "@/lib/data";
import { getShops } from "@/lib/shops";
import { getSellers, getEmployees, getAllUsers } from "@/lib/users";
import type { Order, OrderStatus, Shop, UserProfile, XeroxOption } from "@/lib/types";
import { HARDCODED_XEROX_OPTIONS } from "@/lib/xerox-options";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Package, Truck, Repeat, CheckCircle, Store, BadgeCheck, DollarSign, User, Phone, MapPin, Copy, Download, RefreshCw } from "lucide-react";
import Image from "next/image";
import OrderTracker from "@/components/order-tracker";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import Link from "next/link";
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


const NEXT_STATUS: Record<string, OrderStatus> = {
  "Processing": "Packed",
  "Packed": "Shipped",
  "Shipped": "Out for Delivery",
  "Return Approved": "Out for Pickup",
  "Out for Pickup": "Picked Up",
  "Replacement Confirmed": "Processing",
};

export default function EmployeeOrderGroupPage() {
  const { groupId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [paperTypes, setPaperTypes] = useState<XeroxOption[]>([]);
  const [bindingTypes, setBindingTypes] = useState<XeroxOption[]>([]);
  const [laminationTypes, setLaminationTypes] = useState<XeroxOption[]>([]);
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const fetchOrdersAndData = useCallback(async () => {
    if (typeof groupId !== 'string') {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid Order Group ID.' });
      router.push('/employee-dashboard');
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedShops, fetchedPaperTypes, fetchedBindingTypes, fetchedLaminationTypes, allUsers] = await Promise.all([
          getOrdersByGroupId(groupId),
          getShops(),
          getXeroxOptions('paperType'),
          getXeroxOptions('bindingType'),
          getXeroxOptions('laminationType'),
          getAllUsers(),
      ]);
      setOrders(fetchedOrders);
      setShops(fetchedShops);
      setPaperTypes(fetchedPaperTypes);
      setBindingTypes(fetchedBindingTypes);
      setLaminationTypes(fetchedLaminationTypes);
      if (fetchedOrders.length > 0) {
        const orderUser = allUsers.find(u => u.uid === fetchedOrders[0]?.userId);
        setCustomer(orderUser || null);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch order details: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [groupId, toast, router]);
  
  const handleRefresh = useCallback(async () => {
    if (typeof groupId !== 'string') return;
    setIsRefreshing(true);
    try {
        const fetchedOrders = await getOrdersByGroupId(groupId);
        setOrders(fetchedOrders);
        toast({ title: "Orders Updated", description: "The latest order status has been fetched." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Refresh Failed', description: `Failed to refresh order details: ${error.message}` });
    } finally {
        setIsRefreshing(false);
    }
  }, [groupId, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchOrdersAndData();
  }, [groupId, user, authLoading, router, fetchOrdersAndData]);

  const handleUpdateStatus = async (order: Order) => {
    let nextStatus: OrderStatus | undefined = NEXT_STATUS[order.status];
    if (!nextStatus && order.status === 'Out for Delivery') {
        nextStatus = 'Pending Delivery Confirmation';
    } else if (!nextStatus && order.status === 'Picked Up') {
        nextStatus = 'Pending Return Confirmation';
    } else if (order.returnType === 'replacement' && order.status === 'Out for Delivery') {
        nextStatus = 'Pending Replacement Confirmation';
    }
    
    if (!nextStatus) return;

    try {
       // Fetch the latest document before updating
      const orderDocRef = doc(db, 'orders', order.id);
      const latestDoc = await getDoc(orderDocRef);
      if (!latestDoc.exists()) {
        throw new Error("Order no longer exists.");
      }
      const latestOrderData = latestDoc.data() as Order;

      if (latestOrderData.status !== order.status) {
        toast({
          variant: "destructive",
          title: "Status Conflict",
          description: `Order status was already changed to "${latestOrderData.status}". Refreshing data.`,
        });
        fetchOrdersAndData(); // Refresh the entire group
        return;
      }

      await updateOrderStatus(order.id, nextStatus);
      toast({ title: 'Status Updated', description: `Order is now: ${nextStatus}` });
      fetchOrdersAndData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleMarkFeeAsPaid = async () => {
    if (typeof groupId !== 'string') return;
    setIsUpdatingFee(true);
    try {
        await markDeliveryFeeAsPaid(groupId);
        toast({ title: "Success", description: "Delivery fee marked as paid."});
        fetchOrdersAndData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `Failed to update fee status: ${error.message}`});
    } finally {
        setIsUpdatingFee(false);
    }
  };
  
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Copied to Clipboard",
      description: `Customer ID: ${id}`,
    });
  };


  const getOptionName = (type: 'paperType' | 'colorOption' | 'formatType' | 'printRatio' | 'bindingType' | 'laminationType', id: string): string => {
      if (!id || id === 'none') return 'N/A';
      if (type === 'paperType') return paperTypes.find(o => o.id === id)?.name || id;
      if (type === 'bindingType') return bindingTypes.find(o => o.id === id)?.name || id;
      if (type === 'laminationType') return laminationTypes.find(o => o.id === id)?.name || id;
      if (type === 'colorOption') return HARDCODED_XEROX_OPTIONS.colorOptions.find(o => o.id === id)?.name || id;
      if (type === 'formatType') return HARDCODED_XEROX_OPTIONS.formatTypes.find(o => o.id === id)?.name || id;
      if (type === 'printRatio') return HARDCODED_XEROX_OPTIONS.printRatios.find(o => o.id === id)?.name || id;
      return id;
  };

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-32 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const firstOrder = orders[0];
  const ordersBySeller = orders.reduce((acc, order) => {
      if (!acc[order.sellerId]) {
          acc[order.sellerId] = [];
      }
      acc[order.sellerId].push(order);
      return acc;
  }, {} as Record<string, Order[]>);
  
  const totalDeliveryFee = orders.reduce((sum, order) => sum + order.deliveryCharge, 0);
  const isDeliveryFeePaid = orders.length > 0 && orders.every(o => o.isDeliveryFeePaid);


  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" onClick={() => router.push('/employee-dashboard')} className="mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      {firstOrder && customer && (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Customer & Delivery Details</CardTitle>
                <CardDescription>
                    Order Group ID: {groupId}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-bold">Customer ID</TableCell>
                            <TableCell className="font-bold flex items-center gap-1">
                              {customer.shortId}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyId(customer.shortId)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">Customer</TableCell>
                            <TableCell className="font-bold">{customer.name} ({customer.email})</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell className="font-bold">Mobile</TableCell>
                            <TableCell className="font-bold">{firstOrder.mobile}</TableCell>
                        </TableRow>
                        {firstOrder.altMobiles && firstOrder.altMobiles.length > 0 && (
                             <TableRow>
                                <TableCell className="font-bold align-top">Alt. Mobiles</TableCell>
                                <TableCell className="font-bold">
                                    {firstOrder.altMobiles.map(m => m.value).join(', ')}
                                </TableCell>
                            </TableRow>
                        )}
                        <TableRow>
                            <TableCell className="font-bold align-top">Address</TableCell>
                            <TableCell className="font-bold">
                                <p>{firstOrder.shippingAddress.line1}</p>
                                {firstOrder.shippingAddress.line2 && <p>{firstOrder.shippingAddress.line2}</p>}
                                <p>{firstOrder.shippingAddress.city}, {firstOrder.shippingAddress.state} - {firstOrder.shippingAddress.postalCode}</p>
                            </TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell className="font-bold">Ordered On</TableCell>
                            <TableCell className="font-bold">{format(firstOrder.createdAt.toDate(), 'PPP p')}</TableCell>
                        </TableRow>
                        {totalDeliveryFee > 0 && (
                            <TableRow>
                                <TableCell className="font-bold align-top">Delivery Fee</TableCell>
                                <TableCell className="font-bold">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p>Rs {totalDeliveryFee.toFixed(2)}</p>
                                        </div>
                                        {isDeliveryFeePaid ? (
                                            <Badge variant="secondary" className="text-green-600 flex items-center gap-2">
                                                <BadgeCheck className="h-4 w-4" /> Paid
                                            </Badge>
                                        ) : (
                                            <Button onClick={handleMarkFeeAsPaid} disabled={isUpdatingFee} size="sm">
                                                <DollarSign className="mr-2 h-4 w-4" />
                                                {isUpdatingFee ? "Updating..." : "Mark as Paid"}
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  <Link href={`/employee/invoice/${groupId}`}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Invoice
                  </Link>
              </Button>
            </CardFooter>
        </Card>
      )}

      <div className="space-y-6">
        {Object.entries(ordersBySeller).map(([sellerId, sellerOrders]) => {
            const shop = shops.find(s => s.id === sellerId);
            return (
                <Card key={sellerId}>
                    <CardHeader className="bg-muted/50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                           <Store className="h-5 w-5" /> {shop?.name || 'Unknown Shop'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        {sellerOrders.map(order => {
                          const isXerox = order.category === 'xerox';
                          const xeroxConfig = order.xeroxConfig;
                          const isDriveFile = order.productImage && order.productImage.includes('drive.google.com');

                          
                          let StatusIcon = Truck;
                          if (order.returnType === 'replacement') StatusIcon = Repeat;
                          if (order.status.includes('Delivered') || order.status.includes('Completed')) StatusIcon = CheckCircle;

                          const canUpdate = 
                            (NEXT_STATUS[order.status] || order.status === 'Out for Delivery' || order.status === 'Picked Up') &&
                            !['Pending Confirmation', 'Return Requested'].includes(order.status);

                          const getNextStatusLabel = () => {
                            if (order.status === 'Out for Delivery') return 'Request Delivery Confirmation';
                            if (order.status === 'Picked Up') return 'Request Return Confirmation';
                            return `Update to: ${NEXT_STATUS[order.status]}`;
                          };

                           let xeroxDetails: { label: string; value: string | number }[] = [];
                           if (isXerox && xeroxConfig) {
                               xeroxDetails = [
                                   { label: 'Paper', value: getOptionName('paperType', xeroxConfig.paperType) },
                                   { label: 'Color', value: getOptionName('colorOption', xeroxConfig.colorOption) },
                                   { label: 'Format', value: getOptionName('formatType', xeroxConfig.formatType) },
                                   { label: 'Pages', value: xeroxConfig.pageCount },
                                   { label: 'Ratio', value: getOptionName('printRatio', xeroxConfig.printRatio) },
                                   { label: 'Binding', value: getOptionName('bindingType', xeroxConfig.bindingType) },
                                   { label: 'Lamination', value: getOptionName('laminationType', xeroxConfig.laminationType) },
                                   { label: 'Instructions', value: xeroxConfig.message },
                               ].filter(d => d.value && d.value !== 'N/A');
                           }

                          return (
                            <div key={order.id} className="border rounded-lg p-4 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                  <div className="truncate flex items-center gap-2 font-semibold">
                                    <span className="truncate">{order.productName}</span>
                                  </div>
                                  <Badge variant={order.status.includes('Cancelled') || order.status.includes('Rejected') ? 'destructive' : 'secondary'} className="flex-shrink-0 mt-2 sm:mt-0">
                                    {order.status}
                                  </Badge>
                                </div>
                                <div className="flex items-start gap-4">
                                  <div className="relative h-24 w-24 flex-shrink-0 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                                    {isDriveFile ? (
                                      <FileText className="h-12 w-12 text-blue-500" />
                                    ) : order.productImage ? (
                                      <Image src={order.productImage} alt={order.productName} fill className="object-cover" />
                                    ) : (
                                      <Package className="h-12 w-12 text-muted-foreground" />
                                    )}
                                  </div>
                                   <Table>
                                      <TableBody>
                                        <TableRow className="border-0">
                                          <TableCell className="p-1 font-medium text-muted-foreground w-20">Quantity:</TableCell>
                                          <TableCell className="p-1">{order.quantity}</TableCell>
                                        </TableRow>
                                        <TableRow className="border-0">
                                          <TableCell className="p-1 font-medium text-muted-foreground w-20">Price/Item:</TableCell>
                                          <TableCell className="p-1">Rs {order.price.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow className="border-t">
                                          <TableCell className="p-1 font-bold">Total:</TableCell>
                                          <TableCell className="p-1 font-bold">Rs {(order.price * order.quantity).toFixed(2)}</TableCell>
                                        </TableRow>
                                      </TableBody>
                                   </Table>
                                </div>
                                {isXerox && xeroxDetails.length > 0 && (
                                    <Card className="bg-muted/50">
                                        <CardHeader className="p-2 pb-0">
                                            <CardTitle className="text-sm">Print Configuration</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-2">
                                            <Table>
                                                <TableBody>
                                                {xeroxDetails.map(detail => (
                                                    <TableRow key={detail.label} className="border-0">
                                                        <TableCell className="p-1 text-xs text-muted-foreground w-28">{detail.label}</TableCell>
                                                        <TableCell className="p-1 text-xs font-medium">{detail.value}</TableCell>
                                                    </TableRow>
                                                ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                )}
                                <OrderTracker trackingInfo={order.tracking} status={order.status} orderType={order.returnType} />
                                <div className="pt-4 border-t flex flex-col sm:flex-row gap-2">
                                    {canUpdate && (
                                      <Button className="w-full" onClick={() => handleUpdateStatus(order)}>
                                        <StatusIcon className="mr-2 h-4 w-4" />
                                        {getNextStatusLabel()}
                                      </Button>
                                    )}
                                     <Button onClick={handleRefresh} disabled={isRefreshing} className="w-full bg-green-600 hover:bg-green-700">
                                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                                    </Button>
                                </div>
                            </div>
                          );
                        })}
                    </CardContent>
                </Card>
            );
        })}
      </div>
    </div>
  );
}

    