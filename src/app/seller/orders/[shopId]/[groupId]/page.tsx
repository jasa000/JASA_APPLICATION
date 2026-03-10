
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { useState, useEffect, useCallback } from 'react';
import { getOrdersByGroupId, updateOrderStatus, approveOrderReturn, rejectOrderReturn, approveReplacement, getXeroxOptions } from '@/lib/data';
import { getAllUsers } from '@/lib/users';
import type { Order, UserProfile, OrderStatus, XeroxOption } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, User, Package, FileText, Phone, Truck, MapPin, ArrowLeft, Link as LinkIcon, RefreshCw, Download, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import OrderTracker from '@/components/order-tracker';
import { Badge } from '@/components/ui/badge';
import { HARDCODED_XEROX_OPTIONS } from '@/lib/xerox-options';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import Link from 'next/link';
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

export default function SellerOrderGroupPage() {
  const params = useParams();
  const shopId = params.shopId as string;
  const groupId = params.groupId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectingReturn, setRejectingReturn] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [paperTypes, setPaperTypes] = useState<XeroxOption[]>([]);
  const [bindingTypes, setBindingTypes] = useState<XeroxOption[]>([]);
  const [laminationTypes, setLaminationTypes] = useState<XeroxOption[]>([]);

  const isEmployeeOnly = user?.roles.includes('employee') && !user.roles.includes('seller');

  const fetchOrderGroupDetails = useCallback(async () => {
    if (!groupId || !shopId) return;
    setIsLoading(true);
    try {
      const [fetchedOrders, allUsers, fetchedPaperTypes, fetchedBindingTypes, fetchedLaminationTypes] = await Promise.all([
        getOrdersByGroupId(groupId),
        getAllUsers(),
        getXeroxOptions('paperType'),
        getXeroxOptions('bindingType'),
        getXeroxOptions('laminationType'),
      ]);

      const shopOrders = fetchedOrders.filter(o => o.sellerId === shopId);

      if (shopOrders.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'This order group does not belong to this shop.' });
        router.push(`/seller/orders/${shopId}`);
        return;
      }
      
      setOrders(shopOrders);
      setPaperTypes(fetchedPaperTypes);
      setBindingTypes(fetchedBindingTypes);
      setLaminationTypes(fetchedLaminationTypes);
      
      const orderUser = allUsers.find(u => u.uid === shopOrders[0].userId);
      setCustomer(orderUser || null);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [groupId, shopId, router, toast]);
  
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
    if (!authLoading && user) {
      fetchOrderGroupDetails();
    }
  }, [authLoading, user, fetchOrderGroupDetails]);
  
  const handleConfirmOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'Processing');
      toast({ title: 'Order Confirmed', description: 'The order is now being processed.' });
      
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, status: 'Processing'} : o));

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleRejectOrder = async () => {
    if (!rejectingOrder || !rejectionReason.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'A reason for rejection is required.' });
        return;
    }
    try {
      await updateOrderStatus(rejectingOrder.id, 'Rejected', rejectionReason);
      toast({ title: 'Order Rejected', description: 'The customer has been notified.' });
      const rejectedOrderId = rejectingOrder.id;
      setRejectingOrder(null);
      setRejectionReason("");
      setOrders(prevOrders => prevOrders.map(o => o.id === rejectedOrderId ? {...o, status: 'Rejected', rejectionReason} : o));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleRejectReturn = async () => {
    if (!rejectingReturn || !rejectionReason.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'A reason for rejection is required.' });
        return;
    }
    try {
        await rejectOrderReturn(rejectingReturn.id, rejectionReason);
        toast({ title: 'Return Rejected', description: 'The customer has been notified.' });
        const rejectedReturnId = rejectingReturn.id;
        setRejectingReturn(null);
        setRejectionReason("");
        setOrders(prevOrders => prevOrders.map(o => o.id === rejectedReturnId ? {...o, status: 'Return Rejected', rejectionReason} : o));

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

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
        fetchOrderGroupDetails(); // Refresh the entire group
        return;
      }

      await updateOrderStatus(order.id, nextStatus);
      toast({ title: 'Status Updated', description: `Order is now: ${nextStatus}` });
      const finalNextStatus = nextStatus;
      setOrders(prevOrders => prevOrders.map(o => o.id === order.id ? {...o, status: finalNextStatus} : o));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleApproveReturn = async (orderId: string) => {
    try {
      await approveOrderReturn(orderId);
      toast({ title: 'Return Approved', description: 'The return request has been approved.' });
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, status: 'Return Approved'} : o));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleApproveReplacement = async (orderId: string) => {
    try {
      await approveReplacement(orderId);
      toast({ title: 'Replacement Confirmed', description: 'The replacement has been confirmed and is now processing.' });
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, status: 'Replacement Confirmed'} : o));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
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
  
  const getOptionPrice = (type: 'bindingType' | 'laminationType', id: string): number => {
    if (type === 'bindingType') return bindingTypes.find(o => o.id === id)?.price || 0;
    if (type === 'laminationType') return laminationTypes.find(o => o.id === id)?.price || 0;
    return 0;
  };
  
  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-40 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const firstOrder = orders[0];
  if (!firstOrder || !customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Order not found.</p>
      </div>
    );
  }

  return (
    <>
      <Dialog open={!!rejectingOrder} onOpenChange={(open) => {if (!open) setRejectingOrder(null)}}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reject Order: {rejectingOrder?.productName}</DialogTitle>
                <DialogDescription>Please provide a reason for rejecting this order. This will be shown to the customer.</DialogDescription>
            </DialogHeader>
            <div className="py-4"><Textarea placeholder="e.g., Item is out of stock..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} /></div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setRejectingOrder(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRejectOrder}>Confirm Rejection</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingReturn} onOpenChange={(open) => { if (!open) setRejectingReturn(null) }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reject Return: {rejectingReturn?.productName}</DialogTitle>
                <DialogDescription>Please provide a reason for rejecting this return request. This will be shown to the customer.</DialogDescription>
            </DialogHeader>
            <div className="py-4"><Textarea placeholder="e.g., Item was damaged by customer..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} /></div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setRejectingReturn(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRejectReturn}>Confirm Rejection</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => router.push(`/seller/orders/${shopId}`)} className="mb-8 bg-blue-600 text-white hover:bg-blue-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Orders
        </Button>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Customer & Delivery Details</CardTitle>
            <CardDescription>Order Group ID: {groupId}</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-bold">Customer ID</TableCell>
                        <TableCell className="font-bold flex items-center gap-1">
                          {customer.shortId}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyId(customer.shortId)}>
                            <Copy className="h-4 w-4" />
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
                </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                <Link href={`/seller/invoice/${groupId}?shopId=${shopId}`}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Invoice
                </Link>
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          {orders.map(order => {
              const isXerox = order.category === 'xerox';
              const xeroxConfig = order.xeroxConfig;
              let details: { label: string; value: string | number }[] = [];
              let bindingCost = 0;
              let laminationCost = 0;

              if (isXerox && xeroxConfig) {
                  bindingCost = getOptionPrice('bindingType', xeroxConfig.bindingType);
                  laminationCost = getOptionPrice('laminationType', xeroxConfig.laminationType);
                  details = [
                     { label: 'Paper', value: getOptionName('paperType', xeroxConfig.paperType) },
                     { label: 'Color', value: getOptionName('colorOption', xeroxConfig.colorOption) },
                     { label: 'Format', value: getOptionName('formatType', xeroxConfig.formatType) },
                     { label: 'Pages', value: xeroxConfig.pageCount },
                     { label: 'Ratio', value: getOptionName('printRatio', xeroxConfig.printRatio) },
                     { label: 'Binding', value: getOptionName('bindingType', xeroxConfig.bindingType) },
                     { label: 'Lamination', value: getOptionName('laminationType', xeroxConfig.laminationType) },
                  ].filter(d => d.value && d.value !== 'N/A');
              }
              const canUpdate = (NEXT_STATUS[order.status] || order.status === 'Out for Delivery' || order.status === 'Picked Up') && !['Pending Confirmation', 'Return Requested'].includes(order.status);
              const getNextStatusLabel = () => {
                if (order.status === 'Out for Delivery') return 'Request Delivery Confirmation';
                if (order.status === 'Picked Up') return 'Request Return Confirmation';
                return `Update to: ${NEXT_STATUS[order.status]}`;
              };

            return (
              <Card key={order.id}>
                 <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <CardTitle className="truncate flex items-center gap-2">
                            {order.returnType === 'replacement' && <RefreshCw className="h-5 w-5 text-primary" />}
                            {order.productName}
                        </CardTitle>
                        <CardDescription>Order ID: {order.id}</CardDescription>
                      </div>
                      <Badge variant={order.status.includes('Rejected') || order.status.includes('Cancelled') ? 'destructive' : 'default'} className="flex-shrink-0 text-center justify-center min-w-[120px]">
                        {order.status === 'Return Requested' ? (order.returnType === 'replacement' ? 'Replacement Requested' : 'Return Requested') : order.status}
                      </Badge>
                    </div>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <div className="relative h-20 w-20 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                        {order.productImage ? (<Image src={order.productImage} alt={order.productName} fill className="object-cover" />) : (isXerox ? <FileText className="h-10 w-10 text-muted-foreground m-auto" /> : <Package className="h-10 w-10 text-muted-foreground m-auto" />)}
                      </div>
                      <div>
                        <p><strong>Quantity:</strong> {order.quantity}</p>
                        <p><strong>Price/Item:</strong> Rs {order.price.toFixed(2)}</p>
                        <p><strong>Total:</strong> Rs {(order.price * order.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    {isXerox && (order.productImage ? (<Button asChild className="w-full sm:w-auto bg-purple-600 text-white hover:bg-purple-700"><a href={order.productImage} target="_blank" rel="noopener noreferrer"><LinkIcon className="mr-2 h-4 w-4"/> View Uploaded Document</a></Button>) : (<Badge variant="destructive">Document not uploaded by user.</Badge>))}
                    
                    {isXerox && (
                      <Card className="bg-muted/50">
                        <CardContent className="p-2">
                            {details.length > 0 && (
                                <div className="mb-2">
                                    <h4 className="font-semibold text-sm mb-1">Configuration</h4>
                                    <Table>
                                      <TableBody>
                                        {details.map(d => (
                                            <TableRow key={d.label} className="border-0">
                                                <TableCell className="p-1 text-xs text-muted-foreground">{d.label}</TableCell>
                                                <TableCell className="p-1 text-xs font-medium">{d.value}</TableCell>
                                            </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                </div>
                            )}

                            {order.xeroxConfig?.message && (
                                <div className="mt-2 pt-2 border-t">
                                    <h4 className="font-semibold text-sm mb-1">Instructions</h4>
                                    <p className="text-xs p-2 bg-background rounded-md">{order.xeroxConfig.message}</p>
                                </div>
                            )}
                             <div className="mt-2 pt-2 border-t">
                               <h4 className="font-semibold text-sm mb-1">Price Estimation</h4>
                               <Table>
                                  <TableBody>
                                    {bindingCost > 0 && (
                                      <TableRow className="border-0">
                                        <TableCell className="p-1 text-xs text-muted-foreground">Binding Cost</TableCell>
                                        <TableCell className="p-1 text-xs font-medium text-right">Rs {bindingCost.toFixed(2)}</TableCell>
                                      </TableRow>
                                    )}
                                    {laminationCost > 0 && (
                                      <TableRow className="border-0">
                                        <TableCell className="p-1 text-xs text-muted-foreground">Lamination Cost</TableCell>
                                        <TableCell className="p-1 text-xs font-medium text-right">Rs {laminationCost.toFixed(2)}</TableCell>
                                      </TableRow>
                                    )}
                                     <TableRow className="border-0">
                                        <TableCell className="p-1 text-xs text-muted-foreground">Printing Cost</TableCell>
                                        <TableCell className="p-1 text-xs font-medium text-right">Rs {(order.price - bindingCost - laminationCost).toFixed(2)}</TableCell>
                                      </TableRow>
                                    <TableRow className="border-t">
                                        <TableCell className="p-1 font-bold text-sm">Total per Item</TableCell>
                                        <TableCell className="p-1 font-bold text-sm text-right">Rs {order.price.toFixed(2)}</TableCell>
                                      </TableRow>
                                  </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {order.status === 'Pending Confirmation' && !isEmployeeOnly && (
                      <div className="flex gap-2 justify-end">
                        <Button onClick={() => handleConfirmOrder(order.id)}><Check className="mr-2 h-4 w-4"/> Confirm</Button>
                        <Button variant="destructive" onClick={() => setRejectingOrder(order)}><X className="mr-2 h-4 w-4"/> Reject</Button>
                      </div>
                    )}

                    {order.status === 'Return Requested' && (
                        <div className="space-y-2 pt-2 border-t">
                            <h4 className="font-semibold">Request: {order.returnType === 'replacement' ? 'Replacement' : 'Return'}</h4>
                            <p className="text-sm text-muted-foreground p-2 border rounded-md">{order.returnReason}</p>
                            {!isEmployeeOnly && (<div className="flex gap-2 justify-end">
                                {order.returnType === 'replacement' ? (<Button size="sm" variant="outline" onClick={() => handleApproveReplacement(order.id)}>Approve Replacement</Button>) : (<Button size="sm" variant="outline" onClick={() => handleApproveReturn(order.id)}>Approve Return</Button>)}
                                <Button size="sm" variant="destructive" onClick={() => setRejectingReturn(order)}>Reject Request</Button>
                            </div>)}
                        </div>
                    )}
                    
                    <OrderTracker trackingInfo={order.tracking} status={order.status} orderType={order.returnType} />
                 </CardContent>
                 <CardFooter className="flex-col items-stretch gap-2">
                    <Button onClick={handleRefresh} disabled={isRefreshing} className="w-full bg-green-600 hover:bg-green-700">
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                     {canUpdate && (
                        <Button className="w-full" onClick={() => handleUpdateStatus(order)} disabled={isEmployeeOnly && order.status === 'Processing'}>
                            {getNextStatusLabel()}
                        </Button>
                     )}
                 </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}

    