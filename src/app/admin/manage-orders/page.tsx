"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { getAllOrders, deleteOrdersBulk } from "@/lib/data";
import { getShops } from "@/lib/shops";
import { getAllUsers } from "@/lib/users";
import type { Order, Shop, UserProfile, OrderStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, RefreshCw, Filter, Search, CheckCircle, XCircle, AlertTriangle, Calendar, Info, Clock, Eraser, Trash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ManageAllOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Selection
  const [selectedOrderIds, setSelectedSelectedOrderIds] = useState<string[]>([]);
  
  // Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedShops, fetchedUsers] = await Promise.all([
        getAllOrders(),
        getShops(),
        getAllUsers(),
      ]);
      setOrders(fetchedOrders);
      setShops(fetchedShops);
      setUsers(fetchedUsers);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to fetch orders: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
  }, [user, authLoading, router, toast, fetchData]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.groupId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const handleDeleteSelected = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsDeleting(true);
    try {
      await deleteOrdersBulk(selectedOrderIds);
      toast({
        title: "Orders Deleted",
        description: `${selectedOrderIds.length} order(s) have been permanently removed.`,
      });
      setSelectedSelectedOrderIds([]);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const cleanupOrders = async (type: 'delivered' | 'cancelled', days: number) => {
    const ordersToDelete = orders.filter(order => {
      const isCorrectStatus = type === 'delivered' 
        ? (order.status === 'Delivered' || order.status === 'Return Completed' || order.status === 'Replacement Completed')
        : (order.status === 'Cancelled' || order.status === 'Rejected' || order.status === 'Return Rejected');
      
      if (!isCorrectStatus) return false;
      
      const orderDate = order.createdAt.toDate();
      return differenceInDays(new Date(), orderDate) >= days;
    });

    if (ordersToDelete.length === 0) {
      toast({
        title: "Nothing to Clean Up",
        description: `No ${type} orders older than ${days} days found.`,
      });
      return;
    }

    const ids = ordersToDelete.map(o => o.id);
    setIsDeleting(true);
    try {
      await deleteOrdersBulk(ids);
      toast({
        title: "Cleanup Successful",
        description: `Removed ${ids.length} ${type} orders.`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Cleanup Failed",
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedSelectedOrderIds([]);
    } else {
      setSelectedSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "Pending Confirmation": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "Processing": return <Badge variant="outline" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case "Delivered": case "Replacement Completed": case "Return Completed": return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case "Cancelled": case "Rejected": case "Return Rejected": return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-4 w-full mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-8 pb-40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
            Order Maintenance
          </h1>
          <p className="mt-2 text-muted-foreground">
            View all orders and manage Firestore storage by deleting old completed records.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="flex-shrink-0">
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Maintenance Controls */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" /> Cleanup Delivered
            </CardTitle>
          </CardHeader>
          <CardFooter className="p-4 pt-0 gap-2">
            <Button size="sm" variant="outline" className="flex-1 bg-white" onClick={() => cleanupOrders('delivered', 3)}>
              &gt; 3 Days
            </Button>
            <Button size="sm" variant="outline" className="flex-1 bg-white" onClick={() => cleanupOrders('delivered', 7)}>
              &gt; 7 Days
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" /> Cleanup Cancelled
            </CardTitle>
          </CardHeader>
          <CardFooter className="p-4 pt-0 gap-2">
            <Button size="sm" variant="outline" className="flex-1 bg-white" onClick={() => cleanupOrders('cancelled', 3)}>
              &gt; 3 Days
            </Button>
            <Button size="sm" variant="outline" className="flex-1 bg-white" onClick={() => cleanupOrders('cancelled', 7)}>
              &gt; 7 Days
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <Clock className="h-4 w-4" /> Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">Total Orders in DB</p>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <Info className="h-4 w-4" /> Selected
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{selectedOrderIds.length}</div>
            <p className="text-xs text-muted-foreground">Items marked for deletion</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Order Explorer</CardTitle>
              <CardDescription>Search and filter through all application orders.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ID or Product..."
                  className="pl-8 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending Confirmation">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedOrderIds.length > 0 && selectedOrderIds.length === filteredOrders.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order Details</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total (Rs)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No orders found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const shop = shops.find(s => s.id === order.sellerId);
                    const customer = users.find(u => u.uid === order.userId);
                    return (
                      <TableRow key={order.id} className={cn(selectedOrderIds.includes(order.id) && "bg-muted/50")}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrderIds.includes(order.id)}
                            onCheckedChange={(checked) => {
                              setSelectedSelectedOrderIds(prev =>
                                checked
                                  ? [...prev, order.id]
                                  : prev.filter(id => id !== order.id)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm truncate max-w-[200px]">{order.productName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">#{order.id} | Group: {order.groupId.substring(0, 8)}...</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {format(order.createdAt.toDate(), 'PPP p')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{customer?.name || 'N/A'}</span>
                            <span className="text-[10px] text-muted-foreground">{order.mobile}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="font-bold">
                          {(order.price * order.quantity + order.deliveryCharge).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/shops/${order.sellerId}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Delete Footer */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-background/90 p-4 backdrop-blur-sm border-t lg:left-[var(--sidebar-width)] transition-[left] duration-200">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="font-semibold">{selectedOrderIds.length} order(s) selected</p>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSelectedOrderIds([])}>
                Deselect All
              </Button>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to permanently delete {selectedOrderIds.length} orders from the database. This action is irreversible and will affect sales reports.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? "Deleting..." : "Confirm Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
