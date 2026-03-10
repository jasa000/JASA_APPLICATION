
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { getXeroxServices, getXeroxOptions, getPaperSamples, getOrderSettings } from "@/lib/data";
import type { XeroxService, XeroxOption, PaperSample, OrderSettings, XeroxDocument as StoredXeroxJob, StoredXeroxJob as _StoredXeroxJob, DeliveryChargeRule } from "@/lib/types";
import { HARDCODED_XEROX_OPTIONS } from "@/lib/xerox-options";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, FileUp, XCircle, FileText, ShoppingCart, Plus, Minus, Pencil, ListOrdered, Images, Link as LinkIcon, CheckCircle, RefreshCw, Trash2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger
} from "@/components/ui/dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHeader,
  TableHead
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/auth-provider";


type DocumentState = {
  id: number;
  file: File;
  fileDetails: { name: string; type: string; pages?: number; url?: string; } | null;
  selectedPaperType: string;
  currentPaperDetails: XeroxOption | null;
  selectedColorOption: string;
  selectedFormatType: string;
  selectedPrintRatio: string;
  selectedBindingType: string;
  selectedLaminationType: string;
  quantity: number;
  message: string;
};

type UploadStatus = {
    status: 'pending' | 'uploading' | 'success' | 'error' | 'skipped';
    progress: number;
    url?: string | null; // Allow null for manual collection
    error?: string;
};


const MAX_WORDS = 100;

type DocumentPriceDetails = {
    id: number;
    pricePerPage: number;
    bindingCost: number;
    laminationCost: number;
    finalPrice: number;
};

const getDeliveryCharge = (rules: DeliveryChargeRule[], subtotal: number): { charge: number; nextTierInfo: string | null } => {
    if (!rules || rules.length === 0) return { charge: 0, nextTierInfo: null };

    // Sort rules by the 'from' value
    const sortedRules = [...rules].sort((a, b) => a.from - b.from);

    for (const rule of sortedRules) {
        const to = rule.to ?? Infinity;
        if (subtotal >= rule.from && subtotal <= to) {
            let nextTierInfo: string | null = null;
            const nextRule = sortedRules.find(r => r.from > subtotal && r.charge < rule.charge);
            if (nextRule) {
                const amountNeeded = nextRule.from - subtotal;
                if(nextRule.charge === 0) {
                     nextTierInfo = `Add items worth Rs ${amountNeeded.toFixed(2)} more for FREE delivery.`;
                } else {
                    nextTierInfo = `Add items worth Rs ${amountNeeded.toFixed(2)} more for a delivery charge of Rs ${nextRule.charge.toFixed(2)}.`;
                }
            }
            return { charge: rule.charge, nextTierInfo };
        }
    }
    return { charge: 0, nextTierInfo: null }; // Default if no rule matches
};


const DocumentCard = ({ document, index, removeDocument, updateDocumentState, paperTypes, allOptions, documentPrices, isLoading }: { 
    document: DocumentState, 
    index: number, 
    removeDocument: (id: number) => void, 
    updateDocumentState: (id: number, updates: Partial<DocumentState>) => void,
    paperTypes: XeroxOption[],
    allOptions: { bindingTypes: XeroxOption[], laminationTypes: XeroxOption[] },
    documentPrices: DocumentPriceDetails[],
    isLoading: boolean
}) => {
    const priceDetails = documentPrices.find(p => p.id === document.id);
    const pageCount = document.fileDetails?.pages ?? 0;
    
    const renderOptionSelect = (
        id: string, label: string, selectedValue: string | undefined,
        onValueChange: (value: string) => void,
        optionIds: string[] | undefined, allOptionList: { id: string, name: string, price?: number }[],
        includeNone: boolean = false,
        disabled: boolean = false
    ) => {
        if (!optionIds || optionIds.length === 0) return null;
        
        const availableOptions = allOptionList.filter(opt => optionIds.includes(opt.id));
        if (availableOptions.length === 0 && !includeNone) return null;

        return (
            <div className="flex flex-col">
                <Label htmlFor={id} className="text-xs mb-1">{label}</Label>
                <Select value={selectedValue} onValueChange={onValueChange} disabled={isLoading || disabled}>
                    <SelectTrigger id={id}><SelectValue placeholder={`Select ${label.toLowerCase()}...`} /></SelectTrigger>
                    <SelectContent>
                        {includeNone && <SelectItem value="none">No {label}</SelectItem>}
                        {availableOptions.map(opt => (
                            <SelectItem key={opt.id} value={opt.id}>
                                {opt.name} {opt.price ? `(Rs ${opt.price.toFixed(2)})` : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }
    
     const availableFormatTypes = pageCount > 1
        ? HARDCODED_XEROX_OPTIONS.formatTypes
        : HARDCODED_XEROX_OPTIONS.formatTypes.filter(ft => ft.id === 'front');

    return (
        <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 to-white dark:from-sky-900/50 dark:to-black z-0"></div>
            <div className="relative z-10">
                <CardHeader className="p-4 flex flex-row justify-between items-center bg-transparent">
                     <p className="font-semibold truncate">Document {index + 1}</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                            <Trash2 className="h-5 w-5 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the document "{document.fileDetails?.name}" from your list. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeDocument(document.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </CardHeader>
    
                <CardContent className="p-4 space-y-4">
                    <div className="p-2 border rounded-md w-full overflow-x-auto no-scrollbar bg-background/50">
                        <p className="text-sm font-medium whitespace-nowrap">{document.fileDetails?.name || "Processing..."}</p>
                    </div>

                    <div className="p-2 border rounded-md bg-background/50">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Document Type</p>
                                <p className="text-sm font-medium uppercase truncate">{document.fileDetails?.type.split('/')[1] || 'N/A'}</p>
                            </div>
                             <div>
                                <p className="text-xs text-muted-foreground">No. of Pages</p>
                                {document.fileDetails?.pages === undefined ? <Loader2 className="h-5 w-5 animate-spin"/> : <p className="text-sm font-medium">{document.fileDetails.pages}</p>}
                            </div>
                        </div>
                    </div>
    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <Label className="text-xs mb-1">Paper Type</Label>
                            <Select value={document.selectedPaperType} onValueChange={(v) => updateDocumentState(document.id, {selectedPaperType: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {paperTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex flex-col">
                            <Label className="text-xs mb-1">Quantity</Label>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => updateDocumentState(document.id, { quantity: Math.max(1, document.quantity - 1) })}> <Minus className="h-4 w-4" /> </Button>
                                <Input type="number" min="1" value={document.quantity} onChange={(e) => updateDocumentState(document.id, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })} className="h-9 w-14 text-center" />
                                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => updateDocumentState(document.id, { quantity: document.quantity + 1 })}> <Plus className="h-4 w-4" /> </Button>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {renderOptionSelect(`color-option-${document.id}`, 'Color', document.selectedColorOption, value => updateDocumentState(document.id, { selectedColorOption: value }), document.currentPaperDetails?.colorOptionIds, HARDCODED_XEROX_OPTIONS.colorOptions)}
                      {renderOptionSelect(`format-type-${document.id}`, 'Format', document.selectedFormatType, value => updateDocumentState(document.id, { selectedFormatType: value }), document.currentPaperDetails?.formatTypeIds, availableFormatTypes)}
                      {renderOptionSelect(`print-ratio-${document.id}`, 'Print Ratio', document.selectedPrintRatio, value => updateDocumentState(document.id, { selectedPrintRatio: value }), document.currentPaperDetails?.printRatioIds, HARDCODED_XEROX_OPTIONS.printRatios)}
                      {renderOptionSelect(`binding-type-${document.id}`, 'Binding', document.selectedBindingType, value => updateDocumentState(document.id, { selectedBindingType: value }), document.currentPaperDetails?.bindingTypeIds, allOptions.bindingTypes, true)}
                      {renderOptionSelect(`lamination-type-${document.id}`, 'Lamination', document.selectedLaminationType, value => updateDocumentState(document.id, { selectedLaminationType: value }), document.currentPaperDetails?.laminationTypeIds, allOptions.laminationTypes, true)}
                    </div>

                     <div>
                        <Label htmlFor={`message-${document.id}`} className="text-xs">Special Instructions (Optional)</Label>
                        <Textarea 
                            id={`message-${document.id}`} 
                            placeholder="e.g., 'Please use a thick cover for binding.'"
                            value={document.message}
                            onChange={e => updateDocumentState(document.id, { message: e.target.value })}
                            className="mt-1"
                        />
                    </div>
    
                    <div className="p-2 border rounded-md bg-background/50">
                        <Table>
                            <TableBody>
                                <TableRow className="border-0">
                                    <TableCell className="p-1 text-lg text-muted-foreground">Price per page</TableCell>
                                    <TableCell className="p-1 text-right text-lg font-bold text-primary">Rs {(priceDetails?.pricePerPage || 0).toFixed(2)}</TableCell>
                                </TableRow>
                                {priceDetails && priceDetails.bindingCost > 0 && (
                                    <TableRow className="border-0">
                                        <TableCell className="p-1 text-lg text-muted-foreground">Binding Cost</TableCell>
                                        <TableCell className="p-1 text-right text-lg font-bold text-primary">Rs {priceDetails.bindingCost.toFixed(2)}</TableCell>
                                    </TableRow>
                                )}
                                {priceDetails && priceDetails.laminationCost > 0 && (
                                    <TableRow className="border-0">
                                        <TableCell className="p-1 text-lg text-muted-foreground">Lamination Cost</TableCell>
                                        <TableCell className="p-1 text-right text-lg font-bold text-primary">Rs {priceDetails.laminationCost.toFixed(2)}</TableCell>
                                    </TableRow>
                                )}
                                <TableRow className="border-0">
                                    <TableCell className="p-1 text-lg text-muted-foreground">Final Price</TableCell>
                                    <TableCell className="p-1 text-right text-lg font-bold text-primary">Rs {(priceDetails?.finalPrice || 0).toFixed(2)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
};

export default function XeroxPageClient() {
  const { user } = useAuth();
  const [services, setServices] = useState<XeroxService[]>([]);
  const [paperTypes, setPaperTypes] = useState<XeroxOption[]>([]);
  const [paperSamples, setPaperSamples] = useState<PaperSample[]>([]);
  const [orderSettings, setOrderSettings] = useState<OrderSettings | null>(null);
  const [allOptions, setAllOptions] = useState<{
      bindingTypes: XeroxOption[],
      laminationTypes: XeroxOption[],
  }>({
      bindingTypes: [],
      laminationTypes: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentState[]>([]);
  const nextId = useRef(0);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<number, UploadStatus>>({});


  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [fetchedServices, fetchedPaperTypes, bindingTypes, laminationTypes, fetchedPaperSamples, fetchedOrderSettings] = await Promise.all([
          getXeroxServices(),
          getXeroxOptions('paperType'),
          getXeroxOptions('bindingType'),
          getXeroxOptions('laminationType'),
          getPaperSamples(),
          getOrderSettings(),
        ]);
        setServices(fetchedServices);
        setPaperTypes(fetchedPaperTypes);
        setAllOptions({ bindingTypes, laminationTypes });
        setPaperSamples(fetchedPaperSamples);
        setOrderSettings(fetchedOrderSettings);

        // Load documents from session storage after fetching necessary data
        const storedDocs = sessionStorage.getItem('xeroxDocuments');
        if (storedDocs) {
            const parsedDocs: DocumentState[] = JSON.parse(storedDocs);
            if (Array.isArray(parsedDocs) && parsedDocs.length > 0) {
                // We need to re-create file objects as they can't be stored in JSON
                const restoredDocs = parsedDocs.map(doc => ({
                    ...doc,
                    file: new File([], doc.fileDetails?.name || 'restored-file', { type: doc.fileDetails?.type }),
                }));
                setDocuments(restoredDocs);
                nextId.current = Math.max(...restoredDocs.map(d => d.id)) + 1;
            }
        }
        
      } catch (err) {
        setError("Failed to load printing services. Please try again later.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (documents.length > 0) {
        sessionStorage.setItem('xeroxDocuments', JSON.stringify(documents));
    } else {
        sessionStorage.removeItem('xeroxDocuments');
    }
  }, [documents]);

  useEffect(() => {
    if (searchParams.get('upload') === 'true' && fileInputRef.current) {
        handleUploadClick();
    }
  }, [searchParams]);

  const addNewDocument = async (file: File) => {
    const newDocId = nextId.current++;
    const defaultPaperType = paperTypes.length > 0 ? paperTypes[0] : null;

    // Show initial state immediately
    const initialDocumentState: DocumentState = {
      id: newDocId,
      file: file,
      fileDetails: { name: file.name, type: file.type },
      selectedPaperType: defaultPaperType?.id || '',
      currentPaperDetails: defaultPaperType,
      selectedColorOption: defaultPaperType?.colorOptionIds?.[0] || '',
      selectedFormatType: defaultPaperType?.formatTypeIds?.[0] || '',
      selectedPrintRatio: defaultPaperType?.printRatioIds?.[0] || '',
      selectedBindingType: 'none',
      selectedLaminationType: 'none',
      quantity: 1,
      message: '',
    };
    setDocuments(prev => [...prev, initialDocumentState]);

    // Then, asynchronously get page count
    const pages = await getPageCount(file);
    if (pages !== undefined) {
      updateDocumentState(newDocId, { fileDetails: { ...initialDocumentState.fileDetails!, pages } });
    } else {
      // Handle error case where page count couldn't be determined
      removeDocument(newDocId);
    }
  };
  
  const updateDocumentState = (id: number, updates: Partial<DocumentState>) => {
    setDocuments(prev =>
      prev.map(doc => {
        if (doc.id === id) {
          const updatedDoc = { ...doc, ...updates };
          
          if (updatedDoc.fileDetails && updatedDoc.fileDetails.pages === 1 && updatedDoc.selectedFormatType !== 'front') {
            updatedDoc.selectedFormatType = 'front';
          }

          if ('selectedPaperType' in updates && updates.selectedPaperType !== doc.selectedPaperType) {
            const newPaperDetails = paperTypes.find(pt => pt.id === updates.selectedPaperType) || null;
            updatedDoc.currentPaperDetails = newPaperDetails;
            if (newPaperDetails) {
                if (!newPaperDetails.colorOptionIds?.includes(updatedDoc.selectedColorOption)) updatedDoc.selectedColorOption = newPaperDetails.colorOptionIds?.[0] || '';
                
                // Ensure format type is valid
                if (!newPaperDetails.formatTypeIds?.includes(updatedDoc.selectedFormatType)) {
                  updatedDoc.selectedFormatType = newPaperDetails.formatTypeIds?.[0] || '';
                }
                // If only 1 page, force 'front' if available
                if (updatedDoc.fileDetails?.pages === 1 && newPaperDetails.formatTypeIds?.includes('front')) {
                   updatedDoc.selectedFormatType = 'front';
                }

                if (!newPaperDetails.printRatioIds?.includes(updatedDoc.selectedPrintRatio)) updatedDoc.selectedPrintRatio = newPaperDetails.printRatioIds?.[0] || '';
                if (!newPaperDetails.bindingTypeIds?.includes(updatedDoc.selectedBindingType)) updatedDoc.selectedBindingType = 'none';
                if (!newPaperDetails.laminationTypeIds?.includes(updatedDoc.selectedLaminationType)) updatedDoc.selectedLaminationType = 'none';
            }
          }
          return updatedDoc;
        }
        return doc;
      })
    );
  };
  
  const removeDocument = (id: number) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };


  const getPageCount = async (file: File): Promise<number | undefined> => {
    try {
      if (file.type.startsWith('image/')) {
        return 1;
      }
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        return pdf.numPages;
      }
      // For any other file type, we don't know, so return 1 as a default.
      return 1;
    } catch (error) {
      console.error("Error getting page count:", error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not parse page count for ${file.name}.` });
      return undefined;
    }
  };
  
  const handleUploadClick = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleMultipleFileChanges = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
            toast({
                variant: "destructive",
                title: "File Type Not Supported",
                description: `"${file.name}" is a Word document. Please convert it to a PDF and upload again.`,
                duration: 7000,
            });
            return;
        }
        addNewDocument(file);
      });
      e.target.value = '';
    }
  }

  const calculateDocumentPrice = useCallback((doc: DocumentState): DocumentPriceDetails => {
    const result = { id: doc.id, pricePerPage: 0, bindingCost: 0, laminationCost: 0, finalPrice: 0 };
    if (!doc.currentPaperDetails || !doc.fileDetails?.pages) return result;

    const colorOption = HARDCODED_XEROX_OPTIONS.colorOptions.find(o => o.id === doc.selectedColorOption);
    const formatType = HARDCODED_XEROX_OPTIONS.formatTypes.find(o => o.id === doc.selectedFormatType);
    const printRatio = HARDCODED_XEROX_OPTIONS.printRatios.find(o => o.id === doc.selectedPrintRatio);
    const bindingType = allOptions.bindingTypes.find(o => o.id === doc.selectedBindingType);
    const laminationType = allOptions.laminationTypes.find(o => o.id === doc.selectedLaminationType);
    
    let basePricePerPage = 0;
    if (colorOption?.name === 'Gradient / Colour') {
      basePricePerPage = formatType?.name === 'Front and Back' 
        ? doc.currentPaperDetails.priceColorBoth ?? 0
        : doc.currentPaperDetails.priceColorFront ?? 0;
    } else {
      basePricePerPage = formatType?.name === 'Front and Back'
        ? doc.currentPaperDetails.priceBwBoth ?? 0
        : doc.currentPaperDetails.priceBwFront ?? 0;
    }

    const pricePerPageAfterRatio = printRatio?.name === '1:2 (Two pages per sheet)' ? basePricePerPage / 2 : basePricePerPage;
    result.pricePerPage = pricePerPageAfterRatio;

    const documentPages = doc.fileDetails.pages;
    const physicalPages = formatType?.name === 'Front and Back' ? Math.ceil(documentPages / 2) : documentPages;
    const printingCost = physicalPages * pricePerPageAfterRatio;

    result.bindingCost = bindingType?.price || 0;
    result.laminationCost = laminationType?.price || 0;

    const singleCopyPrice = printingCost + result.bindingCost + result.laminationCost;
    result.finalPrice = singleCopyPrice * doc.quantity;

    return result;
}, [allOptions.bindingTypes, allOptions.laminationTypes]);

  const documentPrices = useMemo(() => {
    return documents.map(doc => calculateDocumentPrice(doc));
  }, [documents, calculateDocumentPrice]);

  const subtotal = useMemo(() => {
    return documentPrices.reduce((total, item) => total + item.finalPrice, 0);
  }, [documentPrices]);
  
  const deliveryInfo = useMemo(() => {
    if (!orderSettings || subtotal <= 0) return { charge: 0, nextTierInfo: null };
    return getDeliveryCharge(orderSettings.xeroxDeliveryRules, subtotal);
  }, [subtotal, orderSettings]);

  const finalTotalPrice = useMemo(() => subtotal + deliveryInfo.charge, [subtotal, deliveryInfo.charge]);

    const uploadSingleDocument = async (doc: DocumentState): Promise<string | null> => {
        if (doc.file.size > 1 * 1024 * 1024) { // 1MB
             setUploadStatus(prev => ({
                ...prev,
                [doc.id]: { status: 'skipped', progress: 100, url: null, error: "File exceeds 1MB limit." }
            }));
            return null;
        }

        setUploadStatus(prev => ({
            ...prev,
            [doc.id]: { status: 'uploading', progress: 0 }
        }));

        return new Promise<string | null>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload", true);
            xhr.timeout = 120000; // 2 minutes timeout

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    setUploadStatus(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], progress: percentComplete, status: 'uploading' }}));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = JSON.parse(xhr.responseText);
                    setUploadStatus(prev => ({ ...prev, [doc.id]: { status: 'success', progress: 100, url: response.url } }));
                    resolve(response.url);
                } else {
                    const errorResponse = JSON.parse(xhr.responseText);
                    const errorMessage = errorResponse.error || 'Upload failed.';
                    setUploadStatus(prev => ({ ...prev, [doc.id]: { status: 'error', progress: 0, error: errorMessage } }));
                    reject(new Error(errorMessage));
                }
            };

            xhr.onerror = () => {
                const errorMessage = "Network error. Please check your connection.";
                setUploadStatus(prev => ({ ...prev, [doc.id]: { status: 'error', progress: 0, error: errorMessage } }));
                reject(new Error(errorMessage));
            };

            xhr.ontimeout = () => {
                setUploadStatus(prev => ({ ...prev, [doc.id]: { status: 'skipped', progress: 100, url: null, error: "Upload timed out." } }));
                resolve(null); // Resolve with null on timeout
            };
            
            const fd = new FormData();
            fd.append("file", doc.file);
            xhr.send(fd);
        });
    };
    
    const storeJobsAndRedirect = useCallback(() => {
        const jobsForStorage: _StoredXeroxJob[] = documents.map((doc) => {
            const priceInfo = documentPrices.find(p => p.id === doc.id);
            const status = uploadStatus[doc.id] || { url: '' };

            return {
                id: `${Date.now()}-${doc.id}`,
                fileDetails: {
                    name: doc.fileDetails!.name,
                    type: doc.fileDetails!.type,
                    url: status.url || '', 
                },
                pageCount: doc.fileDetails!.pages || 0,
                price: priceInfo ? priceInfo.finalPrice / doc.quantity : 0,
                config: {
                    paperType: doc.selectedPaperType,
                    colorOption: doc.selectedColorOption,
                    formatType: doc.selectedFormatType,
                    pageCount: doc.fileDetails!.pages || 0,
                    printRatio: doc.selectedPrintRatio,
                    bindingType: doc.selectedBindingType,
                    laminationType: doc.selectedLaminationType,
                    quantity: doc.quantity,
                    message: doc.message,
                }
            };
        });

        sessionStorage.setItem('xeroxCheckoutJobs', JSON.stringify(jobsForStorage));
        router.push('/xerox/checkout');
    }, [documents, documentPrices, uploadStatus, router]);
    
    const handleCheckout = async () => {
        setIsUploading(true);
        // This will now only trigger the upload process and open the dialog
    };
    
    const startUploads = async () => {
        const initialStatuses: Record<number, UploadStatus> = {};
        documents.forEach(doc => {
            initialStatuses[doc.id] = { status: 'pending', progress: 0 };
        });
        setUploadStatus(initialStatuses);
        
        try {
            const uploadPromises = documents.map(doc => uploadSingleDocument(doc));
            await Promise.allSettled(uploadPromises); // Use allSettled to wait for all promises regardless of outcome
        } catch (error) {
            // This catch block might not be necessary with allSettled
            console.error("An error occurred during the upload batch.", error);
        }
    }


    const handleRetry = (docId: number) => {
        const docToRetry = documents.find(d => d.id === docId);
        if (docToRetry) {
            uploadSingleDocument(docToRetry).catch(err => {
                console.error("Retry failed", err);
            });
        }
    };
    
    const getOptionName = (type: 'paperType' | 'colorOption' | 'formatType' | 'printRatio' | 'bindingType' | 'laminationType', id: string): string => {
        if (!id || id === 'none') return '';
        if (type === 'paperType') return paperTypes.find(o => o.id === id)?.name || '';
        if (type === 'colorOption') return HARDCODED_XEROX_OPTIONS.colorOptions.find(o => o.id === id)?.name || '';
        if (type === 'formatType') return HARDCODED_XEROX_OPTIONS.formatTypes.find(o => o.id === id)?.name || '';
        if (type === 'printRatio') return HARDCODED_XEROX_OPTIONS.printRatios.find(o => o.id === id)?.name || '';
        if (type === 'bindingType') return allOptions.bindingTypes.find(o => o.id === id)?.name || '';
        if (type === 'laminationType') return allOptions.laminationTypes.find(o => o.id === id)?.name || '';
        return '';
    };

    const UploadProgressDialog = () => {
        const allFinished = Object.values(uploadStatus).every(s => s.status === 'success' || s.status === 'skipped');
        const hasErrors = Object.values(uploadStatus).some(s => s.status === 'error');
        const isProcessing = Object.values(uploadStatus).some(s => s.status === 'pending' || s.status === 'uploading');

        useEffect(() => {
            if (isUploading) {
                startUploads();
            }
        }, []); // Runs only once when the dialog is opened

        return (
            <Dialog open={isUploading} onOpenChange={setIsUploading}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Processing Documents</DialogTitle>
                        <DialogDescription>
                            Your files are being uploaded. Files larger than 1MB or those that take longer than 2 minutes will be skipped.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {documents.map(doc => {
                            const status = uploadStatus[doc.id];
                            if (!status) return null;
                            return (
                                <div key={doc.id} className="space-y-2">
                                    <p className="text-sm font-medium truncate">{doc.fileDetails?.name}</p>
                                    <div className="flex items-center gap-2">
                                        <Progress value={status.progress} className="flex-1 h-2" />
                                        {status.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {status.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                        {status.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                                        {status.status === 'skipped' && <Info className="h-4 w-4 text-yellow-500" />}
                                    </div>
                                    {status.status === 'error' && <p className="text-xs text-red-500">{status.error}</p>}
                                    {status.status === 'skipped' && <p className="text-xs text-yellow-500">{status.error || 'Upload skipped.'}</p>}
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                         {hasErrors && (
                            <Button variant="outline" onClick={() => documents.forEach(doc => {
                                if (uploadStatus[doc.id]?.status === 'error') handleRetry(doc.id);
                            })}>
                                <RefreshCw className="mr-2 h-4 w-4"/> Retry Failed Uploads
                            </Button>
                         )}
                         <Button onClick={storeJobsAndRedirect} disabled={isProcessing}>
                             {isProcessing ? "Waiting for uploads..." : "Proceed to Checkout"}
                         </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    };

  
  const FinalEstimation = () => {
    if (documents.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Final Estimation</CardTitle>
          <CardDescription>Please review the details for each document before proceeding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {documents.map((doc, index) => {
              const priceInfo = documentPrices.find(p => p.id === doc.id);
              const configDetails = [
                  { label: 'Pages', value: doc.fileDetails?.pages || 'N/A' },
                  { label: 'Quantity', value: doc.quantity },
                  { label: 'Paper', value: getOptionName('paperType', doc.selectedPaperType) },
                  { label: 'Color', value: getOptionName('colorOption', doc.selectedColorOption) },
                  { label: 'Format', value: getOptionName('formatType', doc.selectedFormatType) },
                  { label: 'Ratio', value: getOptionName('printRatio', doc.selectedPrintRatio) },
                  { label: 'Binding', value: getOptionName('bindingType', doc.selectedBindingType) },
                  { label: 'Lamination', value: getOptionName('laminationType', doc.selectedLaminationType) },
                  { label: 'Instructions', value: doc.message },
              ].filter(d => d.value && d.value !== 'N/A');

              return (
                  <div key={doc.id} className="border-b pb-3 mb-3">
                      <div className="flex justify-between items-start text-sm">
                          <p className="font-medium truncate pr-4">Doc {index + 1}: {doc.fileDetails?.name}</p>
                          <p className="flex-shrink-0 font-semibold text-base">Rs {(priceInfo?.finalPrice || 0).toFixed(2)}</p>
                      </div>
                      <Table className="mt-2">
                        <TableBody>
                            {configDetails.map(detail => (
                                <TableRow key={detail.label} className="border-0">
                                    <TableCell className="p-1 text-xs text-muted-foreground w-[100px]">{detail.label}</TableCell>
                                    <TableCell className="p-1 text-xs font-medium">{detail.value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                  </div>
              )
          })}
          
           <div className="space-y-2 text-sm">
             <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs {subtotal.toFixed(2)}</span>
             </div>
             {deliveryInfo.charge > 0 && (
                <div className="flex justify-between text-destructive">
                    <span>Delivery</span>
                    <span>Rs {deliveryInfo.charge.toFixed(2)}</span>
                </div>
             )}
           </div>

          <Separator />
          <div className="flex justify-between font-bold text-lg">
              <p>Final Total Price</p>
              <p>Rs {finalTotalPrice.toFixed(2)}</p>
          </div>
          
          {deliveryInfo.nextTierInfo && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Save on Delivery!</AlertTitle>
              <AlertDescription>{deliveryInfo.nextTierInfo}</AlertDescription>
            </Alert>
          )}

           <Button 
                size="lg" 
                className="w-full"
                disabled={documents.length === 0}
                onClick={handleCheckout}
            >
                <CheckCircle className="mr-2 h-5 w-5" />
                Confirm & Proceed to Checkout
            </Button>
        </CardContent>
      </Card>
    );
  };


  const renderInitialState = () => (
    <div className="container mx-auto px-4 py-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-300 via-sky-100 to-white dark:from-sky-800 dark:via-sky-900 dark:to-black rounded-2xl"></div>
        <Card className="relative z-10 text-center p-8 border-0 bg-transparent rounded-2xl h-64 md:h-52 flex flex-col justify-center">
            <CardHeader>
                <FileUp className="mx-auto h-12 w-12 text-black dark:text-white" />
                <CardTitle className="text-2xl text-black dark:text-white">Start Your Printing Order</CardTitle>
                <CardDescription className="text-gray-800 dark:text-gray-200">Upload your documents to get started.</CardDescription>
            </CardHeader>
            <CardContent>
             <div className="relative w-full h-14 overflow-hidden rounded-full">
                <Button
                    type="button"
                    size="lg"
                    onClick={handleUploadClick}
                    className="w-full h-full bg-black text-white hover:bg-gray-800 rounded-full relative"
                >
                    <div className="shining-button" />
                    <FileUp className="mr-2 h-4 w-4" /> Upload Documents
                </Button>
            </div>
            <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleMultipleFileChanges}
                accept="application/pdf,image/*"
            />
            </CardContent>
        </Card>
    </div>
  );
  
  const PriceListDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-sky-400 text-white hover:opacity-90 transition-transform active:scale-95">
          <ListOrdered className="mr-2 h-4 w-4" /> View Price List
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Xerox &amp; Printing Price List</DialogTitle>
          <DialogDescription>
            Prices for various printing and finishing services.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 max-h-[60vh]">
          {error ? (
            <p className="text-center text-destructive">{error}</p>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : services.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No printing services are available at the moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => {
                  const hasDiscount = service.discountPrice != null && service.discountPrice < service.price;
                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">
                        <p>{service.name}</p>
                        {service.unit && <p className="text-xs text-muted-foreground">{service.unit}</p>}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasDiscount ? (
                          <div className="flex flex-col items-end">
                            <span className="text-base font-bold">Rs {service.discountPrice?.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground line-through">Rs {service.price.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-base font-bold">Rs {service.price.toFixed(2)}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="destructive" className="transition-transform active:scale-95">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const PaperSamplesDialog = () => (
    <Dialog>
        <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-sky-400 text-white hover:opacity-90 transition-transform active:scale-95"><Images className="mr-2 h-4 w-4"/> View Formats</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Paper Sample Formats</DialogTitle>
                <DialogDescription>
                    Visual examples of different paper types.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-grow">
                <div className="pr-6 space-y-4">
                    {isLoading ? (
                        <p>Loading samples...</p>
                    ) : paperSamples.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No samples available.</p>
                    ) : (
                        paperSamples.map(sample => (
                            <Card key={sample.id}>
                                <CardHeader>
                                    <CardTitle>{sample.name}</CardTitle>
                                    <CardDescription>{sample.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Carousel>
                                        <CarouselContent>
                                            {sample.imageUrls.map((url, i) => (
                                                <CarouselItem key={i}>
                                                    <div className="relative aspect-video">
                                                        <Image src={url} alt={`${sample.name} ${i+1}`} fill className="object-contain rounded-md" />
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        {sample.imageUrls.length > 1 && (
                                            <>
                                            <CarouselPrevious />
                                            <CarouselNext />
                                            </>
                                        )}
                                    </Carousel>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="destructive" className="transition-transform active:scale-95">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );

  return (
    <div className="pb-24">
      {isUploading && <UploadProgressDialog />}
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
          Xerox &amp; Printing Services
        </h1>
        <p className="mt-4 text-muted-foreground">
          High-quality photocopying and printing at competitive prices.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <PriceListDialog />
          <PaperSamplesDialog />
        </div>
      </div>

       {documents.length === 0 && !isLoading ? renderInitialState() : (
         <div className="container mx-auto px-4 py-8 space-y-4">
            {documents.map((doc, index) => (
              <DocumentCard 
                key={doc.id} 
                document={doc} 
                index={index} 
                removeDocument={removeDocument} 
                updateDocumentState={updateDocumentState}
                paperTypes={paperTypes}
                allOptions={allOptions}
                documentPrices={documentPrices}
                isLoading={isLoading}
              />
            ))}
            
            <Input 
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleMultipleFileChanges}
                accept="application/pdf,image/*"
            />
            <FinalEstimation />
        </div>
       )}

        {documents.length > 0 && (
            <div className="fixed bottom-6 right-6 z-50">
                <Button
                    type="button"
                    className="rounded-full h-12 shadow-lg flex items-center justify-center gap-2 px-4"
                    onClick={handleUploadClick}
                >
                    <Plus className="h-5 w-5" />
                    <span className="font-semibold text-sm">Add Another Document</span>
                </Button>
            </div>
        )}
    </div>
  );
}
