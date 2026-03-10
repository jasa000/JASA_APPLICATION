

"use client";

import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/context/auth-provider';
import { updateUserProfile } from '@/lib/users';
import { getShops } from '@/lib/shops';
import { getOrderSettings, createOrder } from '@/lib/data';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Store, Info, MapPin, ArrowLeft, Loader2, CheckCircle, Pencil, FileText, Trash2 } from 'lucide-react';
import type { UserProfile, Shop, OrderSettings, Product, ShopService, CartItem, XeroxDocument, Address, DeliveryChargeRule } from '@/lib/types';

const generateShortId = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


const addressSchema = z.object({
  type: z.enum(['Home', 'Work']),
  line1: z.string().min(1, "Address Line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal Code is required"),
});

const mobileSchema = z.object({
    mobile: z.string().regex(/^\d{10}$/, "A valid 10-digit mobile number is required."),
    altMobiles: z.array(z.object({ value: z.string().regex(/^\d{10}$/, "Must be a 10-digit number.") })).min(1, "At least one alternate mobile number is required."),
});

type CategoryKey = 'stationary' | 'books' | 'electronics' | 'xerox';

const getDeliveryCharge = (rules: DeliveryChargeRule[], subtotal: number): { charge: number; nextTierInfo: string | null } => {
    if (rules.length === 0) return { charge: 0, nextTierInfo: null };
    const sortedRules = [...rules].sort((a, b) => a.from - b.from);
    for (const rule of sortedRules) {
        const to = rule.to ?? Infinity;
        if (subtotal >= rule.from && subtotal <= to) {
            let nextTierInfo: string | null = null;
            const nextRule = sortedRules.find(r => r.from > subtotal && r.charge < rule.charge);
            if (nextRule) {
                const amountNeeded = nextRule.from - subtotal;
                if(nextRule.charge === 0) {
                     nextTierInfo = `Add items worth Rs ${amountNeeded.toFixed(2)} more for FREE delivery.`;
                } else {
                    nextTierInfo = `Add items worth Rs ${amountNeeded.toFixed(2)} more for a delivery charge of Rs ${nextRule.charge.toFixed(2)}.`;
                }
            }
            return { charge: rule.charge, nextTierInfo };
        }
    }
    return { charge: 0, nextTierInfo: null };
};

export default function CheckoutPage() {
  const { selectedItems, items, removeItem } = useCart();
  const { user, loading: authLoading, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [orderSettings, setOrderSettings] = useState<OrderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderItemCount, setOrderItemCount] = useState(0);

  const addressSectionRef = useRef<HTMLDivElement>(null);
  const mobileSectionRef = useRef<HTMLDivElement>(null);
  const sellerSectionRef = useRef<HTMLDivElement>(null);

  const cartItems = useMemo(() => items.filter(item => selectedItems.includes(item.id)), [items, selectedItems]);
  
  const itemsByCategory = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const category: CategoryKey = item.type;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<CategoryKey, CartItem[]>);
  }, [cartItems]);
  
  const presentCategories = Object.keys(itemsByCategory) as CategoryKey[];

  const checkoutFormSchema = z.object({
    selectedAddress: z.string().min(1, "Please select a shipping address."),
    ...Object.fromEntries(
      presentCategories.map(cat => [cat, z.string().min(1, `Please select a seller for ${cat}.`)])
    )
  });
  

  const checkoutForm = useForm<z.infer<typeof checkoutFormSchema>>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      selectedAddress: "",
      ...Object.fromEntries(presentCategories.map(cat => [cat, ""]))
    },
  });
  
  const mobileForm = useForm<z.infer<typeof mobileSchema>>({
    resolver: zodResolver(mobileSchema),
    defaultValues: {
        mobile: user?.mobile || '',
        altMobiles: user?.altMobiles?.length ? user.altMobiles.map(alt => ({ value: alt.value || '' })) : [{ value: ''}],
    }
  });
  
  const { fields: altMobilesFields, append: appendAltMobile, remove: removeAltMobile } = useFieldArray({
    control: mobileForm.control,
    name: "altMobiles",
  });

  const addressForm = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: { type: 'Home', line1: '', line2: '', city: '', state: '', postalCode: '' }
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) {
        if (user.addresses && user.addresses.length > 0 && !checkoutForm.getValues('selectedAddress')) {
            checkoutForm.setValue('selectedAddress', `address-0`);
        }
        mobileForm.reset({
            mobile: user.mobile || '',
            altMobiles: user.altMobiles?.length ? user.altMobiles.map(alt => ({ value: alt.value || '' })) : [{ value: '' }],
        });
    }
    
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [shops, settings] = await Promise.all([getShops(), getOrderSettings()]);
            setAllShops(shops);
            setOrderSettings(settings);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch checkout data." });
        } finally {
            setLoading(false);
        }
    };
    fetchInitialData();
  }, [user, authLoading, router, checkoutForm, toast, mobileForm]);


  const { total, itemsSubtotal, xeroxSubtotal, deliveryFee, savings, xeroxDeliveryFee, nextItemTierInfo, nextXeroxTierInfo } = useMemo(() => {
    if (!orderSettings) return { total: 0, itemsSubtotal: 0, xeroxSubtotal: 0, deliveryFee: 0, savings: 0, xeroxDeliveryFee: 0, nextItemTierInfo: null, nextXeroxTierInfo: null };

    const productItems = cartItems.filter(item => item.type !== 'xerox') as (CartItem & {type: 'stationary' | 'books' | 'electronics', product: Product})[];
    const xeroxItems = cartItems.filter(item => item.type === 'xerox') as (CartItem & {type: 'xerox', xerox: XeroxDocument})[];

    const itemsSubtotal = productItems.reduce((acc, item) => acc + (item.product.discountPrice || item.product.price) * item.quantity, 0);
    const originalItemsTotal = productItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const savings = originalItemsTotal - itemsSubtotal;
    
    let itemDeliveryResult = { charge: 0, nextTierInfo: null };
    if (productItems.length > 0) {
        itemDeliveryResult = getDeliveryCharge(orderSettings.itemDeliveryRules, itemsSubtotal);
    }
    
    const xeroxSubtotal = xeroxItems.reduce((acc, item) => acc + item.price, 0);
    let xeroxDeliveryResult = { charge: 0, nextTierInfo: null };
    if (xeroxItems.length > 0) {
        xeroxDeliveryResult = getDeliveryCharge(orderSettings.xeroxDeliveryRules, xeroxSubtotal);
    }
    
    const total = itemsSubtotal + itemDeliveryResult.charge + xeroxSubtotal + xeroxDeliveryResult.charge;

    return { total, itemsSubtotal, xeroxSubtotal, deliveryFee: itemDeliveryResult.charge, savings, xeroxDeliveryFee: xeroxDeliveryResult.charge, nextItemTierInfo: itemDeliveryResult.nextTierInfo, nextXeroxTierInfo: xeroxDeliveryResult.nextTierInfo };
  }, [cartItems, orderSettings]);

  async function onAddressSubmit(values: z.infer<typeof addressSchema>) {
    if (!user) return;
    try {
      const newAddresses = [...(user.addresses || []), values];
      await updateUserProfile(user.uid, { addresses: newAddresses });
      await refreshUserProfile();
      toast({ title: "Address Saved", description: "Your new address has been added." });
      addressForm.reset({ type: 'Home', line1: '', line2: '', city: '', state: '', postalCode: '' });
      setIsAddingAddress(false);
    } catch (error: any) {
       toast({ variant: "destructive", title: "Error", description: "Failed to save address. " + error.message });
    }
  }
  
  async function handlePlaceOrder() {
    const checkoutValues = checkoutForm.getValues();
    const mobileData = mobileForm.getValues();
    if (!user || !user.addresses || !orderSettings) return;

    setIsPlacingOrder(true);
    await updateUserProfile(user.uid, { mobile: mobileData.mobile, altMobiles: mobileData.altMobiles?.filter(m => m.value) });
    
    const addressIndex = parseInt(checkoutValues.selectedAddress.replace('address-', ''));
    const shippingAddress = user.addresses[addressIndex];
    
    const groupId = generateShortId(7);
    let orderCreationPromises: Promise<any>[] = [];

    const productItemsByCategory = cartItems.filter(item => item.type !== 'xerox').reduce((acc, item) => {
        const category: CategoryKey = item.type;
        if (!acc[category]) acc[category] = [];
        acc[category].push(item as (CartItem & {type: 'stationary' | 'books' | 'electronics', product: Product}));
        return acc;
    }, {} as Record<CategoryKey, (CartItem & {type: 'stationary' | 'books' | 'electronics', product: Product})[]>);

    for (const category of Object.keys(productItemsByCategory) as CategoryKey[]) {
        if(category !== 'xerox') {
            const sellerId = checkoutValues[category as keyof typeof checkoutValues];
            const itemsToOrder = productItemsByCategory[category];
            const categorySubtotal = itemsToOrder.reduce((sum, item) => sum + (item.product.discountPrice || item.product.price) * item.quantity, 0);
            const categoryDeliveryCharge = getDeliveryCharge(orderSettings.itemDeliveryRules, categorySubtotal).charge;
            
            for (const cartItem of itemsToOrder) {
                orderCreationPromises.push(
                    createOrder({
                        groupId,
                        userId: user.uid,
                        productId: cartItem.product.id,
                        productName: cartItem.product.name,
                        productImage: cartItem.product.imageNames?.[0] || null,
                        quantity: cartItem.quantity,
                        price: cartItem.product.discountPrice ?? cartItem.product.price,
                        deliveryCharge: categoryDeliveryCharge / itemsToOrder.length, // Distribute charge
                        sellerId: sellerId,
                        shippingAddress: shippingAddress,
                        mobile: mobileData.mobile,
                        altMobiles: mobileData.altMobiles?.filter(m => m.value),
                        status: 'Pending Confirmation',
                        category: cartItem.type,
                    })
                );
            }
        }
    }
    
    const xeroxItems = cartItems.filter(item => item.type === 'xerox') as (CartItem & {type: 'xerox', xerox: XeroxDocument})[];
    const xeroxSellerId = checkoutValues['xerox' as keyof typeof checkoutValues];
    for (const xeroxItem of xeroxItems) {
      if (xeroxItem.xerox.file) {
        orderCreationPromises.push((async () => {
          const fd = new FormData();
          fd.append("file", xeroxItem.xerox.file!);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok || !data.url) throw new Error(data.error || `Upload failed for ${xeroxItem.xerox.file!.name}`);
          
          return createOrder({
            groupId, userId: user.uid, productName: xeroxItem.xerox.file!.name, productImage: data.url,
            quantity: xeroxItem.quantity, price: xeroxItem.price, deliveryCharge: xeroxDeliveryFee / xeroxItems.length, sellerId: xeroxSellerId,
            shippingAddress: shippingAddress, mobile: mobileData.mobile, altMobiles: mobileData.altMobiles?.filter(m => m.value),
            status: 'Pending Confirmation', category: 'xerox', xeroxConfig: xeroxItem.xerox.config,
          });
        })());
      }
    }

    try {
      await Promise.all(orderCreationPromises);
      setOrderItemCount(cartItems.length);
      cartItems.forEach(item => removeItem(item.id));
      setOrderPlaced(true);
      setTimeout(() => { router.push('/orders'); }, 2000);
    } catch (error: any) {
        toast({ variant: "destructive", title: 'Order Failed', description: `An error occurred while placing your order: ${error.message}` });
    } finally {
        setIsPlacingOrder(false);
    }
  }

  async function onCheckoutSubmit() {
    const [isCheckoutFormValid, isMobileFormValid] = await Promise.all([
      checkoutForm.trigger(),
      mobileForm.trigger(),
    ]);

    if (!isCheckoutFormValid || !isMobileFormValid) {
        const errors = { ...checkoutForm.formState.errors, ...mobileForm.formState.errors };
        let message = "Please fill out all required fields before placing your order.";

        if (errors.selectedAddress) {
            addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (errors.mobile || errors.altMobiles) {
            mobileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if(errors.altMobiles?.root?.message) {
                message = errors.altMobiles.root.message;
            }
        } else if (presentCategories.some(cat => errors[cat])) {
            sellerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        toast({
          variant: "destructive",
          title: "Incomplete Form",
          description: message,
        });
        return;
    }
    
    await handlePlaceOrder();
  }
  
  if (authLoading || loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }

  if (cartItems.length === 0 && !orderPlaced) {
    return (
       <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="font-headline text-3xl font-bold">You have no items selected for checkout.</h1>
        <p className="mt-2 text-muted-foreground">Please select items from your cart to proceed.</p>
        <Button asChild className="mt-6">
          <Link href="/cart">Return to Cart</Link>
        </Button>
      </div>
    )
  }
  
  const selectedAddress = checkoutForm.watch('selectedAddress');

  const renderAddressSelection = () => (
    <div ref={addressSectionRef}>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">1. Select Shipping Address</CardTitle>
        </CardHeader>
        <CardContent>
          {(!user?.addresses || user.addresses.length === 0) && !isAddingAddress ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You have no saved addresses. Please add one to continue.</p>
                <Button onClick={() => setIsAddingAddress(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Address</Button>
              </div>
          ) : (
              <>
              {!isAddingAddress && user?.addresses && (
                <FormField
                  control={checkoutForm.control}
                  name="selectedAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {user.addresses.map((address, index) => (
                            <FormItem key={index} className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl><RadioGroupItem value={`address-${index}`} className="mt-1" /></FormControl>
                                <FormLabel className="font-normal w-full">
                                    <p className="font-bold text-base">{address.type} Address</p>
                                    <p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
                                    <p>{address.city}, {address.state} - {address.postalCode}</p>
                                </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {!isAddingAddress && (
                  <Button variant="outline" onClick={() => setIsAddingAddress(true)} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Add Another Address</Button>
              )}
              </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderMobileSection = () => {
    if (!selectedAddress) return null;
  
    return (
      <div ref={mobileSectionRef}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">2. Contact Information</CardTitle>
            <CardDescription>
              Confirm your mobile number for delivery updates. At least one alternate number is required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...mobileForm}>
              <div className="space-y-4">
                <FormField
                  control={mobileForm.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Mobile Number</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="10-digit mobile number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {altMobilesFields.map((field, index) => (
                   <FormField
                      key={field.id}
                      control={mobileForm.control}
                      name={`altMobiles.${index}.value`}
                      render={({ field: f }) => (
                      <FormItem className="flex items-center gap-2">
                          <FormControl><Input {...f} value={f.value || ''} type="tel" placeholder={`Alt. Mobile ${index + 1}`} /></FormControl>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeAltMobile(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                           <FormMessage />
                      </FormItem>
                      )}
                  />
                ))}
                {altMobilesFields.length < 2 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => appendAltMobile({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Alternate</Button>
                )}
                 <FormField control={mobileForm.control} name="altMobiles" render={() => (
                    <FormMessage>{mobileForm.formState.errors.altMobiles?.root?.message}</FormMessage>
                 )} />
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderSellerSelection = (category: CategoryKey) => {
    if (!selectedAddress) return null;

    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    
    const availableShops = allShops.filter(shop => shop.services.includes(category as ShopService));

    if (availableShops.length === 0) {
        return <p className="text-muted-foreground">Sorry, no sellers provide services for {categoryName}. Please adjust your cart.</p>
    }

    return (
        <FormField
          control={checkoutForm.control}
          name={category}
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="font-bold text-lg">{categoryName}</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableShops.map((shop) => (
                    <FormItem key={shop.id} className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><RadioGroupItem value={shop.id} className="mt-1" /></FormControl>
                        <FormLabel className="font-normal w-full">
                            <p className="font-bold flex items-center gap-2"><Store className="h-4 w-4" /> {shop.name}</p>
                            <p className="text-sm text-muted-foreground">{shop.address}</p>
                            {shop.notes && <p className="text-sm mt-2 pt-2 border-t">{shop.notes}</p>}
                             {shop.locations && shop.locations.length > 0 && (
                                <div className="text-sm mt-2 pt-2 border-t">
                                    <p className="font-medium flex items-center gap-1"><MapPin className="h-4 w-4" /> Available in:</p>
                                    <ul className="list-disc pl-5 text-muted-foreground">
                                        {shop.locations.map((loc, i) => <li key={i}>{loc}</li>)}
                                    </ul>
                                </div>
                            )}
                        </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
    )
  }

  const renderAddressForm = () => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="font-headline">Add a New Address</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-4">
                <FormField control={addressForm.control} name="type" render={({ field }) => (<FormItem><FormLabel>Address Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select address type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Home">Home</SelectItem><SelectItem value="Work">Work</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={addressForm.control} name="line1" render={({ field }) => (<FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} placeholder="123 Main St" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={addressForm.control} name="line2" render={({ field }) => (<FormItem><FormLabel>Address Line 2 (Optional)</FormLabel><FormControl><Input {...field} placeholder="Apartment, suite, etc." /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField control={addressForm.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={addressForm.control} name="state" render={({ field }) => (<FormItem><FormLabel>State / Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={addressForm.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={() => setIsAddingAddress(false)}>Cancel</Button>
                  <Button type="submit" disabled={addressForm.formState.isSubmitting}>{addressForm.formState.isSubmitting ? "Saving..." : "Save Address"}</Button>
                </div>
            </form>
        </Form>
      </CardContent>
    </Card>
  )

  return (
    <>
    <Dialog open={orderPlaced}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="sr-only">Order Confirmation</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold">Order Placed Successfully!</h2>
                <p className="text-muted-foreground mt-2">
                    Your order for {orderItemCount} item(s) has been placed. You will be redirected to your order history shortly.
                </p>
            </div>
        </DialogContent>
    </Dialog>

    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Checkout</h1>
        <Button variant="outline" asChild>
          <Link href="/cart">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Link>
        </Button>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Form {...checkoutForm}>
            {renderAddressSelection()}
            {isAddingAddress && renderAddressForm()}
            {renderMobileSection()}
            {selectedAddress && (
                <div ref={sellerSectionRef}>
                  <Card>
                      <CardHeader><CardTitle className="font-headline">3. Select Sellers</CardTitle><CardDescription>Choose a seller for each category of items in your cart.</CardDescription></CardHeader>
                      <CardContent className="space-y-6">
                          {presentCategories.map(cat => (
                              <div key={cat}>
                                  {renderSellerSelection(cat)}
                              </div>
                          ))}
                      </CardContent>
                  </Card>
                </div>
            )}
          </Form>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader><CardTitle className="font-headline">Your Order</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {presentCategories.map((category) => (
                    <div key={category}>
                        <h4 className="font-medium capitalize mb-2">{category}</h4>
                        {itemsByCategory[category]?.map((item) => {
                          if (item.type === 'xerox') {
                            const xerox = item.xerox;
                            return (
                              <div key={item.id} className="flex items-center justify-between text-sm ml-2">
                                <div className="flex gap-2 min-w-0">
                                  <div className="relative h-12 w-12 flex-shrink-0 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{xerox?.file?.name || 'Printing Job'}</p>
                                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                  </div>
                                </div>
                                <p className="flex-shrink-0 pl-2">Rs {item.price.toFixed(2)}</p>
                              </div>
                            )
                          } else {
                            const product = item.product;
                            return (
                               <div key={product?.id} className="flex items-center justify-between text-sm ml-2">
                                <div className="flex gap-2 min-w-0">
                                   <div className="relative h-12 w-12 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                                      {product?.imageNames?.[0] ? (<Image src={product.imageNames[0]} alt={product.name} fill className="object-cover" />) : (<div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">JASA</div>)}
                                   </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{product?.name}</p>
                                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                    </div>
                                </div>
                                <p className="flex-shrink-0 pl-2">Rs {((product?.discountPrice || product?.price || 0) * item.quantity).toFixed(2)}</p>
                              </div>
                            )
                          }
                        })}
                    </div>
                ))}
                <Separator />
                 <div className="space-y-2 text-sm">
                    {itemsSubtotal > 0 && <div className="flex justify-between"><span>Items Subtotal</span><span>Rs {itemsSubtotal.toFixed(2)}</span></div>}
                    {xeroxSubtotal > 0 && <div className="flex justify-between"><span>Printing Subtotal</span><span>Rs {xeroxSubtotal.toFixed(2)}</span></div>}
                    {deliveryFee > 0 && <div className="flex justify-between text-destructive"><span>Item Delivery</span><span>Rs {deliveryFee.toFixed(2)}</span></div>}
                    {xeroxDeliveryFee > 0 && <div className="flex justify-between text-destructive"><span>Printing Delivery</span><span>Rs {xeroxDeliveryFee.toFixed(2)}</span></div>}
                    {savings > 0 && <div className="flex justify-between text-green-600"><span>You Save on Items</span><span>Rs {savings.toFixed(2)}</span></div>}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg"><span>Total</span><span>Rs {total.toFixed(2)}</span></div>
                </div>
                 {nextItemTierInfo && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Save on Delivery!</AlertTitle>
                    <AlertDescription>
                        {nextItemTierInfo}
                    </AlertDescription>
                  </Alert>
                )}
                {nextXeroxTierInfo && (
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Save on Printing Delivery!</AlertTitle>
                    <AlertDescription>
                       {nextXeroxTierInfo}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter>
                <Button onClick={onCheckoutSubmit} className="w-full">
                    {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isPlacingOrder ? "Placing Order..." : "Place Order"}
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
}
