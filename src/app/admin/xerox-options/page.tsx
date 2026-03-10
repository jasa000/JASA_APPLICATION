
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { 
    getXeroxOptions, 
    addXeroxOption, 
    updateXeroxOption, 
    deleteXeroxOption,
} from "@/lib/data";
import type { XeroxOption, XeroxOptionType } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, PlusCircle, Book, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const optionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  price: z.coerce.number().nonnegative("Price must be a non-negative number.").optional(),
});

type OptionFormData = z.infer<typeof optionSchema>;

export default function ManageXeroxOptionsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState<XeroxOptionType>('bindingType');
    const [options, setOptions] = useState<XeroxOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [editingOption, setEditingOption] = useState<XeroxOption | null>(null);
    const [deletingOption, setDeletingOption] = useState<XeroxOption | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const form = useForm<OptionFormData>({
        resolver: zodResolver(optionSchema),
        defaultValues: { name: "", price: 0 },
    });

    const TABS: { value: XeroxOptionType, label: string, icon: React.FC<any>, hasPrice: boolean }[] = [
      { value: 'bindingType', label: 'Binding Types', icon: Book, hasPrice: true },
      { value: 'laminationType', label: 'Lamination Types', icon: Layers, hasPrice: true },
    ];

    const currentTabInfo = TABS.find(t => t.value === activeTab);

    const fetchOptions = async (type: XeroxOptionType) => {
        setIsLoading(true);
        try {
            const fetchedOptions = await getXeroxOptions(type);
            setOptions(fetchedOptions);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: `Failed to fetch ${type} options.` });
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (!authLoading) {
            if (!user || !user.roles.includes("admin")) {
                toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to view this page." });
                router.push("/");
            } else {
                fetchOptions(activeTab);
            }
        }
    }, [user, authLoading, router, toast, activeTab]);

    useEffect(() => {
        if (isFormOpen) {
            form.reset({
                name: editingOption?.name || "",
                price: editingOption?.price || 0,
            });
        }
    }, [isFormOpen, editingOption, form]);
    
    const getTitle = (type: XeroxOptionType) => {
        return TABS.find(t => t.value === type)?.label || 'Option';
    }

    const handleFormSubmit = async (values: OptionFormData) => {
        setIsSubmitting(true);
        const optionData: Partial<XeroxOption> = { name: values.name };
        if (currentTabInfo?.hasPrice) {
            optionData.price = values.price;
        }

        try {
            if (editingOption) {
                await updateXeroxOption(activeTab, editingOption.id, optionData);
                toast({ title: `${getTitle(activeTab)} Updated`, description: `${values.name} has been updated.` });
            } else {
                await addXeroxOption(activeTab, optionData);
                toast({ title: `${getTitle(activeTab)} Added`, description: `${values.name} has been added.` });
            }
            fetchOptions(activeTab);
            setIsFormOpen(false);
            setEditingOption(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async () => {
        if (!deletingOption) return;
        setIsSubmitting(true);
        try {
            await deleteXeroxOption(activeTab, deletingOption.id);
            toast({ title: `${getTitle(activeTab)} Deleted`, description: `"${deletingOption.name}" has been removed.` });
            fetchOptions(activeTab);
            setDeletingOption(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderForm = () => (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl><Input placeholder="e.g., Spiral Binding" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {currentTabInfo?.hasPrice && (
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}

                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : `Save ${getTitle(activeTab)}`}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );

    const renderOptionsTable = () => (
        <Card>
            <CardHeader>
                <CardTitle>Existing {getTitle(activeTab)}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            {currentTabInfo?.hasPrice && <TableHead>Price</TableHead>}
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    {currentTabInfo?.hasPrice && <TableCell><Skeleton className="h-6 w-24" /></TableCell>}
                                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : options.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={currentTabInfo?.hasPrice ? 3 : 2} className="text-center">No options configured yet.</TableCell>
                            </TableRow>
                        ) : (
                            options.map((option) => (
                                <TableRow key={option.id}>
                                    <TableCell className="font-medium">{option.name}</TableCell>
                                    {currentTabInfo?.hasPrice && <TableCell>Rs {option.price?.toFixed(2)}</TableCell>}
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingOption(option); setIsFormOpen(true); }}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeletingOption(option)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )

    return (
        <>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
                        Manage Xerox Form Options
                    </h1>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { setEditingOption(null); setIsFormOpen(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingOption ? `Edit ${getTitle(activeTab)}` : `Add ${getTitle(activeTab)}`}</DialogTitle>
                            </DialogHeader>
                            {renderForm()}
                        </DialogContent>
                    </Dialog>
                </div>
                <p className="text-muted-foreground">Add, edit, and set pricing for various options in the Xerox form.</p>
                
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as XeroxOptionType)} className="mt-8">
                    <TabsList className="grid w-full grid-cols-2">
                       {TABS.map(tab => (
                           <TabsTrigger key={tab.value} value={tab.value}>
                               <tab.icon className="mr-2 h-4 w-4" />
                               {tab.label}
                           </TabsTrigger>
                       ))}
                    </TabsList>
                    {TABS.map(tab => (
                        <TabsContent key={tab.value} value={tab.value} className="mt-4">
                            {renderOptionsTable()}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
            
            <AlertDialog open={!!deletingOption} onOpenChange={(open) => !open && setDeletingOption(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{deletingOption?.name}". This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
                            {isSubmitting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
