
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import {
  addXeroxService,
  deleteXeroxService,
  getXeroxServices,
  updateXeroxService,
  updateXeroxServiceOrder,
} from "@/lib/data";
import type { XeroxService } from "@/lib/types";

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const xeroxServiceSchema = z.object({
  name: z.string().min(3, "Service name must be at least 3 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  discountPrice: z.coerce.number().optional().nullable(),
  unit: z.string().optional(),
});

export default function ManageXeroxPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [services, setServices] = useState<XeroxService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [editingService, setEditingService] = useState<XeroxService | null>(
    null
  );
  const [deletingService, setDeletingService] = useState<XeroxService | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useForm<z.infer<typeof xeroxServiceSchema>>({
    resolver: zodResolver(xeroxServiceSchema),
    defaultValues: {
      name: "",
      price: 0,
      discountPrice: null,
      unit: "",
    },
  });

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
        fetchServices();
      }
    }
  }, [user, authLoading, router, toast]);
  
  useEffect(() => {
    if (isFormOpen && editingService) {
        form.reset({
            name: editingService.name,
            price: editingService.price,
            discountPrice: editingService.discountPrice,
            unit: editingService.unit || "",
        });
    } else {
        form.reset({
            name: "",
            price: 0,
            discountPrice: null,
            unit: "",
        })
    }
  }, [isFormOpen, editingService, form]);


  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const fetchedServices = await getXeroxServices();
      setServices(fetchedServices);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch Xerox services.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (values: z.infer<typeof xeroxServiceSchema>) => {
    try {
        if (editingService) {
            await updateXeroxService(editingService.id, values);
            toast({ title: "Service Updated", description: `${values.name} has been updated.` });
        } else {
            const newOrder = services.length > 0 ? Math.max(...services.map(s => s.order)) + 1 : 1;
            await addXeroxService({ ...values, order: newOrder });
            toast({ title: "Service Added", description: `${values.name} has been added.` });
        }
        fetchServices();
        setIsFormOpen(false);
        setEditingService(null);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDeleteService = async () => {
    if (!deletingService) return;
    try {
      await deleteXeroxService(deletingService.id);
      toast({ title: "Service Deleted", description: "The service has been removed." });
      fetchServices();
      setDeletingService(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= services.length) return;

    setIsReordering(true);
    const newServices = [...services];
    const itemToMove = newServices[index];
    const otherItem = newServices[newIndex];

    // Swap order property
    [itemToMove.order, otherItem.order] = [otherItem.order, itemToMove.order];
    
    // Update local state for immediate feedback
    setServices(newServices.sort((a, b) => a.order - b.order));

    try {
        await updateXeroxServiceOrder([
            { id: itemToMove.id, order: itemToMove.order },
            { id: otherItem.id, order: otherItem.order }
        ]);
        toast({ title: "Reordered", description: "Service order has been updated." });
    } catch (error: any) {
        // Revert local state on error
        setServices(services);
        toast({ variant: "destructive", title: "Error", description: "Failed to reorder services." });
    } finally {
        setIsReordering(false);
    }
  };
  
  const handleOpenDialog = (service: XeroxService | null) => {
    setEditingService(service);
    setIsFormOpen(true);
  };
  
  const renderServiceForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., A4 Black & White" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Original Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="discountPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Price (Optional)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., per page, per copy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Service"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
                    Manage Xerox Services
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Add, edit, and manage pricing for Xerox services.
                </p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog(null)}>Add New Service</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
                        <DialogDescription>
                            {editingService ? "Update the details for this service." : "Fill in the details for the new service."}
                        </DialogDescription>
                    </DialogHeader>
                    {renderServiceForm()}
                </DialogContent>
            </Dialog>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Xerox Price List</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Original Price</TableHead>
                  <TableHead>Discount Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-8 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No services configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((service, index) => {
                    const hasDiscount = service.discountPrice != null && service.discountPrice < service.price;
                    const discountPercent = hasDiscount ? Math.round(((service.price - service.discountPrice!) / service.price) * 100) : 0;
                    return (
                        <TableRow key={service.id}>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0 || isReordering} onClick={() => handleReorder(index, 'up')}>
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === services.length - 1 || isReordering} onClick={() => handleReorder(index, 'down')}>
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{service.name}</TableCell>
                            <TableCell className="whitespace-nowrap">{service.unit || 'N/A'}</TableCell>
                            <TableCell className="whitespace-nowrap">Rs {service.price.toFixed(2)}</TableCell>
                            <TableCell className="whitespace-nowrap">
                            {service.discountPrice != null ? `Rs ${service.discountPrice.toFixed(2)}` : "N/A"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{hasDiscount ? `${discountPercent}%` : "N/A"}</TableCell>
                            <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(service)}>
                                <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeletingService(service)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                            </TableCell>
                        </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingService} onOpenChange={(open) => !open && setDeletingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{deletingService?.name}" service. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
