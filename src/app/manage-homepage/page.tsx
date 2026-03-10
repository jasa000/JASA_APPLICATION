

"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { getHomepageContent, updateHomepageContent, categories as defaultCategories } from "@/lib/data";
import { uploadImageAction } from "@/app/actions/upload-image-action";
import type { HomepageContent, Category, Banner } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, ArrowUp, ArrowDown, Upload, Save, X, Pencil, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MAX_BANNERS = 10;
const TITLE_MAX_LENGTH = 40;
const CTA_MAX_LENGTH = 25;

const bannerSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required.").max(TITLE_MAX_LENGTH),
  cta: z.string().min(1, "CTA is required.").max(CTA_MAX_LENGTH),
  href: z.string().min(1, "Link is required."),
  imageUrl: z.string().min(1, "Image is required."),
  isVisible: z.boolean(),
});

type FormData = z.infer<typeof bannerSchema>;

const bannerLinkOptions = [
    { value: '/stationary', label: 'Stationary' },
    { value: '/books', label: 'Books' },
    { value: '/xerox', label: 'Xerox' },
    { value: '/electronics', label: 'Electronic Kit' },
];

export default function ManageHomepagePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homepageContent, setHomepageContent] = useState<HomepageContent | null>(null);
  
  // State for image previews before upload
  const [welcomeImagePreview, setWelcomeImagePreview] = useState<string | null>(null);
  const [categoryPreviews, setCategoryPreviews] = useState<{[key: string]: string | null}>({});
  const [uploadProgress, setUploadProgress] = useState(0);

  const welcomeFileInputRef = useRef<HTMLInputElement | null>(null);
  const categoryFileInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  
  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.roles.includes('admin')) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to view this page.' });
        router.push('/');
      } else {
        fetchContent();
      }
    }
  }, [user, authLoading, router, toast]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const content = await getHomepageContent();
      // Set default visibility if not present
      const defaultContent = {
        isWelcomeVisible: content?.isWelcomeVisible ?? true,
        categoryImages: content?.categoryImages || {},
        banners: (content?.banners || []).map(b => ({ ...b, isVisible: b.isVisible ?? true })),
        welcomeImageUrl: content?.welcomeImageUrl || ''
      };
      setHomepageContent(defaultContent);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch homepage content." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWelcomeVisibility = async (isVisible: boolean) => {
    if (!homepageContent) return;
    setIsSubmitting(true);
    try {
      const newContent = { ...homepageContent, isWelcomeVisible: isVisible };
      await updateHomepageContent(newContent);
      setHomepageContent(newContent);
      toast({ title: "Success", description: `Welcome card is now ${isVisible ? 'visible' : 'hidden'}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: `Failed to update visibility: ${e.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFileSelect = (file: File, type: 'welcome' | string) => {
    if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({ variant: 'destructive', title: 'File too large', description: 'Please select an image smaller than 4MB.'});
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        if (type === 'welcome') {
            setWelcomeImagePreview(reader.result as string);
        } else {
            setCategoryPreviews(prev => ({ ...prev, [type]: reader.result as string }));
        }
    };
    reader.readAsDataURL(file);
  }

  const handleSaveImage = async (type: 'welcome' | keyof HomepageContent['categoryImages']) => {
    const isWelcome = type === 'welcome';
    const previewUrl = isWelcome ? welcomeImagePreview : categoryPreviews[type];

    if (!previewUrl || !homepageContent) return;

    setIsSubmitting(true);
    setUploadProgress(0);
    
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
    }, 200);

    try {
      const uploadResult = await uploadImageAction(previewUrl);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadResult.success && uploadResult.url) {
        let newHomepageContent: HomepageContent;
        if (isWelcome) {
            newHomepageContent = { ...homepageContent, welcomeImageUrl: uploadResult.url };
        } else {
            const newCategoryImages = { ...homepageContent.categoryImages, [type]: uploadResult.url };
            newHomepageContent = { ...homepageContent, categoryImages: newCategoryImages };
        }
        
        await updateHomepageContent(newHomepageContent);
        setHomepageContent(newHomepageContent);
        if (isWelcome) {
            setWelcomeImagePreview(null);
        } else {
            setCategoryPreviews(prev => ({...prev, [type]: null}));
        }
        toast({ title: "Success", description: "Image updated successfully." });
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (e: any) {
      clearInterval(progressInterval);
      toast({ variant: "destructive", title: "Error", description: `Failed to upload image: ${e.message}` });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }

  const handleDeleteImage = async (type: 'welcome' | keyof HomepageContent['categoryImages']) => {
      if (homepageContent) {
          setIsSubmitting(true);
          let newHomepageContent: HomepageContent;
          if (type === 'welcome') {
            newHomepageContent = { ...homepageContent, welcomeImageUrl: '' };
          } else {
            const newCategoryImages = { ...homepageContent.categoryImages, [type]: '' };
            newHomepageContent = { ...homepageContent, categoryImages: newCategoryImages };
          }
          
          try {
            await updateHomepageContent(newHomepageContent);
            setHomepageContent(newHomepageContent);
            toast({ title: "Success", description: "Image removed." });
          } catch(e: any) {
             toast({ variant: "destructive", title: "Error", description: `Failed to delete image: ${e.message}` });
          } finally {
            setIsSubmitting(false);
          }
      }
  };


  const handleBannerUpdate = async (index: number, updatedBanner: Banner) => {
      if (homepageContent) {
          setIsSubmitting(true);
          try {
            // Check if image needs uploading
            let finalImageUrl = updatedBanner.imageUrl;
            if (finalImageUrl.startsWith('data:image')) {
                const uploadResult = await uploadImageAction(finalImageUrl);
                if (uploadResult.success && uploadResult.url) {
                    finalImageUrl = uploadResult.url;
                } else {
                    throw new Error(uploadResult.error || 'Banner image upload failed.');
                }
            }

            const newBanners = [...homepageContent.banners];
            newBanners[index] = {...updatedBanner, imageUrl: finalImageUrl};
            
            const newHomepageContent = { ...homepageContent, banners: newBanners };
            await updateHomepageContent(newHomepageContent);
            setHomepageContent(newHomepageContent);
            toast({ title: "Success", description: "Banner updated." });
            return true; // Indicate success to form
          } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: `Failed to update banner: ${e.message}` });
            return false; // Indicate failure
          } finally {
            setIsSubmitting(false);
          }
      }
      return false;
  };
  
  const handleAddBanner = async () => {
      if (homepageContent && homepageContent.banners.length < MAX_BANNERS) {
        const newBanner: Banner = {
            id: `banner-${Date.now()}`,
            title: 'New Banner',
            cta: 'Shop Now',
            href: '/stationary', // Use a valid default href
            imageUrl: '',
            isVisible: true,
        };
        const newBanners = [...homepageContent.banners, newBanner];
        const newHomepageContent = { ...homepageContent, banners: newBanners };
        setIsSubmitting(true);
        try {
            await updateHomepageContent(newHomepageContent);
            setHomepageContent(newHomepageContent);
            toast({ title: "Success", description: "New banner added. Please edit it and save." });
        } catch(e: any) {
             toast({ variant: "destructive", title: "Error", description: `Failed to add banner: ${e.message}` });
        } finally {
            setIsSubmitting(false);
        }
      }
  };

  const handleMoveBanner = async (from: number, to: number) => {
      if (homepageContent) {
          const newBanners = [...homepageContent.banners];
          const [movedItem] = newBanners.splice(from, 1);
          newBanners.splice(to, 0, movedItem);
          const newHomepageContent = { ...homepageContent, banners: newBanners };
          setIsSubmitting(true);
          try {
              await updateHomepageContent(newHomepageContent);
              setHomepageContent(newHomepageContent);
              toast({ title: "Success", description: "Banner order updated." });
          } catch(e: any) {
              toast({ variant: "destructive", title: "Error", description: `Failed to reorder banners: ${e.message}` });
          } finally {
              setIsSubmitting(false);
          }
      }
  };
  
  const handleDeleteBanner = async (index: number) => {
      if (homepageContent) {
          const newBanners = homepageContent.banners.filter((_, i) => i !== index);
          const newHomepageContent = { ...homepageContent, banners: newBanners };
          setIsSubmitting(true);
          try {
              await updateHomepageContent(newHomepageContent);
              setHomepageContent(newHomepageContent);
              toast({ title: "Success", description: "Banner deleted." });
          } catch(e: any) {
              toast({ variant: "destructive", title: "Error", description: `Failed to delete banner: ${e.message}` });
          } finally {
              setIsSubmitting(false);
          }
      }
  };

   const handleToggleBannerVisibility = async (index: number, isVisible: boolean) => {
    if (!homepageContent) return;

    // Rule: At least one banner must be visible
    const visibleBannersCount = homepageContent.banners.filter(b => b.isVisible).length;
    if (visibleBannersCount === 1 && !isVisible) {
      toast({
        variant: 'destructive',
        title: 'Action Denied',
        description: 'At least one banner must be visible.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newBanners = [...homepageContent.banners];
      newBanners[index].isVisible = isVisible;
      const newHomepageContent = { ...homepageContent, banners: newBanners };

      await updateHomepageContent(newHomepageContent);
      setHomepageContent(newHomepageContent);
      toast({ title: 'Success', description: `Banner is now ${isVisible ? 'visible' : 'hidden'}.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update visibility: ${e.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }
  
  const BannerCardForm = ({ banner, index }: { banner: Banner, index: number }) => {
    const form = useForm<FormData>({
      resolver: zodResolver(bannerSchema),
      defaultValues: banner,
    });
    const bannerFileInputRef = useRef<HTMLInputElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    useEffect(() => {
        form.reset(banner);
        setIsEditing(banner.imageUrl === '');
    }, [banner, form]);
    
    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
              form.setValue('imageUrl', reader.result as string, { shouldValidate: true, shouldDirty: true });
          };
          reader.readAsDataURL(file);
      }
    };

    const onBannerSubmit = async (data: FormData) => {
        const success = await handleBannerUpdate(index, data);
        if (success) {
            setIsEditing(false);
            form.reset(data); // Resets dirty state
        }
    }
    
    const titleCharCount = `${form.watch(`title`)?.length || 0} / ${TITLE_MAX_LENGTH}`;
    const ctaCharCount = `${form.watch(`cta`)?.length || 0} / ${CTA_MAX_LENGTH}`;
    const imageUrl = form.watch('imageUrl');

    return (
        <Card className="p-4 relative">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onBannerSubmit)}>
                <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-4">
                        <h4 className="font-bold">Banner {index + 1}</h4>
                        <div className="flex items-center space-x-2">
                           <Switch
                                id={`visibility-switch-${index}`}
                                checked={banner.isVisible}
                                onCheckedChange={(checked) => handleToggleBannerVisibility(index, checked)}
                                disabled={isSubmitting}
                            />
                            <Label htmlFor={`visibility-switch-${index}`} className="flex items-center gap-1 text-sm">
                                {banner.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                {banner.isVisible ? 'Visible' : 'Hidden'}
                            </Label>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" disabled={isSubmitting || index === 0} onClick={() => handleMoveBanner(index, index - 1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" disabled={isSubmitting || index === (homepageContent?.banners.length ?? 0) - 1} onClick={() => handleMoveBanner(index, index + 1)}><ArrowDown className="h-4 w-4" /></Button>
                        {!isEditing && <Button type="button" variant="secondary" size="icon" disabled={isSubmitting} onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4" /></Button>}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" size="icon" disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Banner?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently remove this banner. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteBanner(index)}>Delete Banner</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name={`title`}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between">
                                        <FormLabel>Title</FormLabel>
                                        <span className="text-xs text-muted-foreground">{titleCharCount}</span>
                                    </div>
                                    <FormControl><Input {...field} maxLength={TITLE_MAX_LENGTH} disabled={!isEditing || isSubmitting} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`cta`}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between">
                                        <FormLabel>Call to Action Text</FormLabel>
                                        <span className="text-xs text-muted-foreground">{ctaCharCount}</span>
                                    </div>
                                    <FormControl><Input {...field} maxLength={CTA_MAX_LENGTH} disabled={!isEditing || isSubmitting} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`href`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link URL</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing || isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a page to link to" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {bannerLinkOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div>
                        <FormLabel>Banner Image</FormLabel>
                        <div className="mt-2 aspect-video w-full relative border rounded-md overflow-hidden flex items-center justify-center bg-muted">
                            {imageUrl ? <Image src={imageUrl} alt={`Banner ${index + 1}`} fill className="object-cover" /> : <span className="text-muted-foreground">No Image</span>}
                        </div>
                        <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={bannerFileInputRef}
                            onChange={handleBannerFileChange}
                            disabled={!isEditing || isSubmitting}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-2 w-full"
                            onClick={() => bannerFileInputRef.current?.click()}
                            disabled={!isEditing || isSubmitting}
                        >
                            <Upload className="mr-2 h-4 w-4" /> Change Image
                        </Button>
                        <FormField control={form.control} name={`imageUrl`} render={({ field }) => <FormMessage {...field} />} />
                    </div>
                </div>
                {isEditing && (
                    <div className="flex gap-2 mt-4">
                        <Button type="button" variant="secondary" className="w-full" onClick={() => { setIsEditing(false); form.reset(banner); }}>Cancel</Button>
                        <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isDirty}>
                          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Banner"}
                        </Button>
                    </div>
                )}
            </form>
            </Form>
        </Card>
    )
  }

  const renderWelcomeImageUploader = () => {
    const isVisible = homepageContent?.isWelcomeVisible ?? true;
    const currentImage = homepageContent?.welcomeImageUrl;
    const previewImage = welcomeImagePreview;
    const displayImage = previewImage || currentImage;

    return (
      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Welcome Card Background</CardTitle>
                    <CardDescription>Update the main background image for the welcome card. If no image is set, a gradient will be shown.</CardDescription>
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch
                        id="welcome-visibility-switch"
                        checked={isVisible}
                        onCheckedChange={handleToggleWelcomeVisibility}
                        disabled={isSubmitting}
                    />
                    <Label htmlFor="welcome-visibility-switch" className="flex items-center gap-1 text-sm">
                        {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        {isVisible ? 'Visible' : 'Hidden'}
                    </Label>
                </div>
           </div>
        </CardHeader>
        <CardContent>
          <div className="aspect-video w-full max-w-sm mx-auto relative border rounded-md overflow-hidden flex items-center justify-center bg-muted">
            {displayImage ? <Image src={displayImage} alt="Welcome card background" fill className="object-cover" /> : <span className="text-muted-foreground font-bold text-2xl">JASA</span>}
          </div>
          <Input type="file" accept="image/*" className="hidden" ref={welcomeFileInputRef} onChange={(e) => e.target.files && handleFileSelect(e.target.files[0], 'welcome')} disabled={isSubmitting}/>
          
          {previewImage ? (
            <div className="mt-4 space-y-2 max-w-sm mx-auto">
                {isSubmitting && uploadProgress > 0 && <Progress value={uploadProgress} />}
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="flex-1" onClick={() => setWelcomeImagePreview(null)} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4"/> Cancel
                    </Button>
                    <Button type="button" className="flex-1" onClick={() => handleSaveImage('welcome')} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Save
                    </Button>
                </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2 max-w-sm mx-auto">
                <Button type="button" variant="outline" className="flex-1" onClick={() => welcomeFileInputRef.current?.click()} disabled={isSubmitting}>
                    <Upload className="mr-2 h-4 w-4" /> {currentImage ? 'Change Image' : 'Upload Image'}
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" className="h-10 w-10 p-0" disabled={!currentImage || isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove the background image for the welcome card.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteImage('welcome')}>
                            Confirm Delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Manage Homepage</h1>
      <p className="mt-2 text-muted-foreground">Update welcome card, category images, and promotional banners.</p>
      
      <div className="mt-8 space-y-8">
          {renderWelcomeImageUploader()}

          <Card>
              <CardHeader>
                  <CardTitle>Category Images</CardTitle>
                  <CardDescription>Update the images for the main service categories. Changes are saved individually.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {defaultCategories.map(cat => {
                      const categoryKey = cat.href.replace('/', '') as keyof HomepageContent['categoryImages'];
                      const currentImage = homepageContent?.categoryImages?.[categoryKey];
                      const previewImage = categoryPreviews[categoryKey];
                      const displayImage = previewImage || currentImage;

                      return (
                          <div key={cat.id}>
                              <label className="text-sm font-medium leading-none">{cat.name}</label>
                              <div className="mt-2 aspect-square w-full relative border rounded-md overflow-hidden flex items-center justify-center bg-muted">
                                  {displayImage ? <Image src={displayImage} alt={cat.name} fill className="object-cover" /> : <span className="text-muted-foreground font-bold text-2xl">JASA</span>}
                              </div>
                              <Input type="file" accept="image/*" className="hidden" ref={ref => categoryFileInputRefs.current[categoryKey] = ref} onChange={(e) => e.target.files && handleFileSelect(e.target.files[0], categoryKey)} disabled={isSubmitting}/>
                              
                              {previewImage ? (
                                <div className="mt-2 space-y-2">
                                    {isSubmitting && uploadProgress > 0 && <Progress value={uploadProgress} />}
                                    <div className="flex gap-2">
                                        <Button type="button" variant="secondary" className="flex-1" onClick={() => setCategoryPreviews(prev => ({...prev, [categoryKey]: null}))} disabled={isSubmitting}>
                                            <X className="mr-2 h-4 w-4"/> Cancel
                                        </Button>
                                        <Button type="button" className="flex-1" onClick={() => handleSaveImage(categoryKey)} disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                            Save
                                        </Button>
                                    </div>
                                </div>
                              ) : (
                                <div className="mt-2 flex gap-2">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => categoryFileInputRefs.current[categoryKey]?.click()} disabled={isSubmitting}>
                                        <Upload className="mr-2 h-4 w-4" /> {currentImage ? 'Change' : 'Upload'}
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button type="button" variant="destructive" className="h-10 w-10 p-0" disabled={!currentImage || isSubmitting}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will remove the image for the {cat.name} category.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteImage(categoryKey)}>
                                                Confirm Delete
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                              )}
                          </div>
                      )
                  })}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Promotional Banners</CardTitle>
                  <CardDescription>Manage the rotating banners on the homepage. You can have up to {MAX_BANNERS} banners.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  {homepageContent?.banners.map((banner, index) => (
                      <BannerCardForm key={banner.id || index} banner={banner} index={index} />
                  ))}
                  {homepageContent && homepageContent.banners.length < MAX_BANNERS && (
                      <Button type="button" variant="outline" onClick={handleAddBanner} disabled={isSubmitting}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Banner
                      </Button>
                  )}
              </CardContent>
          </Card>
      </div>
    </div>
  );
}

    
