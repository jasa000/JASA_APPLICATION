
"use client"

import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Pencil, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Address, UserProfile } from "@/lib/types";
import { updateUserProfile } from "@/lib/users";
import { Label } from "@/components/ui/label";


const addressSchema = z.object({
  type: z.enum(['Home', 'Work']),
  line1: z.string().min(1, "Address Line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal Code is required"),
});

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  mobile: z.string().optional(),
  altMobiles: z.array(z.object({ value: z.string() })).optional(),
  addresses: z.array(addressSchema).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, loading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddressDialogOpen, setIsAddAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<{ address: Address, index: number } | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      altMobiles: [],
      addresses: [],
    },
  });

  const addressForm = useForm<Address>({
    resolver: zodResolver(addressSchema),
    defaultValues: { type: 'Home', line1: '', line2: '', city: '', state: '', postalCode: '' }
  });

  const { fields: altMobiles, append: appendAltMobile, remove: removeAltMobile } = useFieldArray({
    control: form.control,
    name: "altMobiles",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      form.reset({
        name: user.displayName || user.name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        altMobiles: user.altMobiles || [],
        addresses: user.addresses || [],
      });
    }
  }, [user, loading, router, form]);

  useEffect(() => {
    if (editingAddress) {
      addressForm.reset({
        ...editingAddress.address,
        line2: editingAddress.address.line2 || '',
      });
    } else {
      addressForm.reset({ type: 'Home', line1: '', line2: '', city: '', state: '', postalCode: '' });
    }
  }, [editingAddress, addressForm]);

  async function onProfileSubmit(values: ProfileFormData) {
    if (!user) return;
    try {
      const { addresses, ...profileData } = values;
      await updateUserProfile(user.uid, profileData);
      await refreshUserProfile();
      toast({
        title: "Profile Updated",
        description: "Your personal information has been saved.",
      });
      setIsEditingProfile(false);
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. " + error.message,
      });
    }
  }

  async function onAddressSubmit(values: Address) {
    if (!user) return;
    const currentAddresses = form.getValues('addresses') || [];
    let newAddresses: Address[];

    if (editingAddress !== null) {
      newAddresses = [...currentAddresses];
      newAddresses[editingAddress.index] = values;
    } else {
      newAddresses = [...currentAddresses, values];
    }
    
    try {
      await updateUserProfile(user.uid, { addresses: newAddresses });
      await refreshUserProfile();
      toast({ title: editingAddress ? "Address Updated" : "Address Added" });
      setIsAddAddressDialogOpen(false);
      setEditingAddress(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `Failed to save address: ${error.message}` });
    }
  }

  async function handleRemoveAddress(indexToRemove: number) {
    if (!user) return;
    const currentAddresses = form.getValues('addresses') || [];
    const newAddresses = currentAddresses.filter((_, index) => index !== indexToRemove);
    try {
      await updateUserProfile(user.uid, { addresses: newAddresses });
      await refreshUserProfile();
      toast({ title: "Address Removed" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `Failed to remove address: ${error.message}` });
    }
  }
  
  if (loading || !user) {
    return (
        <div className="container mx-auto px-4 py-8">
            <Skeleton className="mb-8 h-12 w-48" />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Skeleton className="h-24 w-24 rounded-full" />
                            <Skeleton className="mt-4 h-6 w-32" />
                            <Skeleton className="mt-2 h-4 w-48" />
                        </CardHeader>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-8 w-40" />
                            <Skeleton className="mt-2 h-4 w-64" />
                        </CardHeader>
                        <CardContent>
                           <div className="space-y-6">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                           </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
  }

  const getInitials = (name?: string | null) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const renderAddressForm = () => (
    <Form {...addressForm}>
      <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-4">
        <FormField control={addressForm.control} name="type" render={({ field }) => (
          <FormItem><FormLabel>Address Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select address type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Home">Home</SelectItem><SelectItem value="Work">Work</SelectItem></SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={addressForm.control} name="line1" render={({ field }) => (
          <FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} placeholder="123 Main St" /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={addressForm.control} name="line2" render={({ field }) => (
          <FormItem><FormLabel>Address Line 2 (Optional)</FormLabel><FormControl><Input {...field} placeholder="Apartment, suite, etc." /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField control={addressForm.control} name="city" render={({ field }) => (
            <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={addressForm.control} name="state" render={({ field }) => (
            <FormItem><FormLabel>State / Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={addressForm.control} name="postalCode" render={({ field }) => (
            <FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" disabled={addressForm.formState.isSubmitting}>{addressForm.formState.isSubmitting ? "Saving..." : "Save Address"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <>
      <Dialog open={isAddressDialogOpen} onOpenChange={(open) => {
        setIsAddAddressDialogOpen(open);
        if (!open) setEditingAddress(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          {renderAddressForm()}
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">My Profile</h1>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-1 space-y-8">
            <Card>
              <CardHeader className="items-center text-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                  <AvatarFallback>{getInitials(user.displayName || user.name)}</AvatarFallback>
                </Avatar>
                <CardTitle className="font-headline pt-4">{user.displayName || user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="md:col-span-2 space-y-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline">Personal & Contact Info</CardTitle>
                  <CardDescription>Update your personal information.</CardDescription>
                </div>
                {!isEditingProfile && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                    <Pencil className="mr-2 h-4 w-4"/> Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEditingProfile ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-6">
                      <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Primary Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input placeholder="e.g., 9876543210" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <div>
                        <Label>Alternative Mobile Numbers</Label>
                        {altMobiles.map((field, index) => (
                          <FormField key={field.id} control={form.control} name={`altMobiles.${index}.value`} render={({ field }) => (<FormItem className="mt-2 flex items-center gap-2"><FormControl><Input {...field} placeholder={`Alt. Mobile ${index + 1}`} /></FormControl><Button type="button" variant="ghost" size="icon" onClick={() => removeAltMobile(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button><FormMessage /></FormItem>)} />
                        ))}
                        {altMobiles.length < 2 && (<Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendAltMobile({ value: "" })}><PlusCircle className="mr-2 h-4 w-4" /> Add Mobile</Button>)}
                      </div>
                      <div className="flex justify-end gap-2">
                          <Button type="button" variant="secondary" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                          <Button type="submit">Save Changes</Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                      <div className="grid grid-cols-[120px_1fr] items-center"><Label>Full Name</Label><p className="text-muted-foreground">{user.name}</p></div>
                      <div className="grid grid-cols-[120px_1fr] items-center"><Label>Email</Label><p className="text-muted-foreground">{user.email}</p></div>
                      <div className="grid grid-cols-[120px_1fr] items-center"><Label>Mobile</Label><p className="text-muted-foreground">{user.mobile || 'Not set'}</p></div>
                      <div className="grid grid-cols-[120px_1fr] items-start"><Label>Alt. Mobiles</Label>
                        <div className="text-muted-foreground">
                          {user.altMobiles && user.altMobiles.length > 0 ? (
                            user.altMobiles.map((m, i) => <p key={i}>{m.value}</p>)
                          ) : 'Not set'}
                        </div>
                      </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline">Manage Addresses</CardTitle>
                  <CardDescription>View, edit, or remove your saved addresses.</CardDescription>
                </div>
                {(user.addresses?.length || 0) < 2 && (
                  <Button variant="outline" size="sm" onClick={() => { setEditingAddress(null); setIsAddAddressDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {user.addresses && user.addresses.length > 0 ? (
                  user.addresses.map((address, index) => (
                    <Card key={index} className="p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary"/> Address {index + 1} ({address.type})</h4>
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingAddress({ address, index }); setIsAddAddressDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAddress(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
                          <p>{address.city}, {address.state} - {address.postalCode}</p>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No addresses saved yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
