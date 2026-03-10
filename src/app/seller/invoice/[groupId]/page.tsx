
"use client";

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { getOrdersByGroupId } from '@/lib/data';
import { getAllUsers } from '@/lib/users';
import { getShopById } from '@/lib/shops';
import type { Order, UserProfile, Shop } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Printer, Download, User, Phone, MapPin, Building, Mail, Eye, ArrowLeft, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import Link from 'next/link';

export default function InvoicePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const groupId = params.groupId as string;
    const shopId = searchParams.get('shopId');

    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [customer, setCustomer] = useState<UserProfile | null>(null);
    const [shop, setShop] = useState<Shop | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    
    useEffect(() => {
        const fetchDetails = async () => {
            if (!groupId || !shopId) {
                toast({ variant: 'destructive', title: 'Error', description: 'Missing order or shop information.' });
                return;
            }
            setIsLoading(true);
            try {
                const [fetchedOrders, allUsers, fetchedShop] = await Promise.all([
                    getOrdersByGroupId(groupId),
                    getAllUsers(),
                    getShopById(shopId),
                ]);
                
                const shopOrders = fetchedOrders.filter(o => 
                    o.sellerId === shopId && // Make sure order belongs to the shop
                    o.status !== 'Rejected' && 
                    o.status !== 'Cancelled'
                );
                
                setOrders(shopOrders);
                setShop(fetchedShop);

                if (shopOrders.length > 0) {
                    const orderUser = allUsers.find(u => u.uid === shopOrders[0]?.userId);
                    setCustomer(orderUser || null);
                    setSelectedItems(shopOrders.map(o => o.id));
                }

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, [groupId, shopId, toast]);

    const handlePrint = () => {
        window.print();
    };
    
    const invoiceItems = useMemo(() => {
        return orders.filter(o => selectedItems.includes(o.id));
    }, [orders, selectedItems]);
    
    const totals = useMemo(() => {
        const itemsToTotal = invoiceItems;
        const subtotal = itemsToTotal.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const totalDelivery = itemsToTotal.reduce((acc, item) => acc + item.deliveryCharge, 0);
        return {
            subtotal,
            totalDelivery,
            grandTotal: subtotal + totalDelivery,
        };
    }, [invoiceItems]);
    
    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }
    
    if (!orders.length || !customer || !shop) {
        return <div className="container mx-auto p-8 text-center">No order details found for this shop.</div>;
    }
    
    const { shippingAddress } = orders[0];

    const InvoiceContent = ({ isPreview = false }: { isPreview?: boolean }) => {
        const itemsToRender = isPreview ? invoiceItems : orders;

        return (
            <div className="bg-white p-6 text-xs text-black" id="invoice-content">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                     <div>
                        <div className="flex items-center gap-1 text-gray-800">
                            <span className="font-headline text-xl font-bold">JASA</span>
                            <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-gray-800">
                          <span>E</span><span>S</span><span>S</span><span>E</span><span>N</span><span>T</span><span>I</span><span>A</span><span className="font-bold">L</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold uppercase text-gray-400">Invoice</h2>
                        <p className="text-gray-500"><strong>#:</strong> {groupId.substring(0, 8)}</p>
                        <p className="text-gray-500"><strong>Date:</strong> {format(new Date(), 'PPP')}</p>
                    </div>
                </div>
                 
                 <div className="mb-4">
                     <h3 className="font-bold border-b pb-1 mb-1 text-gray-700">SOLD BY</h3>
                     <p className="font-semibold text-sm">{shop.name}</p>
                     <p>{shop.address}</p>
                     <p>{shop.mobileNumbers?.join(', ')}</p>
                 </div>
                
                {/* Bill To */}
                <div className="mb-4 text-xs">
                    <h3 className="font-bold border-b pb-1 mb-1 text-gray-700">BILL TO</h3>
                    <p className="font-semibold text-sm">{customer.name}</p>
                    <p>{shippingAddress.line1}{shippingAddress.line2 && `, ${shippingAddress.line2}`}</p>
                    <p>{shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postalCode}</p>
                    <p>{customer.email}</p>
                    <p>{orders[0].mobile}</p>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                    <Table className="w-full text-xs">
                        <TableHeader>
                            <TableRow className="bg-gray-100">
                                {!isPreview && <TableHead className="w-8 no-print p-1"><Checkbox 
                                    checked={selectedItems.length === orders.length && orders.length > 0}
                                    onCheckedChange={(checked) => setSelectedItems(checked ? orders.map(o => o.id) : [])}
                                /></TableHead>}
                                <TableHead className="p-1">Item</TableHead>
                                <TableHead className="text-center p-1">Qty</TableHead>
                                <TableHead className="text-right p-1">Price</TableHead>
                                <TableHead className="text-right p-1">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {itemsToRender.map(order => (
                                <TableRow key={order.id} className="[&>td]:p-1">
                                    {!isPreview && <TableCell className="no-print">
                                        <Checkbox
                                            checked={selectedItems.includes(order.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedItems(prev => checked ? [...prev, order.id] : prev.filter(id => id !== order.id));
                                            }}
                                        />
                                    </TableCell>}
                                    <TableCell className="font-medium">{order.productName}</TableCell>
                                    <TableCell className="text-center">{order.quantity}</TableCell>
                                    <TableCell className="text-right">Rs {order.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">Rs {(order.price * order.quantity).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mt-4">
                    <div className="w-full max-w-xs text-xs">
                        <div className="flex justify-between py-1">
                            <span className="font-semibold">Subtotal:</span>
                            <span>Rs {totals.subtotal.toFixed(2)}</span>
                        </div>
                        {totals.totalDelivery > 0 && (
                            <div className="flex justify-between py-1">
                                <span className="font-semibold">Delivery:</span>
                                <span>Rs {totals.totalDelivery.toFixed(2)}</span>
                            </div>
                        )}
                        <Separator className="my-1 bg-gray-300" />
                        <div className="flex justify-between py-1 font-bold text-sm">
                            <span>Grand Total:</span>
                            <span>Rs {totals.grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-500 mt-6 text-xs">
                    <p>Thank you for your Shopping!</p>
                </div>
            </div>
        );
    };

    return (
        <div id="invoice-page-container" className="bg-gray-100 dark:bg-gray-900 min-h-screen">
            <div className="container mx-auto p-4 md:p-8">
                
                 <Button asChild className="mb-4 no-print bg-blue-600 text-white hover:bg-blue-700">
                   <Link href={`/seller/orders/${shopId}/${groupId}`}>
                       <ArrowLeft className="mr-2 h-4 w-4" />
                       Back to Order Details
                   </Link>
                </Button>
                
                <InvoiceContent />

                <div className="mt-8 flex justify-end gap-2 no-print">
                    <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="outline">
                                <Eye className="mr-2 h-4 w-4" /> Preview
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Invoice Preview</DialogTitle>
                            </DialogHeader>
                            <div className="flex-grow overflow-auto p-4 bg-gray-200 dark:bg-gray-800 rounded-md">
                               <div className="mx-auto w-fit">
                                   <div className="bg-white shadow-lg A4-page">
                                      <InvoiceContent isPreview={true} />
                                   </div>
                               </div>
                            </div>
                             <DialogFooter>
                                <DialogClose asChild>
                                    <Button>Close</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </div>
            </div>
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact;
                    }
                    #invoice-page-container {
                        background-color: white !important;
                    }
                    .no-print, header, [data-sidebar='sidebar-wrapper'] {
                        display: none !important;
                    }
                    #invoice-content {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0;
                        padding: 0;
                    }
                    @page {
                        size: A4;
                        margin: 0;
                    }
                }
                .A4-page {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 1cm;
                    margin: 0 auto;
                    border: 1px #D1D5DB solid;
                    background-color: white;
                    color: black;
                    box-shadow: 0 0 0.5cm rgba(0,0,0,0.5);
                }
                @media screen and (max-width: 900px) {
                    .A4-page {
                        width: 100%;
                        height: auto;
                        min-height: 0;
                        padding: 1rem;
                        margin: 0;
                        border: none;
                        box-shadow: none;
                    }
                }
            `}</style>
        </div>
    );
}
