
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
import { Check, X, User, Package, FileText, Phone, Truck, MapPin, ArrowLeft, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import OrderTracker from '@/components/order-tracker';
import { Badge } from '@/components/ui/badge';
import { HARDCODED_XEROX_OPTIONS } from '@/lib/xerox-options';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

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

  useEffect(() => {
    if (!authLoading && user) {
      fetchOrderGroupDetails();
    }
  }, [authLoading, user, fetchOrderGroupDetails]);
  
  const handleConfirmOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'Processing');
      toast({ title: 'Order Confirmed', description: 'The order is now being processed.' });
      fetchOrderGroupDetails();
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
      setRejectingOrder(null);
      setRejectionReason("");
      fetchOrderGroupDetails();
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
        setRejectingReturn(null);
        setRejectionReason("");
        fetchOrderGroupDetails();
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
      await updateOrderStatus(order.id, nextStatus);
      toast({ title: 'Status Updated', description: `Order is now: ${nextStatus}` });
      fetchOrderGroupDetails();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleApproveReturn = async (orderId: string) => {
    try {
      await approveOrderReturn(orderId);
      toast({ title: 'Return Approved', description: 'The return request has been approved.' });
      fetchOrderGroupDetails();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };
  
  const handleApproveReplacement = async (orderId: string) => {
    try {
      await approveReplacement(orderId);
      toast({ title: 'Replacement Confirmed', description: 'The replacement has been confirmed and is now processing.' });
      fetchOrderGroupDetails();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
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
        <Button variant="outline" onClick={() => router.push(`/seller/orders/${shopId}`)} className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Orders
        </Button>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Customer & Delivery Details</CardTitle>
            <CardDescription>Order Group ID: {groupId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center gap-2"><User /> <strong>{customer.name}</strong> ({customer.email})</div>
              <div className="flex items-center gap-2"><Phone /> {firstOrder.mobile}</div>
              <div className="flex items-start gap-2"><MapPin className="mt-1 flex-shrink-0" /> 
                <div>
                    <p className="font-semibold">{firstOrder.shippingAddress.type} Address</p>
                    <p>{firstOrder.shippingAddress.line1}{firstOrder.shippingAddress.line2 ? `, ${firstOrder.shippingAddress.line2}` : ''}, {firstOrder.shippingAddress.city} - {firstOrder.shippingAddress.postalCode}</p>
                </div>
              </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {orders.map(order => {
              const isXerox = order.category === 'xerox';
              const xeroxConfig = order.xeroxConfig;
              let details: { label: string; value: string | number }[] = [];
              if (isXerox && xeroxConfig) {
                  details = [
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
                    
                    {isXerox && (order.productImage ? (<Button variant="outline" asChild><a href={order.productImage} target="_blank" rel="noopener noreferrer"><LinkIcon className="mr-2 h-4 w-4"/> View Document</a></Button>) : (<Badge variant="destructive">Document not uploaded by user.</Badge>))}
                    
                    {isXerox && details.length > 0 && (
                        <Card className="bg-muted/50">
                            <CardContent className="p-2">
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
                 {canUpdate && (
                    <CardFooter>
                        <Button className="w-full" onClick={() => handleUpdateStatus(order)} disabled={isEmployeeOnly && order.status === 'Processing'}>
                            {getNextStatusLabel()}
                        </Button>
                    </CardFooter>
                 )}
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
