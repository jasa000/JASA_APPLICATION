
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { markNotificationAsRead, getMyOrders, updateOrderStatus } from "@/lib/data";
import type { Notification, Order } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Phone, Package, Inbox, Truck, AlertCircle, Info, CheckCircle, Hand, ArrowRight, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Image from "next/image";
import { useNotifications } from "@/context/notification-provider";

const NotificationCard = ({ notification, onMarkAsRead }: { notification: Notification; onMarkAsRead: (notificationId: string) => void }) => {
    
  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id); // Update UI optimistically
    }
  };

  return (
    <Card 
      onClick={handleMarkAsRead}
      className={cn(
        "transition-colors cursor-pointer relative overflow-hidden group"
      )}
    >
      <div className="flex items-start gap-4 p-4">
        <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 z-10",
            "bg-primary/10"
        )}>
          <Package className={cn("h-6 w-6", "text-primary")} />
        </div>
        <div className="flex-grow z-10">
          <CardTitle className="text-base font-semibold leading-tight">{notification.title}</CardTitle>
          <CardDescription className="text-sm mt-1">{notification.message}</CardDescription>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
          </p>
        </div>
      </div>
      <CardFooter className="px-4 pb-2 pt-0">
         <div className="flex w-full items-center justify-end text-xs text-foreground/70">
          <span className="mr-1">Tap to mark as read</span>
        </div>
      </CardFooter>
    </Card>
  );
};

const ConfirmationCard = ({ order, notification, onConfirm, onMarkAsRead }: { order: Order; notification?: Notification; onConfirm: (order: Order) => void; onMarkAsRead: (notificationId: string) => void; }) => {
    const isConfirmed = !['Pending Delivery Confirmation', 'Pending Return Confirmation', 'Pending Replacement Confirmation'].includes(order.status);
    
    const handleCardClick = () => {
        if (isConfirmed && notification) {
            onMarkAsRead(notification.id);
        }
    };

    return (
        <Card onClick={handleCardClick} className={cn(isConfirmed && 'cursor-pointer hover:bg-muted/50')}>
            <CardHeader className="pb-4">
                <CardTitle className="text-base">{order.productName}</CardTitle>
                <CardDescription>Order ID: {order.id}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                 <div className="relative h-16 w-16 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                    {order.productImage ? (
                      <Image src={order.productImage} alt={order.productName} fill className="object-cover" />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground m-auto" />
                    )}
                 </div>
                <Alert variant={isConfirmed ? "default" : "destructive"}>
                    {isConfirmed ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Hand className="h-4 w-4" />}
                    <AlertTitle>{isConfirmed ? "Confirmation Complete" : "Action Required"}</AlertTitle>
                    <AlertDescription>
                      {isConfirmed ? `This item has been marked as '${order.status}'. Tap to dismiss.` : "Please confirm that you have successfully received this item."}
                    </AlertDescription>
                </Alert>
            </CardContent>
            {!isConfirmed && (
                <CardFooter>
                    <Button className="w-full" onClick={(e) => { e.stopPropagation(); onConfirm(order); }}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirm Completion
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
};


export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const { notifications: globalNotifications, unreadCount, isLoading: isLoadingNotifications, fetchNotifications, decreaseUnreadCount } = useNotifications();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLocalNotifications(globalNotifications);
  }, [globalNotifications]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
        return;
      }
      setIsLoadingOrders(true);
      getMyOrders(user.uid).then(fetchedOrders => {
        setOrders(fetchedOrders);
      }).catch(error => {
        toast({ variant: "destructive", title: "Error", description: "Failed to load orders." });
      }).finally(() => {
        setIsLoadingOrders(false);
      });
    }
  }, [user, authLoading, router, toast]);
  
  const handleMarkAsRead = useCallback((notificationId: string) => {
    if (!user) return;
    
    // Optimistically update the UI by removing the notification from the local list
    setLocalNotifications(prev => prev.filter(n => n.id !== notificationId));
    decreaseUnreadCount();

    // Then, make the async call to update the backend
    markNotificationAsRead(user.uid, notificationId).catch(error => {
      toast({ variant: "destructive", title: "Error", description: "Could not sync read status." });
      fetchNotifications();
    });
  }, [user, toast, fetchNotifications, decreaseUnreadCount]);

  const { deliveryUpdates, statusUpdates, confirmationOrders, actionRequiredCount, actionRequiredNotifications } = useMemo(() => {
    const unread = localNotifications.filter(n => !n.isRead);
    
    const requiredNotifications = unread.filter(n => n.title.includes('Action Required'));
    const nonActionNotifications = unread.filter(n => !n.title.includes('Action Required'));
    
    const deliveryKeywords = ["Shipped", "Out for Delivery", "Delivered", "Out for Pickup", "Picked Up"];
    const deliveryUpdates = nonActionNotifications.filter(n => deliveryKeywords.some(keyword => n.message.includes(keyword)));
    const statusUpdates = nonActionNotifications.filter(n => !deliveryKeywords.some(keyword => n.message.includes(keyword)));
    
    const confOrders = orders.filter(o => 
        ['Pending Delivery Confirmation', 'Pending Return Confirmation', 'Pending Replacement Confirmation'].includes(o.status) || 
        requiredNotifications.some(n => n.orderId === o.id)
    );

    return { 
      deliveryUpdates, 
      statusUpdates, 
      confirmationOrders: confOrders, 
      actionRequiredCount: confOrders.filter(o => !['Delivered', 'Return Completed', 'Replacement Completed'].includes(o.status)).length,
      actionRequiredNotifications: requiredNotifications,
    };
  }, [localNotifications, orders]);
  
  const handleConfirmFinalStatus = async () => {
    if (!confirmingOrder || !user) return;
    setIsSubmitting(true);
    
    let finalStatus: Order['status'] | null = null;
    if (confirmingOrder.status === 'Pending Delivery Confirmation') finalStatus = 'Delivered';
    else if (confirmingOrder.status === 'Pending Return Confirmation') finalStatus = 'Return Completed';
    else if (confirmingOrder.status === 'Pending Replacement Confirmation') finalStatus = 'Replacement Completed';
    
    if (!finalStatus) {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid confirmation status.' });
        setIsSubmitting(false);
        return;
    }

    try {
        await updateOrderStatus(confirmingOrder.id, finalStatus);
        
        toast({ title: 'Confirmation Successful', description: `Order for "${confirmingOrder.productName}" is now marked as ${finalStatus}.` });
        
        // Find the related notification and mark it as read
        const relatedNotification = actionRequiredNotifications.find(n => n.orderId === confirmingOrder.id);
        if (relatedNotification) {
            handleMarkAsRead(relatedNotification.id);
        }

        // Re-fetch only orders to update their status for the confirmation tab
        await getMyOrders(user.uid).then(setOrders); 
        
    } catch (error: any) {
        toast({ variant: "destructive", title: "Confirmation Failed", description: error.message });
    } finally {
        setIsSubmitting(false);
        setConfirmingOrder(null);
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if(user) {
        await Promise.all([
          fetchNotifications(),
          getMyOrders(user.uid).then(setOrders)
        ]);
    }
    setIsRefreshing(false);
    toast({ title: "Refreshed", description: "Notifications and orders are up to date." });
  };

  const renderNotificationList = (list: Notification[], emptyMessage: string) => {
    if (list.length > 0) {
      return (
        <div className="space-y-4">
          {list.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} onMarkAsRead={handleMarkAsRead} />
          ))}
        </div>
      );
    }
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <Inbox className="h-16 w-16 text-muted-foreground" />
        <CardTitle className="mt-4">No new updates</CardTitle>
        <CardDescription className="mt-2">{emptyMessage}</CardDescription>
      </Card>
    );
  };
  
  const renderConfirmationList = () => {
      if (confirmationOrders.length === 0) {
          return (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
                <CheckCircle className="h-16 w-16 text-muted-foreground" />
                <CardTitle className="mt-4">All Clear!</CardTitle>
                <CardDescription className="mt-2">You have no items awaiting your confirmation.</CardDescription>
            </Card>
          )
      }
      return (
          <div className="space-y-4">
              {confirmationOrders.map(order => {
                  const notification = actionRequiredNotifications.find(n => n.orderId === order.id);
                  return (
                    <ConfirmationCard 
                        key={order.id} 
                        order={order} 
                        notification={notification}
                        onConfirm={setConfirmingOrder}
                        onMarkAsRead={handleMarkAsRead}
                    />
                  )
              })}
          </div>
      );
  }

  if (isLoadingNotifications || authLoading || isLoadingOrders) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Notifications</h1>
        <p className="mt-2 text-muted-foreground">Checking for new updates...</p>
        <div className="mt-8 space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={!!confirmingOrder} onOpenChange={(open) => { if (!open) setConfirmingOrder(null) }}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Final Status</AlertDialogTitle>
                <AlertDialogDescription>
                    Please confirm that your order for "{confirmingOrder?.productName}" has been successfully completed.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Not Yet</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmFinalStatus} disabled={isSubmitting}>
                    {isSubmitting ? 'Confirming...' : 'Yes, Confirm'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Notifications</h1>
          <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <Badge>{unreadCount} New</Badge>
          </div>
        </div>
        <p className="mt-2 text-muted-foreground">Here are your latest updates.</p>
        
        <Tabs defaultValue="confirmations" className="mt-8">
            <div className="sticky top-20 z-20 bg-background py-2 flex items-center gap-2">
                <TabsList className="grid w-full grid-cols-3 bg-blue-600 p-1 h-auto rounded-md">
                    <TabsTrigger value="confirmations" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white flex-col h-auto py-1 px-1 text-xs sm:text-sm whitespace-normal">
                        <CheckCircle className="h-4 w-4" />
                        <span>Confirmations ({actionRequiredCount})</span>
                    </TabsTrigger>
                    <TabsTrigger value="updates" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white flex-col h-auto py-1 px-1 text-xs sm:text-sm whitespace-normal">
                      <Truck className="h-4 w-4" />
                      <span>Order Updates ({deliveryUpdates.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="status" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white flex-col h-auto py-1 px-1 text-xs sm:text-sm whitespace-normal">
                       <AlertCircle className="h-4 w-4" />
                      <span>General Status ({statusUpdates.length})</span>
                    </TabsTrigger>
                </TabsList>
                 <Button onClick={handleRefresh} disabled={isRefreshing} size="icon" variant="outline" className="flex-shrink-0">
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                 </Button>
            </div>
            
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Tap a notification to mark it as read and remove it from the list.
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <TabsContent value="confirmations" className="mt-4">
              {renderConfirmationList()}
            </TabsContent>
            <TabsContent value="updates" className="mt-4">
              {renderNotificationList(deliveryUpdates, "No delivery updates at the moment.")}
            </TabsContent>
            <TabsContent value="status" className="mt-4">
              {renderNotificationList(statusUpdates, "No general status updates right now.")}
            </TabsContent>
          </div>
        </Tabs>

      </div>
    </>
  );
}
