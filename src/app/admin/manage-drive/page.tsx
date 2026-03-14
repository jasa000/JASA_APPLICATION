
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { 
    getDriveUsageAction, 
    getDriveFilesAction, 
    deleteDriveFileAction,
    deleteDriveFilesAction
} from "@/app/actions/drive-actions";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ExternalLink, Database, AlertCircle, X, RefreshCw, FileText, Image as ImageIcon, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type DocumentFile = {
  id: string;
  name: string;
  size: string;
  createdTime: string;
  webViewLink: string;
  orderStatus: 'Active' | 'Delivered' | 'Cancelled/Rejected' | 'Unused';
  resourceType: string;
};

type StorageUsage = {
  limit: number;
  usage: number;
};

export default function ManageDocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState<DocumentFile | null>(null);
  
  const [activeTab, setActiveTab] = useState("active");
  const [unusedFilter, setUnusedFilter] = useState<'unused' | 'delivered' | 'cancelled'>('unused');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedUsage, filesResult] = await Promise.all([
        getDriveUsageAction(),
        getDriveFilesAction(),
      ]);

      if (filesResult.error) {
        throw new Error(filesResult.error);
      }
      
      setUsage(fetchedUsage);
      setFiles(filesResult.files);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to fetch data: ${error.message}`,
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
    setSelectedFiles([]);
  }, [activeTab, unusedFilter]);


  const handleDelete = async () => {
    if (!deletingFile) return;
    try {
      await deleteDriveFileAction(deletingFile.id);
      toast({
        title: "File Deleted",
        description: `"${deletingFile.name}" removed.`,
      });
      fetchData();
      setDeletingFile(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message,
      });
    }
  };
  
   const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await deleteDriveFilesAction(selectedFiles);
      toast({
        title: "Files Deleted",
        description: `${selectedFiles.length} file(s) have been removed.`,
      });
      fetchData();
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


  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };
  
  const activeFiles = useMemo(() => files.filter(f => f.orderStatus === 'Active'), [files]);
  
  const unusedArchivedFiles = useMemo(() => {
    switch (unusedFilter) {
      case 'delivered':
        return files.filter(f => f.orderStatus === 'Delivered');
      case 'cancelled':
        return files.filter(f => f.orderStatus === 'Cancelled/Rejected');
      case 'unused':
      default:
        return files.filter(f => f.orderStatus === 'Unused');
    }
  }, [files, unusedFilter]);


  const renderUsageCard = () => {
    if (isLoading || !usage || usage.limit === 0) {
      return (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      );
    }

    const usagePercent = (usage.usage / usage.limit) * 100;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="text-blue-500" /> Supabase Storage (Xerox)
          </CardTitle>
          <CardDescription>
            Current storage usage for Xerox documents. Images are managed in Cloudinary.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div>
              <div className="flex justify-between text-sm font-medium">
                <span>Used</span>
                <span>
                  {formatBytes(usage.usage)} / {formatBytes(usage.limit)}
                </span>
              </div>
              <Progress value={usagePercent} className="mt-1 h-2" />
            </div>
        </CardContent>
      </Card>
    );
  };
  
  const renderStatusBadge = (status: DocumentFile['orderStatus']) => {
    switch (status) {
        case 'Active':
            return <Badge variant="default">Active Order</Badge>;
        case 'Delivered':
            return <Badge variant="secondary">Delivered</Badge>;
        case 'Cancelled/Rejected':
            return <Badge variant="destructive">Cancelled/Rejected</Badge>;
        case 'Unused':
            return <Badge variant="outline">Unused (No Link)</Badge>;
        default:
            return <Badge variant="outline">Unknown</Badge>;
    }
};

  const renderFilesTable = (fileList: DocumentFile[], showCheckbox: boolean = false) => {
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedFiles(fileList.map(f => f.id));
        } else {
            setSelectedFiles([]);
        }
    };
    const allSelected = showCheckbox && fileList.length > 0 && selectedFiles.length === fileList.length;

    if (isLoading) {
       return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
       )
    }
    if(fileList.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>No documents found for this filter.</p>
            </div>
        )
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {showCheckbox && (
                <TableHead className="w-[40px]">
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                    />
                </TableHead>
            )}
            <TableHead>File Name</TableHead>
            <TableHead>Order Status</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fileList.map((file) => (
            <TableRow key={file.id} data-state={selectedFiles.includes(file.id) && "selected"}>
              {showCheckbox && (
                  <TableCell>
                      <Checkbox
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={() => {
                              setSelectedFiles(prev => 
                                prev.includes(file.id)
                                    ? prev.filter(id => id !== file.id)
                                    : [...prev, file.id]
                              );
                          }}
                          aria-label={`Select file ${file.name}`}
                      />
                  </TableCell>
              )}
              <TableCell className="font-medium">
                  <div className="flex items-center gap-2 max-w-sm">
                      {file.resourceType === 'raw' ? <FileText className="h-4 w-4 text-blue-500" /> : <ImageIcon className="h-4 w-4 text-green-500" />}
                      <span className="truncate">{file.name}</span>
                  </div>
              </TableCell>
              <TableCell>{renderStatusBadge(file.orderStatus)}</TableCell>
              <TableCell className="whitespace-nowrap">{file.size}</TableCell>
              <TableCell className="whitespace-nowrap text-xs">{new Date(file.createdTime).toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" asChild title="View File">
                    <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => setDeletingFile(file)} title="Delete File">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-8 pb-40">
      <div className="flex items-center justify-between">
          <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
          Manage Xerox Documents
          </h1>
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Refresh
          </Button>
      </div>
      <p className="mt-2 text-muted-foreground">
        Monitor Supabase storage and clean up uploaded Xerox documents once orders are completed.
      </p>

      <div className="my-8">
          {renderUsageCard()}
      </div>

      <Card>
          <CardHeader>
              <CardTitle>Supabase File Explorer</CardTitle>
              <CardDescription>
              Xerox files are linked to Firestore orders to help you identify which ones are safe to delete.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">Required for Active Orders ({activeFiles.length})</TabsTrigger>
                  <TabsTrigger value="archived">Cleanup / History</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4">
                    <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary flex items-center gap-2">
                      <Info className="h-4 w-4"/>
                      <p>These files are needed for Xerox orders currently in progress. Do not delete them.</p>
                    </div>
                    {renderFilesTable(activeFiles)}
                </TabsContent>
                <TabsContent value="archived" className="mt-4">
                  <div className="p-4 rounded-lg border bg-muted/50 mb-4">
                      <Label className="font-semibold text-base sm:text-lg">Filter by status:</Label>
                      <RadioGroup value={unusedFilter} onValueChange={(v) => setUnusedFilter(v as any)} className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="unused" id="r-unused" />
                              <Label htmlFor="r-unused" className="text-sm sm:text-base">Unused (No Link)</Label>
                          </div>
                           <div className="flex items-center space-x-2">
                              <RadioGroupItem value="delivered" id="r-delivered" />
                              <Label htmlFor="r-delivered" className="text-sm sm:text-base">Delivered</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cancelled" id="r-cancelled" />
                              <Label htmlFor="r-cancelled" className="text-sm sm:text-base">Cancelled/Rejected</Label>
                          </div>
                      </RadioGroup>
                  </div>
                  <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4"/>
                      <p>Files in this tab are from completed, cancelled, or orphaned uploads. They are safe to delete.</p>
                  </div>
                  {renderFilesTable(unusedArchivedFiles, true)}
                </TabsContent>
              </Tabs>
          </CardContent>
      </Card>

      {activeTab === 'archived' && selectedFiles.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-background/90 p-4 backdrop-blur-sm border-t lg:left-[var(--sidebar-width)] transition-[left] duration-200">
          <div className="container mx-auto flex items-center justify-between">
            <p className="font-semibold">{selectedFiles.length} file(s) selected</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelectedFiles([])}>
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
                    <AlertDialogTitle>Permanently delete {selectedFiles.length} files?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the selected documents from storage forever. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSelected}>Delete Permanently</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={!!deletingFile}
        onOpenChange={(open) => !open && setDeletingFile(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingFile?.name}" from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
