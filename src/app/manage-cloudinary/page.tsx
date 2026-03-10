
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import {
  getAllCloudinaryImages,
  getCloudinaryUsage,
  deleteCloudinaryImage,
  deleteCloudinaryImages,
} from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Trash2, ExternalLink, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type CloudinaryImage = {
  id: string;
  url: string;
  createdAt: string;
  isUsed: boolean;
  bytes: number;
};

type CloudinaryUsage = {
  plan: string;
  usage?: {
    credits?: {
      usage: number;
      limit: number;
    };
    transformations: {
      usage: number;
      limit: number;
    };
    storage: {
      usage: number;
      limit: number;
    };
  };
  credits?: { // For free plan structure
    usage: number;
    limit: number;
  };
  transformations?: any;
  storage?: any;
};

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export default function ManageCloudinaryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [images, setImages] = useState<CloudinaryImage[]>([]);
  const [usage, setUsage] = useState<CloudinaryUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingImage, setDeletingImage] = useState<CloudinaryImage | null>(
    null
  );
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedImages, fetchedUsage] = await Promise.all([
        getAllCloudinaryImages(),
        getCloudinaryUsage(),
      ]);
      setImages(fetchedImages);
      setUsage(fetchedUsage);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
        fetchData();
      }
    }
  }, [user, authLoading, router, toast, fetchData]);

  useEffect(() => {
    setSelectedImages([]);
  }, [activeTab]);

  const handleDelete = async () => {
    if (!deletingImage) return;
    try {
      await deleteCloudinaryImage(deletingImage.id);
      toast({
        title: "Image Deleted",
        description: "The image has been successfully removed from Cloudinary.",
      });
      setImages((prev) => prev.filter((img) => img.id !== deletingImage.id));
      setDeletingImage(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message,
      });
    }
  };
  
  const handleDeleteSelected = async () => {
    if (selectedImages.length === 0) return;
    try {
      await deleteCloudinaryImages(selectedImages);
      toast({
        title: `${selectedImages.length} Images Deleted`,
        description: "The selected images have been removed from Cloudinary.",
      });
      setImages((prev) => prev.filter((img) => !selectedImages.includes(img.id)));
      setSelectedImages([]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Bulk Deletion Failed",
        description: error.message,
      });
    } finally {
        setIsBulkDeleting(false);
    }
  };


  const usedImages = useMemo(() => images.filter((img) => img.isUsed), [
    images,
  ]);
  const unusedImages = useMemo(() => images.filter((img) => !img.isUsed), [
    images,
  ]);

  const toggleSelectImage = (id: string) => {
    setSelectedImages((prev) =>
      prev.includes(id) ? prev.filter((imgId) => imgId !== id) : [...prev, id]
    );
  };
  
  const toggleSelectAllUnused = () => {
    if (selectedImages.length === unusedImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(unusedImages.map((img) => img.id));
    }
  };

  const renderUsageCard = () => {
    if (!usage)
      return (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      );
      
    const usageData = usage.usage || usage;
    const creditsData = usageData.credits;
    const transformationsData = usageData.transformations;
    const storageData = usageData.storage;

    const getPercentage = (used: number, limit: number) =>
      limit > 0 ? (used / limit) * 100 : 0;
    
    const creditsPercent = creditsData ? getPercentage(creditsData.usage, creditsData.limit) : 0;
    const storagePercent = storageData ? getPercentage(storageData.usage, storageData.limit) : 0;
    const transformationsPercent = transformationsData ? getPercentage(transformationsData.usage, transformationsData.limit) : 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Cloudinary Usage</CardTitle>
          <CardDescription>
            Your current plan is:{" "}
            <span className="font-bold capitalize">{usage.plan}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {creditsData && (
            <div>
              <div className="flex justify-between text-sm font-medium">
                <span>Credits</span>
                <span>
                  {creditsData.usage} / {creditsData.limit}
                </span>
              </div>
              <Progress value={creditsPercent} className="mt-1 h-2" />
            </div>
          )}
          {storageData && (
            <div>
              <div className="flex justify-between text-sm font-medium">
                <span>Storage</span>
                <span>
                  {formatBytes(storageData.usage)} /{" "}
                  {formatBytes(storageData.limit)}
                </span>
              </div>
              <Progress value={storagePercent} className="mt-1 h-2" />
            </div>
          )}
          {transformationsData && (
            <div>
              <div className="flex justify-between text-sm font-medium">
                <span>Transformations</span>
                <span>
                  {transformationsData.usage} /{" "}
                  {transformationsData.limit}
                </span>
              </div>
              <Progress value={transformationsPercent} className="mt-1 h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderImageGrid = (
    imageArray: CloudinaryImage[],
    emptyMessage: string,
    isUnusedTab: boolean = false
  ) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <Skeleton className="aspect-square w-full" />
              <CardFooter className="p-2">
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    if (imageArray.length === 0) {
      return (
        <div className="py-16 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {imageArray.map((image) => (
          <Card key={image.id} className="group relative overflow-hidden">
            <div className="aspect-square w-full">
              <Image
                src={image.url}
                alt={image.id}
                fill
                className="object-cover"
              />
            </div>
            <Badge variant="secondary" className="absolute top-2 right-2 z-10">
                {formatBytes(image.bytes)}
            </Badge>
             {isUnusedTab && (
              <Checkbox
                checked={selectedImages.includes(image.id)}
                onCheckedChange={() => toggleSelectImage(image.id)}
                className="absolute left-2 top-2 z-10 h-5 w-5 bg-background"
                aria-label={`Select image ${image.id}`}
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Badge
                variant={image.isUsed ? "default" : "destructive"}
                className={`absolute right-2 top-10 ${isUnusedTab ? 'opacity-0 group-hover:opacity-100' : ''}`}
              >
                {image.isUsed ? "Used" : "Unused"}
              </Badge>
              <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  asChild
                  className="h-8 flex-1"
                >
                  <a href={image.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> View
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 flex-1"
                  onClick={() => setDeletingImage(image)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
            <CardFooter className="p-1 text-xs text-muted-foreground truncate">
                {new Date(image.createdAt).toLocaleString()}
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
          Cloudinary Management
        </h1>
        <p className="mt-2 text-muted-foreground">
          View usage and manage your uploaded images.
        </p>

        <div className="mt-8">
            {renderUsageCard()}
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Images ({images.length})</TabsTrigger>
            <TabsTrigger value="used">Used ({usedImages.length})</TabsTrigger>
            <TabsTrigger value="unused">
              Unused ({unusedImages.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {renderImageGrid(images, "No images found.")}
          </TabsContent>
          <TabsContent value="used" className="mt-4">
            {renderImageGrid(
              usedImages,
              "No images are currently used in products."
            )}
          </TabsContent>
          <TabsContent value="unused" className="mt-4">
            {unusedImages.length > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-md border p-2">
                    <Checkbox
                        id="select-all"
                        checked={selectedImages.length === unusedImages.length && unusedImages.length > 0}
                        onCheckedChange={toggleSelectAllUnused}
                        aria-label="Select all unused images"
                    />
                    <Label htmlFor="select-all" className="font-medium">Select All Unused</Label>
                </div>
            )}
            {renderImageGrid(
              unusedImages,
              "All images are currently in use.",
              true
            )}
          </TabsContent>
        </Tabs>
      </div>

      {activeTab === 'unused' && selectedImages.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 p-4 backdrop-blur-sm border-t">
          <div className="container mx-auto flex items-center justify-between">
            <p className="font-semibold">{selectedImages.length} image(s) selected</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelectedImages([])}>
                <X className="mr-2 h-4 w-4" /> Deselect All
              </Button>
               <AlertDialog open={isBulkDeleting} onOpenChange={setIsBulkDeleting}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedImages.length} images?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the selected images from Cloudinary. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deletingImage}
        onOpenChange={(open) => !open && setDeletingImage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              image from Cloudinary. If it is still linked in a product, it
              will result in a broken image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="relative mx-auto my-4 h-32 w-32">
            {deletingImage && (
              <Image
                src={deletingImage.url}
                alt="Image to be deleted"
                fill
                className="rounded-md object-cover"
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
