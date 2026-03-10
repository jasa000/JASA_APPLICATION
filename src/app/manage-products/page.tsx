
"use client";

import { useState, useEffect } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct, getBrands, addBrand, getAuthors, addAuthor, getProductTypes, addProductType, updateBrand, deleteBrand, updateAuthor, deleteAuthor, updateProductType, deleteProductType } from "@/lib/data";
import ProductCard from "@/components/product-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product, Brand, Author, ProductType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronsUpDown, Pencil, Trash2, PlusCircle, ChevronUp, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
import { useLoading } from "@/hooks/use-loading";
import { uploadImageAction } from "@/app/actions/upload-image-action";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

const categories: { value: Product['category'], label: string }[] = [
    { value: 'stationary', label: 'Stationary' },
    { value: 'books', label: 'Books' },
    { value: 'electronics', label: 'Electronic Kit' },
];

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  brandIds: z.array(z.string()).optional(),
  authorIds: z.array(z.string()).optional(),
  productTypeIds: z.array(z.string()).optional(),
  description: z.string().min(10, "Description must be at least 10 characters."),
  category: z.enum(['stationary', 'books', 'electronics']),
  price: z.coerce.number().positive("Price must be a positive number."),
  discountPrice: z.coerce.number().optional().or(z.literal('')),
  imageNames: z.array(z.object({ value: z.string().min(1, "Image is required.") })).optional(),
  primaryImageIndex: z.string().optional(),
});

const metadataSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
});

type MetadataItem = Brand | Author | ProductType;

export default function ManageProductsPage() {
  const [activeTab, setActiveTab] = useState<Product['category']>('stationary');
  const [productList, setProductList] = useState<Product[]>([]);
  const [stationaryBrandList, setStationaryBrandList] = useState<Brand[]>([]);
  const [electronicsBrandList, setElectronicsBrandList] = useState<Brand[]>([]);
  const [authorList, setAuthorList] = useState<Author[]>([]);
  const [productTypeList, setProductTypeList] = useState<ProductType[]>([]);
  const { isLoading, setIsLoading } = useLoading();
  const { toast } = useToast();
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  
  const [isBrandFormOpen, setIsBrandFormOpen] = useState(false);
  const [isAuthorFormOpen, setIsAuthorFormOpen] = useState(false);
  const [isProductTypeFormOpen, setIsProductTypeFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  
  const [editingMetadata, setEditingMetadata] = useState<{item: MetadataItem, type: 'brand' | 'author' | 'productType'} | null>(null);
  const [deletingMetadata, setDeletingMetadata] = useState<{item: MetadataItem, type: 'brand' | 'author' | 'productType'} | null>(null);


  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brandIds: [],
      authorIds: [],
      productTypeIds: [],
      description: "",
      category: activeTab,
      price: 0,
      discountPrice: '',
      imageNames: [],
      primaryImageIndex: "0",
    },
  });

  const editForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
  });

  const metadataForm = useForm<z.infer<typeof metadataSchema>>({
    resolver: zodResolver(metadataSchema),
    defaultValues: { name: "" },
  });
  
  useEffect(() => {
    if (editingMetadata) {
        metadataForm.setValue('name', editingMetadata.item.name);
    }
  }, [editingMetadata, metadataForm]);


  const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [products, stationaryBrands, electronicsBrands, authors, productTypes] = await Promise.all([
            getProducts(), 
            getBrands('stationary'),
            getBrands('electronics'),
            getAuthors(),
            getProductTypes(),
        ]);
        setProductList(products);
        setStationaryBrandList(stationaryBrands);
        setElectronicsBrandList(electronicsBrands);
        setAuthorList(authors);
        setProductTypeList(productTypes);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch data from the database." });
      } finally {
        setIsLoading(false);
      }
  }

  useEffect(() => {
    fetchAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, setIsLoading]);

  useEffect(() => {
    form.setValue('category', activeTab);
  }, [activeTab, form]);
  
  useEffect(() => {
    if (editingProduct) {
      editForm.reset({
        name: editingProduct.name,
        brandIds: editingProduct.brandIds || [],
        authorIds: editingProduct.authorIds || [],
        productTypeIds: editingProduct.productTypeIds || [],
        description: editingProduct.description,
        category: editingProduct.category,
        price: editingProduct.price,
        discountPrice: editingProduct.discountPrice || '',
        imageNames: (editingProduct.imageNames || []).map(name => ({ value: name })),
        primaryImageIndex: "0",
      });
      setIsEditDialogOpen(true);
    } else {
        setIsEditDialogOpen(false);
    }
  }, [editingProduct, editForm]);

  const processAndSubmit = async (
    values: z.infer<typeof productSchema>, 
    action: (productData: any) => Promise<any>,
    successMessage: string,
    errorMessage: string,
    formToReset?: any
  ) => {
    setIsLoading(true);
    try {
        const imageInputs = values.imageNames?.map(img => img.value) || [];
        const uploadedImageUrls: string[] = [];

        for (const imageValue of imageInputs) {
            // If it's a new base64 image, upload it
            if (imageValue.startsWith('data:image')) {
                const result = await uploadImageAction(imageValue);
                if (result.success && result.url) {
                    uploadedImageUrls.push(result.url);
                } else {
                    throw new Error(result.error || 'Image upload failed for one or more images.');
                }
            } 
            // If it's already a valid Cloudinary URL, keep it
            else if (imageValue.startsWith('https://res.cloudinary.com')) {
                uploadedImageUrls.push(imageValue);
            }
            // Ignore any other invalid values (like old filenames)
        }
        
        const primaryIndex = parseInt(values.primaryImageIndex || "0", 10);
        let finalImageOrder: string[] = [];
        if (uploadedImageUrls.length > 0) {
            if (primaryIndex < uploadedImageUrls.length) {
                const primaryImage = uploadedImageUrls[primaryIndex];
                const otherImages = uploadedImageUrls.filter((_, index) => index !== primaryIndex);
                finalImageOrder = [primaryImage, ...otherImages];
            } else {
                finalImageOrder = uploadedImageUrls;
            }
        }

        const productData = {
            ...values,
            imageNames: finalImageOrder,
        };
        delete productData.primaryImageIndex;

        await action(productData);

        toast({
            title: "Success",
            description: successMessage,
        });

        fetchAllData();
        if (formToReset) {
            formToReset.reset({
                name: "",
                brandIds: [],
                authorIds: [],
                productTypeIds: [],
                description: "",
                category: activeTab,
                price: 0,
                discountPrice: '',
                imageNames: [],
                primaryImageIndex: "0",
            });
        }
        return true;
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: errorMessage + (error.message ? `: ${error.message}`: ''),
        });
        return false;
    } finally {
        setIsLoading(false);
    }
  }


  const onProductSubmit = async (values: z.infer<typeof productSchema>) => {
    const success = await processAndSubmit(
        values,
        (data) => addProduct(data),
        `${values.name} has been added successfully.`,
        "Failed to create the product.",
        form
    );
    if(success) setIsProductFormOpen(false);
  };

  const onEditSubmit = async (values: z.infer<typeof productSchema>) => {
    if (!editingProduct) return;
    const success = await processAndSubmit(
        values,
        (data) => updateProduct(editingProduct.id, data),
        "The product has been updated.",
        "Failed to update product."
    );
    if(success) setEditingProduct(null);
  }

  const handleDelete = async () => {
    if (!deletingProductId) return;
    try {
        await deleteProduct(deletingProductId);
        toast({ title: "Product Deleted", description: "The product has been successfully removed." });
        fetchAllData();
        setDeletingProductId(null);
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete product." });
    }
  }

  const onMetadataSubmit = async (values: z.infer<typeof metadataSchema>, category: Brand['category'] | ProductType['category'], type: 'brand' | 'author' | 'productType') => {
    setIsLoading(true);
    try {
      let action;
      switch (type) {
        case 'brand': action = addBrand(values, category as Brand['category']); break;
        case 'author': action = addAuthor(values); break;
        case 'productType': action = addProductType(values, category as ProductType['category']); break;
        default: throw new Error("Invalid metadata type");
      }
      await action;
      toast({ title: "Success", description: `${values.name} has been added.` });
      fetchAllData();
      metadataForm.reset();
      switch (type) {
        case 'brand': setIsBrandFormOpen(false); break;
        case 'author': setIsAuthorFormOpen(false); break;
        case 'productType': setIsProductTypeFormOpen(false); break;
      }
    } catch(e: any) {
       toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
       setIsLoading(false);
    }
  };

  const onEditMetadataSubmit = async (values: z.infer<typeof metadataSchema>) => {
    if (!editingMetadata) return;
    setIsLoading(true);
    try {
      const { item, type } = editingMetadata;
      let action;
      switch (type) {
        case 'brand': action = updateBrand(item.id, values); break;
        case 'author': action = updateAuthor(item.id, values); break;
        case 'productType': action = updateProductType(item.id, values); break;
        default: throw new Error("Invalid metadata type");
      }
      await action;
      toast({ title: "Success", description: `${item.name} has been updated.` });
      fetchAllData();
      setEditingMetadata(null);
    } catch(e: any) {
       toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
       setIsLoading(false);
    }
  };

  const onDeleteMetadata = async () => {
    if (!deletingMetadata) return;
    setIsLoading(true);
    try {
      const { item, type } = deletingMetadata;
      let action;
      switch (type) {
        case 'brand': action = deleteBrand(item.id); break;
        case 'author': action = deleteAuthor(item.id); break;
        case 'productType': action = deleteProductType(item.id); break;
        default: throw new Error("Invalid metadata type");
      }
      await action;
      toast({ title: "Success", description: `${item.name} has been deleted.` });
      fetchAllData();
      setDeletingMetadata(null);
    } catch(e: any) {
       toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
       setIsLoading(false);
    }
  };

  
  const MultiSelect = ({ form, fieldName, items, placeholder, searchPlaceholder, emptyMessage, label }: { 
    form: any, 
    fieldName: "brandIds" | "authorIds" | "productTypeIds", 
    items: (Brand | Author | ProductType)[],
    placeholder: string,
    searchPlaceholder: string,
    emptyMessage: string,
    label: string
  }) => {
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
                                            items
                                                .filter(item => field.value.includes(item.id))
                                                .map(item => (
                                                    <Badge
                                                        variant="secondary"
                                                        key={item.id}
                                                        className="mr-1"
                                                    >
                                                        {item.name}
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
                                <CommandInput placeholder={searchPlaceholder} />
                                <CommandList>
                                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                                    <CommandGroup>
                                        {items.map((item) => (
                                            <CommandItem
                                                value={item.name}
                                                key={item.id}
                                                onSelect={() => {
                                                    const currentIds = field.value || [];
                                                    const newIds = currentIds.includes(item.id)
                                                        ? currentIds.filter((id: string) => id !== item.id)
                                                        : [...currentIds, item.id];
                                                    form.setValue(fieldName, newIds);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        (field.value || []).includes(item.id)
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {item.name}
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

  const ImageFields = ({ form }: { form: any }) => {
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "imageNames"
    });
    
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 200 * 1024) { // 200KB limit
                toast({ variant: 'destructive', title: 'File too large', description: 'Please select an image smaller than 200KB.'});
                return;
            }
            const reader = new FileReader();
            reader.onload = (readResult) => {
                form.setValue(`imageNames.${index}.value`, readResult.target?.result as string);
                form.trigger(`imageNames.${index}.value`);
            };
            reader.readAsDataURL(file);
        }
    };
  
    return (
      <FormField
        control={form.control}
        name="primaryImageIndex"
        render={({ field: radioField }) => (
          <FormItem className="space-y-3">
            <FormLabel>Product Images</FormLabel>
            <RadioGroup
              onValueChange={radioField.onChange}
              value={radioField.value}
              className="space-y-3"
            >
              {fields.map((item, index) => {
                const imageValue = form.watch(`imageNames.${index}.value`);
                const isUrl = typeof imageValue === 'string' && imageValue.startsWith('https://');
                const isPreview = typeof imageValue === 'string' && imageValue.startsWith('data:image');
                
                return (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name={`imageNames.${index}.value`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <div className="flex items-center gap-2 rounded-md border p-2">
                           <RadioGroupItem value={index.toString()} id={`image-radio-${index}`} />
                           <FormLabel htmlFor={`image-radio-${index}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Main
                           </FormLabel>
                          <FormControl>
                            <Input type="file" accept="image/*" className="h-auto" onChange={(e) => handleFileChange(e, index)} />
                          </FormControl>
                          {(isUrl || isPreview) && (
                            <div className="relative h-10 w-10 flex-shrink-0">
                                <Image src={imageValue} alt={`Preview ${index}`} fill className="object-cover rounded-md" />
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )
              })}
            </RadioGroup>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ value: "" })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Image
            </Button>
          </FormItem>
        )}
      />
    );
  };
  
  const renderCreateMetadataForm = (
    category: Brand['category'] | ProductType['category'],
    type: 'brand' | 'author' | 'productType',
    isOpen: boolean,
    onOpenChange: (open: boolean) => void
  ) => {
      const title = type === 'brand' ? `Create ${category} Brand` : type === 'author' ? 'Create Author' : 'Create Product Type';
      const description = `Add a new ${type.replace(/([A-Z])/g, ' $1').toLowerCase()} for this category.`;
      
      return (
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
            <Card>
                <CollapsibleTrigger asChild>
                    <div className="flex w-full cursor-pointer items-center justify-between p-4">
                        <div>
                            <CardTitle>{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronUp className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                    <Form {...metadataForm}>
                        <form onSubmit={metadataForm.handleSubmit((values) => onMetadataSubmit(values, category, type))} className="space-y-4">
                        <FormField control={metadataForm.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Adding..." : `Add ${type.replace(/([A-Z])/g, ' $1')}`}
                        </Button>
                        </form>
                    </Form>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
  }
  
  const renderMetadataList = (
    items: MetadataItem[], 
    type: 'brand' | 'author' | 'productType',
    title: string
  ) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No items found.</p>
                ) : (
                    <div className="space-y-2">
                        {items.map(item => (
                            <div key={item.id} className="flex items-center justify-between rounded-md border p-2">
                                <span className="font-medium">{item.name}</span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMetadata({item, type})}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeletingMetadata({item, type})}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
  }


  const renderCreateForm = (category: Product['category'], currentForm: any, isOpen: boolean, onOpenChange: (open: boolean) => void) => (
     <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <Card>
            <CollapsibleTrigger asChild>
                 <div className="flex w-full cursor-pointer items-center justify-between p-4">
                    <div>
                        <CardTitle>Create {categories.find(c => c.value === category)?.label} Product</CardTitle>
                        <CardDescription>Add a new item to your inventory for this category.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                        <ChevronUp className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <CardContent>
                    <Form {...currentForm}>
                        <form onSubmit={currentForm.handleSubmit(onProductSubmit)} className="space-y-4">
                            <FormField control={currentForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                            {category === 'stationary' && <MultiSelect form={currentForm} fieldName="brandIds" items={stationaryBrandList} label="Brands" placeholder="Select brands" searchPlaceholder="Search brands..." emptyMessage="No brands found." />}
                            {category === 'books' && <MultiSelect form={currentForm} fieldName="authorIds" items={authorList} label="Authors" placeholder="Select authors" searchPlaceholder="Search authors..." emptyMessage="No authors found." />}
                            {category === 'electronics' && <MultiSelect form={currentForm} fieldName="brandIds" items={electronicsBrandList} label="Brands" placeholder="Select brands" searchPlaceholder="Search brands..." emptyMessage="No brands found." />}
                            
                            <MultiSelect form={currentForm} fieldName="productTypeIds" items={productTypeList.filter(pt => pt.category === category)} label="Product Types" placeholder="Select product types" searchPlaceholder="Search product types..." emptyMessage="No product types found." />

                            <FormField control={currentForm.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )} />

                            <ImageFields form={currentForm} />
                            
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField control={currentForm.control} name="price" render={({ field }) => (
                                <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={currentForm.control} name="discountPrice" render={({ field }) => (
                                <FormItem><FormLabel>Discount Price (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : "Add Product"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </CollapsibleContent>
        </Card>
     </Collapsible>
  );

  const renderProductGrid = (category: Product['category']) => {
    const filtered = productList.filter(p => p.category === category);

    if (isLoading && !productList.length) {
      return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
        <>
            <h2 className="text-2xl font-bold tracking-tight mb-4 mt-8">Existing {categories.find(c => c.value === category)?.label} Products</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filtered.length > 0 ? (
                    filtered.map((product) => (
                        <ProductCard 
                            key={product.id} 
                            product={product} 
                            showAdminControls
                            onEdit={() => setEditingProduct(product)}
                            onDelete={() => setDeletingProductId(product.id)}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center">
                        <p className="text-muted-foreground">No products found in this category.</p>
                    </div>
                )}
            </div>
        </>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Manage Products</h1>
      <p className="mt-2 text-muted-foreground">Add, edit, and manage your products and their metadata.</p>

      <Tabs value={activeTab} onValueChange={(value) => {
          const newCategory = value as Product['category'];
          setActiveTab(newCategory);
          form.setValue('category', newCategory);
          setIsBrandFormOpen(false);
          setIsAuthorFormOpen(false);
          setIsProductTypeFormOpen(false);
          setIsProductFormOpen(false);
      }} className="mt-8 w-full">
          <div className="sticky top-20 z-10 bg-background py-4">
              <TabsList className="grid w-full grid-cols-3">
                  {categories.map((cat) => (
                      <TabsTrigger key={cat.value} value={cat.value}>{cat.label}</TabsTrigger>
                  ))}
              </TabsList>
          </div>
          
          <TabsContent value="stationary" className="mt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  {renderCreateMetadataForm('stationary', 'brand', isBrandFormOpen, setIsBrandFormOpen)}
                  {!isBrandFormOpen && <div className="mt-8">{renderMetadataList(stationaryBrandList, 'brand', 'Manage Stationary Brands')}</div>}
                </div>
                <div>
                  {renderCreateMetadataForm('stationary', 'productType', isProductTypeFormOpen, setIsProductTypeFormOpen)}
                  {!isProductTypeFormOpen && <div className="mt-8">{renderMetadataList(productTypeList.filter(pt => pt.category === 'stationary'), 'productType', 'Manage Stationary Types')}</div>}
                </div>
              </div>
              <Separator />
              {renderCreateForm('stationary', form, isProductFormOpen, setIsProductFormOpen)}
              <Separator />
              {renderProductGrid('stationary')}
          </TabsContent>

          <TabsContent value="books" className="mt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    {renderCreateMetadataForm('books', 'author', isAuthorFormOpen, setIsAuthorFormOpen)}
                    {!isAuthorFormOpen && <div className="mt-8">{renderMetadataList(authorList, 'author', 'Manage Authors')}</div>}
                  </div>
                  <div>
                    {renderCreateMetadataForm('books', 'productType', isProductTypeFormOpen, setIsProductTypeFormOpen)}
                    {!isProductTypeFormOpen && <div className="mt-8">{renderMetadataList(productTypeList.filter(pt => pt.category === 'books'), 'productType', 'Manage Book Types')}</div>}
                  </div>
              </div>
              <Separator />
              {renderCreateForm('books', form, isProductFormOpen, setIsProductFormOpen)}
              <Separator />
              {renderProductGrid('books')}
          </TabsContent>

          <TabsContent value="electronics" className="mt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  {renderCreateMetadataForm('electronics', 'brand', isBrandFormOpen, setIsBrandFormOpen)}
                  {!isBrandFormOpen && <div className="mt-8">{renderMetadataList(electronicsBrandList, 'brand', 'Manage Electronics Brands')}</div>}
                </div>
                <div>
                  {renderCreateMetadataForm('electronics', 'productType', isProductTypeFormOpen, setIsProductTypeFormOpen)}
                  {!isProductTypeFormOpen && <div className="mt-8">{renderMetadataList(productTypeList.filter(pt => pt.category === 'electronics'), 'productType', 'Manage Electronics Types')}</div>}
                </div>
              </div>
              <Separator />
              {renderCreateForm('electronics', form, isProductFormOpen, setIsProductFormOpen)}
              <Separator />
              {renderProductGrid('electronics')}
          </TabsContent>
      </Tabs>
      
       <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) setEditingProduct(null); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Make changes to your product here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                     <FormField control={editForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    {editingProduct?.category === 'stationary' && <MultiSelect form={editForm} fieldName="brandIds" items={stationaryBrandList} label="Brands" placeholder="Select brands" searchPlaceholder="Search brands..." emptyMessage="No brands found." />}
                    {editingProduct?.category === 'books' && <MultiSelect form={editForm} fieldName="authorIds" items={authorList} label="Authors" placeholder="Select authors" searchPlaceholder="Search authors..." emptyMessage="No authors found." />}
                    {editingProduct?.category === 'electronics' && <MultiSelect form={editForm} fieldName="brandIds" items={electronicsBrandList} label="Brands" placeholder="Select brands" searchPlaceholder="Search brands..." emptyMessage="No brands found." />}

                    <MultiSelect form={editForm} fieldName="productTypeIds" items={productTypeList.filter(pt => pt.category === editingProduct?.category)} label="Product Types" placeholder="Select product types" searchPlaceholder="Search product types..." emptyMessage="No product types found." />

                    <FormField control={editForm.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    <ImageFields form={editForm} />
                    
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField control={editForm.control} name="price" render={({ field }) => (
                          <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={editForm.control} name="discountPrice" render={({ field }) => (
                          <FormItem><FormLabel>Discount Price (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="secondary" onClick={() => setEditingProduct(null)}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
          </DialogContent>
       </Dialog>
       
       <AlertDialog open={!!deletingProductId} onOpenChange={(open) => { if (!open) setDeletingProductId(null); }}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the product from your database.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeletingProductId(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
       </AlertDialog>

       {/* Edit Metadata Dialog */}
       <Dialog open={!!editingMetadata} onOpenChange={(open) => { if (!open) setEditingMetadata(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingMetadata?.type}</DialogTitle>
          </DialogHeader>
          <Form {...metadataForm}>
            <form onSubmit={metadataForm.handleSubmit(onEditMetadataSubmit)} className="space-y-4">
              <FormField
                control={metadataForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setEditingMetadata(null)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Metadata Alert */}
      <AlertDialog open={!!deletingMetadata} onOpenChange={(open) => { if (!open) setDeletingMetadata(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingMetadata?.item.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteMetadata} className="bg-destructive hover:bg-destructive/90">
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
