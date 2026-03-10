

"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { addShop, getShops, updateShop, deleteShop } from "@/lib/shops";
import { getSellers, getEmployees } from "@/lib/users";
import { SHOP_SERVICES, type Shop, type UserProfile, type ShopService } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";


const shopSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters."),
  address: z.string().min(5, "Address is required."),
  mobileNumbers: z.array(
    z.object({
        value: z.string().regex(/^\d{10}$/, "Must be a 10-digit number."),
    })
  ).optional(),
  ownerIds: z.array(z.string()).min(1, "At least one shop owner is required."),
  employeeIds: z.array(z.string()).optional(),
  services: z.array(z.string()).min(1, "At least one service must be selected."),
  locations: z.array(z.object({ value: z.string() })).optional(),
  notes: z.string().optional(),
});

export default function ManageShopsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [sellers, setSellers] = useState<UserProfile[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof shopSchema>>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: "",
      address: "",
      mobileNumbers: [],
      ownerIds: [],
      employeeIds: [],
      services: [],
      locations: [],
      notes: "",
    },
  });
  
  const editForm = useForm<z.infer<typeof shopSchema>>({
    resolver: zodResolver(shopSchema),
  });

  useEffect(() => {
    if (!loading) {
      if (!user || !user.roles.includes('admin')) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this page.' });
        router.push('/');
      }
    }
  }, [user, loading, router, toast]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedShops, fetchedSellers, fetchedEmployees] = await Promise.all([
        getShops(), 
        getSellers(), 
        getEmployees(),
      ]);
      
      const shopsWithNames = fetchedShops.map(shop => {
        const ownerNames = shop.ownerIds.map(id => fetchedSellers.find(seller => seller.uid === id)?.name || 'N/A');
        const employeeNames = (shop.employeeIds || []).map(id => fetchedEmployees.find(emp => emp.uid === id)?.name || 'N/A');
        return { ...shop, ownerNames, employeeNames };
      });

      setShops(shopsWithNames);
      setSellers(fetchedSellers);
      setEmployees(fetchedEmployees);

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch data." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.roles.includes('admin')) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (editingShop) {
      editForm.reset({
          name: editingShop.name,
          address: editingShop.address,
          mobileNumbers: editingShop.mobileNumbers?.map(num => ({ value: num })) || [],
          ownerIds: editingShop.ownerIds,
          employeeIds: editingShop.employeeIds || [],
          services: editingShop.services,
          locations: editingShop.locations?.map(loc => ({ value: loc })) || [],
          notes: editingShop.notes || "",
      });
    }
  }, [editingShop, editForm]);


  async function onSubmit(values: z.infer<typeof shopSchema>) {
    try {
      const shopData = {
        ...values,
        mobileNumbers: values.mobileNumbers?.map(m => m.value) || [],
        locations: values.locations?.map(l => l.value) || [],
      };
      await addShop(shopData as Omit<Shop, 'id' | 'createdAt' | 'ownerNames' | 'employeeNames'>);
      toast({ title: "Shop Created", description: "The new shop has been added." });
      form.reset();
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  }

  async function onEditSubmit(values: z.infer<typeof shopSchema>) {
    if (!editingShop) return;
    try {
      const shopData = {
        ...values,
        mobileNumbers: values.mobileNumbers?.map(m => m.value) || [],
        locations: values.locations?.map(l => l.value) || [],
      };
      await updateShop(editingShop.id, shopData);
      toast({ title: "Shop Updated", description: "The shop details have been saved." });
      fetchData();
      setIsEditDialogOpen(false);
      setEditingShop(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Updating Shop", description: error.message });
    }
  }

  const handleDeleteShop = async (shopId: string) => {
    try {
      await deleteShop(shopId);
      toast({ title: "Shop Deleted", description: "The shop has been successfully deleted." });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const MobileNumbersInput = ({ form }: { form: any }) => {
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "mobileNumbers",
    });

    return (
      <div>
        <FormLabel>Mobile Numbers</FormLabel>
        {fields.map((field, index) => (
          <FormField
            key={field.id}
            control={form.control}
            name={`mobileNumbers.${index}.value`}
            render={({ field }) => (
              <FormItem className="mt-2 flex items-center gap-2">
                <FormControl>
                  <Input {...field} placeholder={`Mobile Number ${index + 1}`} />
                </FormControl>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        {fields.length < 3 && (
            <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ value: "" })}
            >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Mobile Number
            </Button>
        )}
      </div>
    );
  };
  
  const LocationsInput = ({ form }: { form: any }) => {
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "locations",
    });

    return (
      <div className="space-y-2">
        <FormLabel>Available Areas (Bullet Points)</FormLabel>
        {fields.map((field, index) => (
          <FormField
            key={field.id}
            control={form.control}
            name={`locations.${index}.value`}
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Input {...field} placeholder={`Area ${index + 1}`} />
                </FormControl>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </FormItem>
            )}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ value: "" })}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Area
        </Button>
      </div>
    );
  };

  const MultiUserSelect = ({ form, fieldName, users, label, placeholder }: { form: any, fieldName: "ownerIds" | "employeeIds", users: UserProfile[], label: string, placeholder: string }) => {
    return (
        <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn("w-full justify-between h-auto", !field.value?.length && "text-muted-foreground")}
                                >
                                    <div className="flex gap-1 flex-wrap">
                                        {field.value?.length > 0 ? (
                                            users
                                                .filter(user => field.value.includes(user.uid))
                                                .map(user => (
                                                    <Badge
                                                        variant="secondary"
                                                        key={user.uid}
                                                        className="mr-1"
                                                    >
                                                        {user.name}
                                                    </Badge>
                                                ))
                                        ) : (
                                            placeholder
                                        )}
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
                                <CommandList>
                                    <CommandEmpty>No users found.</CommandEmpty>
                                    <CommandGroup>
                                        {users.map((user) => (
                                            <CommandItem
                                                value={user.name}
                                                key={user.uid}
                                                onSelect={() => {
                                                    const currentIds = field.value || [];
                                                    const newIds = currentIds.includes(user.uid)
                                                        ? currentIds.filter((id: string) => id !== user.uid)
                                                        : [...currentIds, user.uid];
                                                    form.setValue(fieldName, newIds);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        (field.value || []).includes(user.uid)
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {user.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
  };
  
  const ServicesCheckboxes = ({ form, fieldName }: { form: any, fieldName: "services" }) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={() => (
        <FormItem>
          <div className="mb-4">
            <FormLabel className="text-base">Shop Services</FormLabel>
            <FormMessage />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {SHOP_SERVICES.map((item) => (
              <FormField
                key={item}
                control={form.control}
                name={fieldName}
                render={({ field }) => {
                  return (
                    <FormItem
                      key={item}
                      className="flex flex-row items-start space-x-3 space-y-0"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(item)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), item])
                              : field.onChange(
                                  (field.value || []).filter(
                                    (value: string) => value !== item
                                  )
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal capitalize">
                        {item}
                      </FormLabel>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
        </FormItem>
      )}
    />
  );


  if (loading || !user?.roles.includes('admin')) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  const renderForm = (currentForm: any, submitHandler: (values: any) => void) => (
    <Form {...currentForm}>
        <form onSubmit={currentForm.handleSubmit(submitHandler)} className="space-y-4">
            <FormField
                control={currentForm.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Shop Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Jasa Books & Stationary" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={currentForm.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                            <Input placeholder="123 Main St, Anytown, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <MobileNumbersInput form={currentForm} />
            <MultiUserSelect form={currentForm} fieldName="ownerIds" users={sellers} label="Shop Owners" placeholder="Select sellers" />
            <MultiUserSelect form={currentForm} fieldName="employeeIds" users={employees} label="Shop Employees" placeholder="Select employees" />
            <ServicesCheckboxes form={currentForm} fieldName="services" />
            <LocationsInput form={currentForm} />
             <FormField
                control={currentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Delivery between 10 AM and 6 PM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={currentForm.formState.isSubmitting}>
                  {currentForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
            </DialogFooter>
        </form>
    </Form>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Manage Shops</h1>
      <p className="mt-2 text-muted-foreground">Create, view, and edit shops.</p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Create Shop</CardTitle>
              <CardDescription>Add a new shop to the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shop Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Jasa Books & Stationary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, Anytown, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <MobileNumbersInput form={form} />
                  <MultiUserSelect form={form} fieldName="ownerIds" users={sellers} label="Shop Owners" placeholder="Select sellers" />
                  <MultiUserSelect form={form} fieldName="employeeIds" users={employees} label="Shop Employees" placeholder="Select employees" />
                  <ServicesCheckboxes form={form} fieldName="services" />
                  <LocationsInput form={form} />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Delivery between 10 AM and 6 PM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Creating..." : "Create Shop"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Existing Shops</CardTitle>
              <CardDescription>View, edit, and delete shops.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Owners</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center">Loading shops...</TableCell></TableRow>
                    ) : shops.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center">No shops found.</TableCell></TableRow>
                    ) : (
                      shops.map((shop) => (
                        <TableRow key={shop.id}>
                          <TableCell className="font-medium">{shop.name}</TableCell>
                          <TableCell>{shop.ownerNames?.join(', ')}</TableCell>
                          <TableCell>{shop.mobileNumbers?.join(', ')}</TableCell>
                          <TableCell>{new Date(shop.createdAt.seconds * 1000).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                               <Dialog open={isEditDialogOpen && editingShop?.id === shop.id} onOpenChange={(open) => {
                                  if (!open) {
                                    setEditingShop(null);
                                    editForm.reset();
                                  }
                                  setIsEditDialogOpen(open);
                                }}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setEditingShop(shop)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Edit Shop</DialogTitle>
                                        <DialogDescription>
                                            Make changes to the shop details.
                                        </DialogDescription>
                                    </DialogHeader>
                                    {renderForm(editForm, onEditSubmit)}
                                </DialogContent>
                               </Dialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the shop. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteShop(shop.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
