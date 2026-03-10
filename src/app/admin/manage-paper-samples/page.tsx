
"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { addPaperSample, getPaperSamples, updatePaperSample, deletePaperSample } from "@/lib/data";
import { uploadImageAction } from "@/app/actions/upload-image-action";
import type { PaperSample } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Upload, Save, X, Pencil, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const paperSampleSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().min(1, "Description is required."),
  imageUrls: z.array(z.string().min(1, "Image URL is required")).min(1, "At least one image is required."),
  primaryImageIndex: z.string().optional(),
});

type FormData = z.infer<typeof paperSampleSchema>;

export default function ManagePaperSamplesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paperSamples, setPaperSamples] = useState<PaperSample[]>([]);
  
  const [editingSample, setEditingSample] = useState<PaperSample | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(paperSampleSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrls: [],
      primaryImageIndex: "0",
    },
  });

  const fetchSamples = async () => {
    setIsLoading(true);
    try {
      const samples = await getPaperSamples();
      setPaperSamples(samples);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch paper samples." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.roles.includes('admin')) {
        toast({ variant: 'destructive', title: 'Access Denied' });
        router.push('/');
      } else {
        fetchSamples();
      }
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    form.reset({
      name: editingSample?.name || "",
      description: editingSample?.description || "",
      imageUrls: editingSample?.imageUrls || [],
      primaryImageIndex: (editingSample?.primaryImageIndex || 0).toString(),
    });
  }, [editingSample, form]);
  
  const handleFormSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      const imageInputs = values.imageUrls || [];
      const uploadedImageUrls: string[] = [];

      for (const imageValue of imageInputs) {
        if (imageValue.startsWith('data:image')) {
          const result = await uploadImageAction(imageValue);
          if (result.success && result.url) {
            uploadedImageUrls.push(result.url);
          } else {
            throw new Error(result.error || 'Image upload failed for one or more images.');
          }
        } else if (imageValue.startsWith('https://')) {
          uploadedImageUrls.push(imageValue);
        }
      }

      const primaryIndex = parseInt(values.primaryImageIndex || "0", 10);
      let finalImageOrder: string[] = [];
      if (uploadedImageUrls.length > 0) {
        if (primaryIndex >= 0 && primaryIndex < uploadedImageUrls.length) {
          const primaryImage = uploadedImageUrls[primaryIndex];
          const otherImages = uploadedImageUrls.filter((_, index) => index !== primaryIndex);
          finalImageOrder = [primaryImage, ...otherImages];
        } else {
          finalImageOrder = uploadedImageUrls;
        }
      }

      const sampleData = {
        name: values.name,
        description: values.description,
        imageUrls: finalImageOrder,
      };

      if (editingSample) {
        await updatePaperSample(editingSample.id, sampleData);
        toast({ title: "Success", description: "Paper sample updated." });
      } else {
        await addPaperSample(sampleData);
        toast({ title: "Success", description: "New paper sample added." });
      }

      fetchSamples();
      setEditingSample(null);
      form.reset({ name: "", description: "", imageUrls: [], primaryImageIndex: "0" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDeleteSample = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deletePaperSample(id);
      toast({ title: "Success", description: "Paper sample deleted." });
      fetchSamples();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Manage Paper Samples</h1>
      <p className="mt-2 text-muted-foreground">Add, edit, and manage paper sample images and descriptions for the Xerox page.</p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{editingSample ? "Edit Paper Sample" : "Add New Paper Sample"}</CardTitle>
            </CardHeader>
            <CardContent>
              <PaperSampleForm
                form={form}
                isSubmitting={isSubmitting}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setEditingSample(null);
                  form.reset({ name: "", description: "", imageUrls: [], primaryImageIndex: "0" });
                }}
                isEditing={!!editingSample}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Existing Paper Samples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p>Loading...</p>
              ) : paperSamples.length === 0 ? (
                <p className="text-muted-foreground">No paper samples have been added yet.</p>
              ) : (
                paperSamples.map(sample => (
                  <Card key={sample.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{sample.name}</h4>
                        <p className="text-sm text-muted-foreground">{sample.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingSample(sample)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete "{sample.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteSample(sample.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <Carousel className="w-full max-w-sm mt-2">
                      <CarouselContent>
                        {sample.imageUrls.map((url, i) => (
                          <CarouselItem key={i}>
                            <div className="relative aspect-video w-full">
                              <Image src={url} alt={`${sample.name} image ${i+1}`} fill className="object-contain rounded-md" />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PaperSampleForm({ form, onSubmit, isSubmitting, onCancel, isEditing }: {
  form: ReturnType<typeof useForm<FormData>>;
  onSubmit: (values: FormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "imageUrls"
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    form.clearErrors("imageUrls");

    try {
        for (const file of Array.from(files)) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                toast({ variant: 'destructive', title: 'File too large', description: 'Please select an image smaller than 4MB.'});
                continue;
            }
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            append(dataUrl);
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "File Read Failed",
            description: error.message,
        });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sample Name</FormLabel>
              <FormControl><Input {...field} placeholder="e.g., Glossy Photo Paper" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Textarea {...field} placeholder="A short description of the paper sample." /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <FormLabel>Images</FormLabel>
          <FormField
            control={form.control}
            name="primaryImageIndex"
            render={({ field }) => (
              <FormItem>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="mt-2 space-y-2"
                >
                  {fields.map((fieldItem, index) => (
                    <div key={fieldItem.id} className="flex items-center gap-2 p-2 border rounded-md">
                      <FormControl>
                        <RadioGroupItem value={index.toString()} id={`image-radio-${index}`} />
                      </FormControl>
                      <FormLabel htmlFor={`image-radio-${index}`} className="flex-grow flex items-center gap-2 cursor-pointer">
                        <div className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center bg-muted rounded-md">
                          {fieldItem.value ? (
                            <Image src={fieldItem.value} alt={`Sample image ${index + 1}`} fill className="object-cover rounded-md" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-xs truncate">{`Image ${index + 1}`}</span>
                      </FormLabel>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </RadioGroup>
                <FormMessage>{form.formState.errors.imageUrls?.message || form.formState.errors.imageUrls?.root?.message}</FormMessage>
              </FormItem>
            )}
          />

          <Input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            multiple
            accept="image/*"
            onChange={handleImageFileSelect}
            disabled={isUploading}
          />
          <Button type="button" variant="outline" className="w-full mt-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
            Upload Images
          </Button>
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <Button type="button" variant="secondary" className="w-full" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditing ? "Save Changes" : "Add Sample"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
