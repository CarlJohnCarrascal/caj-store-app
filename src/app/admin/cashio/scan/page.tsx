

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowUp, ArrowDown, Camera, VideoOff, SwitchCamera, FileImage, Loader2, CheckCircle, XCircle, AlertTriangle, FileUp, Info, User, Wallet, Landmark, Hash, Clock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractTransactionDetailsFromImage } from '@/ai/flows/extract-transaction-details-from-image';
import { getCashTransactionByReference, getAccounts, finalizeReceiptImage, updateCashTransaction } from '@/lib/data';
import { useCart } from '@/hooks/use-cart';
import { Product, Account, CashTransaction } from '@/lib/types';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';


type TransactionType = 'Cash In' | 'Cash Out';

interface ExtractedData {
    reference?: string;
    amount?: number;
    accountName?: string;
    accountNumber?: string;
    datetime?: string;
    accountUsedId?: string;
    fromScanned?: string;
    [key: string]: any;
    imageId?: string;
    image?: string;
}

export default function ScanImagePage() {
  const [step, setStep] = useState(1);
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { addToCart, setCartCustomer, setCartOpen } = useCart();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [rawExtractionResult, setRawExtractionResult] = useState<string | null>(null);
  const [duplicateTransaction, setDuplicateTransaction] = useState<CashTransaction | null>(null);
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    async function fetchAccounts() {
        const fetchedAccounts = await getAccounts();
        setAccounts(fetchedAccounts);
    }
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (step !== 2) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }

    const getCameraPermission = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode }
        });
        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };

    getCameraPermission();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [step, facingMode, toast]);
  
  const handleSelectType = (type: TransactionType) => {
    setTransactionType(type);
    setStep(2);
  };
  
  const handleCameraSwitch = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };
  
  const processImage = async (imageDataUri: string) => {
    setPreviewImage(imageDataUri); 
    setStep(3);
    setIsProcessing(true);
    setExtractedData(null);
    setRawExtractionResult(null);
    setDuplicateTransaction(null);
    setIsClaimed(false);


    try {
        const result = await extractTransactionDetailsFromImage({ imageDataUri });

        if (result.error || !result.data) {
            toast({ variant: 'destructive', title: 'Extraction Failed', description: result.error || "The AI could not extract details from the image." });
            setIsProcessing(false);
            return;
        }
        
        let data: ExtractedData = result.data;
        if (result.raw) {
            setRawExtractionResult(result.raw)
        };
        
        if (data.reference) {
            data.reference = data.reference.replace(/\s+/g, '');
        }
        if (data.accountNumber) {
            data.accountNumber = data.accountNumber.replace(/\s+/g, '');
        }
        
        if (transactionType === 'Cash Out' && data.accountNumber && accounts.length > 0) {
            const extractedNumSuffix = data.accountNumber.replace(/\s+/g, '').slice(-10);
            const matchedAccount = accounts.find(acc => acc.accountNumber.replace(/\s+/g, '').slice(-10) === extractedNumSuffix);

            if (matchedAccount) {
                data.accountUsedId = matchedAccount.id;
                data['Account Used'] = matchedAccount.accountName;
                data.accountName = 'N/A';
                data.accountNumber = 'N/A';
            }
        }

        setExtractedData(data);
        
        if (data.reference) {
            const duplicateTx = await getCashTransactionByReference(data.reference);
            setDuplicateTransaction(duplicateTx);

            if (duplicateTx && transactionType === 'Cash Out' && duplicateTx.status === 'Claimed') {
                setIsClaimed(true);
            }
        } else {
            setDuplicateTransaction(null);
        }
        
        toast({ title: 'Extraction Successful', description: 'Review the extracted details below.' });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || "An unknown error occurred during image processing." });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleScanClick = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
        processImage(dataUri);
      }
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          processImage(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveScanImage = async (img: string, id: string) => {
    
    const receipts = JSON.parse(localStorage.getItem('temp_receipt_id_list') || '[]');
    
    const receiptData = {
        image: img,
        reference: id,
        date: new Date().toISOString(),
    }

    receipts.push(id);
    localStorage.setItem('temp_receipt_id_list', JSON.stringify(receipts));
    localStorage.setItem('temp_receipt_image_' + id, JSON.stringify(receiptData));
  }

  const submitTransaction = async () => {
    if (!extractedData) return;
    setIsProcessing(true);

    try {
        const queryParams = new URLSearchParams();
        
        
        if(transactionType) {
            queryParams.set('transactionType', transactionType);
        }

        extractedData['imageId'] = new Date().getTime().toString();
        
        if (previewImage) {
          queryParams.set('fromScanned', extractedData.imageId);
          saveScanImage(previewImage, extractedData.imageId);
        }
        
        Object.entries(extractedData).forEach(([key, value]) => {
            if (key !== 'transactionType' && value) {
                if (key === 'datetime') {
                  const localDateTime = value.slice(0, 16);
                  queryParams.set(key, localDateTime);
                }else queryParams.set(key, String(value));
            }
        });

        router.push(`/admin/cashio/new?${queryParams.toString()}`);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Submission Failed', description: error.message || "Could not process transaction."});
        setIsProcessing(false);
    }
  }

  const handleAddToOrder = async () => {
    if (!extractedData?.reference) return;

    const existingTx = await getCashTransactionByReference(extractedData.reference);

    if (!existingTx) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find the existing transaction to add to the order.'});
        return;
    }

    let imageUrl = '';
    //upload image
    if (previewImage) {
      const folder = existingTx.transactionType === 'Cash Out' ? 'cashout' : 'cashin';
      imageUrl = await finalizeReceiptImage(previewImage, folder, existingTx.reference);
    }
    
    await updateCashTransaction(existingTx.id, { receiptImageUrl: imageUrl }, { userId: user.uid , userName: user.displayName });

    const finalPrice = existingTx.transactionType === 'Cash In' 
        ? existingTx.amount + existingTx.fee 
        : -(existingTx.amount - existingTx.fee);

    const transactionAsProduct: Product = {
        id: `cashio-${existingTx.reference}-${Date.now()}`,
        name: `${existingTx.transactionType}: ${existingTx.accountName}`,
        price: finalPrice,
        description: `Ref: ${existingTx.reference} | Acct: ${existingTx.accountName} (${existingTx.accountNumber}) | Fee: ₱${existingTx.fee.toFixed(2)} | Amt: ₱${existingTx.amount.toFixed(2)}`,
        group: 'Financial',
        category: 'CashIO',
        show: false,
        stock: 1,
        unit: 'each',
        image: imageUrl,
        material: 'N/A',
        dimensions: 'N/A',
        fromScanned: extractedData.imageId,
        originalTransactionId: existingTx.id
    };
    
    addToCart(transactionAsProduct, 1);
    setCartCustomer({ name: existingTx.accountName });

    toast({ title: 'Success', description: 'Transaction added to order.' });
    setCartOpen(true);
    router.push('/admin/cashio');
  };

  const reset = () => {
    setStep(1);
    setTransactionType(null);
    setExtractedData(null);
    setRawExtractionResult(null);
    setDuplicateTransaction(null);
    setPreviewImage(null);
    setIsClaimed(false);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const canAddToOrder = !!duplicateTransaction && !isClaimed && transactionType !== 'Cash In';


  return (
    <div className="space-y-6">
       <Button asChild variant="outline" onClick={step === 1 ? undefined : reset}>
          <Link href={step === 1 ? "/admin/cashio" : "#"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Scan Transaction Image</CardTitle>
          <CardDescription>
            {step === 1 && 'First, select the type of transaction you are scanning.'}
            {step === 2 && 'Position the receipt in the frame and scan, or upload an image.'}
            {step === 3 && 'Verify the extracted details and proceed.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
             <RadioGroup className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="Cash In" id="r-cashin" className="sr-only peer" onClick={() => handleSelectType('Cash In')} />
                  <Label
                    htmlFor="r-cashin"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer"
                  >
                    <ArrowUp className="mb-3 h-6 w-6 text-green-500" />
                    Cash In
                  </Label>
                </div>
                <div>
                   <RadioGroupItem value="Cash Out" id="r-cashout" className="sr-only peer" onClick={() => handleSelectType('Cash Out')} />
                   <Label
                    htmlFor="r-cashout"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer"
                  >
                    <ArrowDown className="mb-3 h-6 w-6 text-red-500" />
                    Cash Out
                  </Label>
                </div>
            </RadioGroup>
          )}

          {step === 2 && (
            <div className="space-y-4">
                <div className="w-full aspect-[9/16] bg-muted rounded-md overflow-hidden flex items-center justify-center relative">
                    <video ref={videoRef} className={cn("w-full h-full object-cover", hasCameraPermission === false && "hidden")} autoPlay muted playsInline />
                    {hasCameraPermission === null && <p>Requesting camera...</p>}
                    {hasCameraPermission === false && (
                         <div className="text-center text-muted-foreground p-4">
                            <VideoOff className="h-12 w-12 mx-auto mb-2" />
                            <p>Camera access denied.</p>
                         </div>
                    )}
                     {hasCameraPermission && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCameraSwitch}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 border-white/50 text-white hover:text-white"
                        >
                            <SwitchCamera className="h-5 w-5" />
                        </Button>
                    )}
                </div>

                {hasCameraPermission === false && (
                    <Alert variant="destructive">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                            Please allow camera access in your browser settings to use this feature. You may need to refresh the page after granting permission.
                        </AlertDescription>
                    </Alert>
                )}
                
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    disabled={isProcessing}
                />

                <div className="grid grid-cols-2 gap-2">
                    <Button size="lg" className="w-full" onClick={handleScanClick} disabled={!hasCameraPermission || isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Camera className="mr-2 h-5 w-5" />}
                        Scan
                    </Button>
                     <Button size="lg" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                        <FileImage className="mr-2 h-5 w-5" />
                        Upload
                    </Button>
                </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
                {previewImage && (
                    <div className="relative w-full aspect-[9/16] bg-muted rounded-md overflow-hidden flex items-center justify-center">
                        <Image src={previewImage} alt="Scanned preview" layout="fill" objectFit="contain" />
                    </div>
                )}
                
                {isProcessing && (
                    <div className="flex items-center justify-center text-muted-foreground py-4">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Processing image...</span>
                    </div>
                )}

                {!isProcessing && (
                    <>
                        {duplicateTransaction !== null ? (
                             isClaimed ? (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Transaction Already Claimed</AlertTitle>
                                    <AlertDescription>
                                        This cash-out transaction has already been claimed and cannot be added to a new order.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertTitle>Transaction Found</AlertTitle>
                                    <AlertDescription>
                                        This reference number already exists in your records.
                                    </AlertDescription>
                                </Alert>
                            )
                        ) : (
                           extractedData && (
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>New Transaction</AlertTitle>
                                <AlertDescription>
                                    This reference number appears to be new.
                                </AlertDescription>
                            </Alert>
                           )
                        )}

                        <div className="space-y-2 rounded-md border p-4 text-sm">
                            {extractedData ? (
                                Object.entries(extractedData).map(([key, value]) => {
                                     if (key === 'accountUsedId') return null;
                                     return (
                                        <div key={key} className="flex justify-between">
                                            <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                            <span className="font-mono text-right">{String(value)}</span>
                                        </div>
                                     );
                                })
                            ) : (
                                <div className="text-center text-muted-foreground">No details extracted.</div>
                            )}
                        </div>
                        
                        {canAddToOrder ? (
                            <Button className="w-full" size="lg" onClick={handleAddToOrder}>Add to Order</Button>
                        ) : (
                            <Button className="w-full" size="lg" onClick={submitTransaction} disabled={!!duplicateTransaction || isProcessing}>
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
                                Add Transaction
                            </Button>
                        )}
                        {duplicateTransaction && (
                             <Button variant="secondary" className="w-full" onClick={() => setIsDetailsModalOpen(true)}>
                                 <Info className="mr-2 h-4 w-4" />
                                 View Existing Transaction Details
                             </Button>
                        )}
                    </>
                )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {duplicateTransaction && (
          <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
            <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {duplicateTransaction.transactionType === 'Cash In' ? (
                        <ArrowUp className="h-6 w-6 text-green-600" />
                        ) : (
                        <ArrowDown className="h-6 w-6 text-red-600" />
                        )}
                        <span>{duplicateTransaction.transactionType}</span>
                    </DialogTitle>
                     <DialogDescription>
                        {(() => {
                        if (!duplicateTransaction.transactionDate) return 'Loading date...';
                        try {
                            const date = new Date(duplicateTransaction.transactionDate);
                            if (!isNaN(date.getTime())) {
                            return format(date, 'PPpp');
                            }
                        } catch(e) {}
                        return "Invalid Date";
                        })()}
                        <br />
                        <span className="font-bold text-xl text-base text-foreground">
                            {(duplicateTransaction.reference && duplicateTransaction.reference.length === 13)
                            ? `${duplicateTransaction.reference.slice(0, 4)}-${duplicateTransaction.reference.slice(4, 7)}-${duplicateTransaction.reference.slice(7)}`
                            : duplicateTransaction.reference}
                        </span>
                    </DialogDescription>
                 </DialogHeader>
                 <ScrollArea className="max-h-[60vh] -mx-6">
                    <div className="space-y-6 py-4 px-6">
                        {duplicateTransaction.receiptImageUrl && (
                            <div>
                                <h4 className="font-semibold mb-2 text-muted-foreground">Receipt</h4>
                                <div
                                    className="relative h-32 w-32 rounded-md overflow-hidden border-2 border-dashed cursor-pointer"
                                    onClick={() => setIsImageModalOpen(true)}
                                >
                                    <Image
                                        src={duplicateTransaction.receiptImageUrl}
                                        alt="Transaction Receipt"
                                        fill
                                        sizes="128px"
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <FileImage className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                                <span className="text-muted-foreground">Amount</span>
                                <p className="text-2xl font-bold break-all">
                                ₱{duplicateTransaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="flex justify-between items-center text-sm px-1">
                                <span className="text-muted-foreground">Fee</span>
                                <span>₱{duplicateTransaction.fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm px-1">
                                <span className="text-muted-foreground">Status</span>
                                <Badge
                                    variant={'default'}
                                    className={cn(
                                    {
                                        'bg-green-600 hover:bg-green-700': duplicateTransaction.status === 'Delivered' || duplicateTransaction.status === 'Claimed',
                                        'bg-cyan-500 hover:bg-cyan-600': duplicateTransaction.status === 'Available',
                                        'bg-amber-500 hover:bg-amber-600': duplicateTransaction.status === 'Processing',
                                    }
                                    )}
                                >
                                    {duplicateTransaction.status}
                                </Badge>
                            </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2 text-muted-foreground">{duplicateTransaction.transactionType === 'Cash In' ? 'To (Receiver)' : 'From (Sender)'}</h4>
                                <div className="pl-2 space-y-2 text-sm border-l">
                                    <div className="flex items-start gap-3">
                                        <User className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                                        <p className="font-medium break-words">{duplicateTransaction.accountName}</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Wallet className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                                        <p className="font-mono break-all">{duplicateTransaction.accountNumber}</p>
                                    </div>
                                </div>
                            </div>

                            {duplicateTransaction.customerId && (
                                <div>
                                    <h4 className="font-semibold mb-2 text-muted-foreground">Processed By (Store Customer)</h4>
                                    <div className="pl-2 space-y-2 text-sm border-l">
                                        <div className="flex items-start gap-3">
                                            <User className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                                            <p className="font-medium break-words">{duplicateTransaction.customerName}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="font-semibold mb-2 text-muted-foreground">Our Account</h4>
                                <div className="pl-2 space-y-2 text-sm border-l">
                                    <div className="flex items-start gap-3">
                                        <Landmark className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5"/>
                                        <p className="break-words">{duplicateTransaction.ourAccountName} via {duplicateTransaction.paymentMethod}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2 text-muted-foreground">Details</h4>
                                <div className="pl-2 space-y-2 text-sm border-l">
                                    <div className="flex items-start gap-3">
                                        <Hash className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5"/>
                                        <p className="font-mono break-all">{duplicateTransaction.reference}</p>
                                    </div>
                                    {duplicateTransaction.createdAt && (
                                      <div className="flex items-start gap-3">
                                        <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                                        <p className="text-muted-foreground">
                                          Created: {format(new Date(duplicateTransaction.createdAt), 'PPp')}
                                        </p>
                                      </div>
                                    )}
                                    {duplicateTransaction.message && (
                                        <div className="flex items-start gap-3">
                                            <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5"/>
                                            <p className="text-muted-foreground break-words">{duplicateTransaction.message}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
      )}

      {duplicateTransaction?.receiptImageUrl && (
          <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
            <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
              <DialogHeader className="p-6 pb-0 flex-shrink-0">
                <DialogTitle>Receipt Preview</DialogTitle>
              </DialogHeader>
              <div className="relative flex-1 w-full h-full p-6 pt-2">
                <Image
                    src={duplicateTransaction.receiptImageUrl}
                    alt="Transaction Receipt"
                    fill
                    className="object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
