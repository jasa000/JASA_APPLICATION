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
    updatePaperTypeOrder
} from "@/lib/data";
import type { XeroxOption } from "@/lib/types";
import { HARDCODED_XEROX_OPTIONS } from "@/lib/xerox-options";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { Trash2, Pencil, Info, ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const paperTypeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  priceBwFront: z.coerce.number().positive("B&W Front Only price must be a positive number."),
  priceBwBoth: z.coerce.number().positive("B&W Front & Back price must be a positive number."),
  priceColorFront: z.coerce.number().positive("Color Front Only price must be a positive number."),
  priceColorBoth: z.coerce.number().positive("Color Front & Back price must be a positive number."),
  colorOptionIds: z.array(z.string()).optional(),
  formatTypeIds: z.array(z.string()).optional(),
  printRatioIds: z.array(z.string()).optional(),
  bindingTypeIds: z.array(z.string()).optional(),
  laminationTypeIds: z.array(z.string()).optional(),
});


type AllOptions = {
    bindingTypes: XeroxOption[];
    laminationTypes: XeroxOption[];
}


export default function ManageXeroxFormPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [paperTypes, setPaperTypes] = useState<XeroxOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [editingPaperType, setEditingPaperType] = useState<XeroxOption | null>(null);
    const [deletingPaperType, setDeletingPaperType] = useState<XeroxOption | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isReordering, setIsReordering] = useState(false);

    const [allOptions, setAllOptions] = useState<AllOptions | null>(null);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);


    const form = useForm<z.infer<typeof paperTypeSchema>>({
        resolver: zodResolver(paperTypeSchema),
        defaultValues: {
            name: "",
            priceBwFront: 0,
            priceBwBoth: 0,
            priceColorFront: 0,
            priceColorBoth: 0,
            colorOptionIds: [],
            formatTypeIds: [],
            printRatioIds: [],
            bindingTypeIds: [],
            laminationTypeIds: [],
        },
    });

    const fetchPaperTypes = async () => {
        setIsLoading(true);
        try {
            const types = await getXeroxOptions('paperType');
            setPaperTypes(types);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to fetch paper types." });
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
                fetchPaperTypes();
            }
        }
    }, [user, authLoading, router, toast]);

    useEffect(() => {
        const fetchAllOptions = async () => {
            setIsLoadingOptions(true);
            try {
                const [bindingTypes, laminationTypes] = await Promise.all([
                    getXeroxOptions('bindingType'),
                    getXeroxOptions('laminationType'),
                ]);
                setAllOptions({ bindingTypes, laminationTypes });
            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "Failed to load Xerox form options." });
            } finally {
                setIsLoadingOptions(false);
            }
        };
        if(isFormOpen) {
            fetchAllOptions();
        }
    }, [isFormOpen, toast]);

    useEffect(() => {
        if (isFormOpen) {
            form.reset({
                name: editingPaperType?.name || "",
                priceBwFront: editingPaperType?.priceBwFront || 0,
                priceBwBoth: editingPaperType?.priceBwBoth || 0,
                priceColorFront: editingPaperType?.priceColorFront || 0,
                priceColorBoth: editingPaperType?.priceColorBoth || 0,
                colorOptionIds: editingPaperType?.colorOptionIds || [],
                formatTypeIds: editingPaperType?.formatTypeIds || [],
                printRatioIds: editingPaperType?.printRatioIds || [],
                bindingTypeIds: editingPaperType?.bindingTypeIds || [],
                laminationTypeIds: editingPaperType?.laminationTypeIds || [],
            });
        }
    }, [isFormOpen, editingPaperType, form]);

    const handleFormSubmit = async (values: z.infer<typeof paperTypeSchema>) => {
        setIsSubmitting(true);
        try {
            if (editingPaperType) {
                await updateXeroxOption('paperType', editingPaperType.id, values);
                toast({ title: "Paper Type Updated", description: `${values.name} has been updated.` });
            } else {
                const maxOrder = paperTypes.length > 0 ? Math.max(...paperTypes.map(pt => pt.order || 0)) : 0;
                await addXeroxOption('paperType', { ...values, order: maxOrder + 1 });
                toast({ title: "Paper Type Added", description: `${values.name} has been added.` });
            }

            fetchPaperTypes();
            setIsFormOpen(false);
            setEditingPaperType(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async () => {
        if (!deletingPaperType) return;
        setIsSubmitting(true);
        try {
            await deleteXeroxOption('paperType', deletingPaperType.id);
            toast({ title: "Paper Type Deleted", description: "The paper type has been removed." });
            fetchPaperTypes();
            setDeletingPaperType(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const handleReorder = async (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= paperTypes.length) return;

        setIsReordering(true);
        const originalPaperTypes = [...paperTypes]; // Keep a backup
        const newPaperTypes = [...paperTypes];
        const itemToMove = newPaperTypes[index];
        const otherItem = newPaperTypes[newIndex];

        // Swap order property
        [itemToMove.order, otherItem.order] = [otherItem.order, itemToMove.order];
        
        // Update local state for immediate feedback
        setPaperTypes(newPaperTypes.sort((a, b) => (a.order || 0) - (b.order || 0)));

        try {
            await updatePaperTypeOrder([
                { id: itemToMove.id, order: itemToMove.order || 0 },
                { id: otherItem.id, order: otherItem.order || 0 }
            ]);
            toast({ title: "Reordered", description: "Paper type order has been updated." });
        } catch (error: any) {
            // Revert local state on error
            setPaperTypes(originalPaperTypes);
            toast({ variant: "destructive", title: "Error", description: "Failed to reorder paper types." });
        } finally {
            setIsReordering(false);
        }
    };

    const OptionCheckboxGroup = ({ name, options }: { name: keyof z.infer<typeof paperTypeSchema>, options: { id: string, name: string, price?: number }[]}) => (
        <div className="pl-6 pt-4 space-y-2 border-l">
        {options.map((option) => (
            <FormField
                key={option.id}
                control={form.control}
                name={name as any}
                render={({ field }) => {
                    return (
                        <FormItem key={option.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value?.includes(option.id)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), option.id])
                                            : field.onChange((field.value || []).filter((value: string) => value !== option.id));
                                    }}
                                />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">
                                {option.name} {option.price ? `(Rs ${option.price})` : ''}
                            </FormLabel>
                        </FormItem>
                    );
                }}
            />
        ))}
        </div>
    );

    const MasterOptionToggle = ({
        name,
        label,
        options,
    }: {
        name: keyof z.infer<typeof paperTypeSchema>;
        label: string;
        options: { id: string; name: string; price?: number }[];
    }) => {
        const isEnabled = (form.watch(name) || []).length > 0;

        const handleToggle = (checked: boolean) => {
            if (checked) {
                // When enabling, select all sub-options by default for convenience
                form.setValue(name, options.map(opt => opt.id) as any, { shouldDirty: true });
            } else {
                // When disabling, clear all selections
                form.setValue(name, [] as any, { shouldDirty: true });
            }
        };

        return (
            <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                    <FormLabel className="font-medium">{label}</FormLabel>
                    <Switch checked={isEnabled} onCheckedChange={handleToggle} />
                </div>
                {isEnabled && (
                    <div className="pt-2">
                        <OptionCheckboxGroup name={name} options={options} />
                    </div>
                )}
            </div>
        );
    };


    const renderForm = () => (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Paper Type Name</FormLabel>
                            <FormControl><Input placeholder="e.g., A4 Sheet (75 GSM)" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Black & White Prices</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="priceBwFront" render={({ field }) => (
                            <FormItem><FormLabel>Front Only</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="priceBwBoth" render={({ field }) => (
                            <FormItem><FormLabel>Front & Back</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Color Prices</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="priceColorFront" render={({ field }) => (
                            <FormItem><FormLabel>Front Only</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="priceColorBoth" render={({ field }) => (
                            <FormItem><FormLabel>Front & Back</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Separator />
                <h3 className="text-lg font-medium">Available Options for this Paper Type</h3>
                <div className="space-y-4">
                    <MasterOptionToggle name="colorOptionIds" label="Color Options" options={HARDCODED_XEROX_OPTIONS.colorOptions} />
                    <MasterOptionToggle name="formatTypeIds" label="Format Types" options={HARDCODED_XEROX_OPTIONS.formatTypes} />
                    <MasterOptionToggle name="printRatioIds" label="Print Ratios" options={HARDCODED_XEROX_OPTIONS.printRatios} />
                     {isLoadingOptions ? <p>Loading options...</p> : allOptions && (
                        <>
                           <MasterOptionToggle name="bindingTypeIds" label="Binding Types" options={allOptions.bindingTypes} />
                           <MasterOptionToggle name="laminationTypeIds" label="Lamination Types" options={allOptions.laminationTypes} />
                        </>
                    )}
                </div>
                
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Paper Type"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );

    return (
        <>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between">
                    <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
                        Manage Xerox Paper Types
                    </h1>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { setEditingPaperType(null); setIsFormOpen(true); }}>Add Paper Type</Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingPaperType ? "Edit Paper Type" : "Add Paper Type"}</DialogTitle>
                            </DialogHeader>
                            {renderForm()}
                        </DialogContent>
                    </Dialog>
                </div>
                <p className="mt-2 text-muted-foreground">Add, edit, and set pricing and available options for paper types.</p>
                
                <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        The first paper type in the list is the default selection for users. Use the arrows to reorder.
                    </AlertDescription>
                </Alert>

                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Paper Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Order</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>B&W Price (Front/Both)</TableHead>
                                    <TableHead>Color Price (Front/Both)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-8 w-12" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paperTypes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">No paper types configured yet.</TableCell>
                                    </TableRow>
                                ) : (
                                    paperTypes.map((type, index) => (
                                        <TableRow key={type.id}>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0 || isReordering} onClick={() => handleReorder(index, 'up')}>
                                                        <ArrowUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === paperTypes.length - 1 || isReordering} onClick={() => handleReorder(index, 'down')}>
                                                        <ArrowDown className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{type.name}</TableCell>
                                            <TableCell>Rs {type.priceBwFront?.toFixed(2)} / {type.priceBwBoth?.toFixed(2)}</TableCell>
                                            <TableCell>Rs {type.priceColorFront?.toFixed(2)} / {type.priceColorBoth?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => { setEditingPaperType(type); setIsFormOpen(true); }}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setDeletingPaperType(type)}>
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
            </div>
            
            <AlertDialog open={!!deletingPaperType} onOpenChange={(open) => !open && setDeletingPaperType(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{deletingPaperType?.name}". This action cannot be undone.</AlertDialogDescription>
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
