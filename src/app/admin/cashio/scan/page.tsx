

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowUp, ArrowDown, Camera, VideoOff, SwitchCamera, FileImage, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractTransactionDetailsFromImage } from '@/ai/flows/extract-transaction-details-from-image';
import { getCashTransactionByReference, getAccounts } from '@/lib/data';
import { useCart } from '@/hooks/use-cart';
import { Product, Account } from '@/lib/types';
import Image from 'next/image';

type TransactionType = 'Cash In' | 'Cash Out';

interface ExtractedData {
    reference?: string;
    amount?: number;
    accountName?: string;
    accountNumber?: string;
    datetime?: string;
    accountUsedId?: string;
    'Account Used'?: string;
    [key: string]: any;
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

  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [rawExtractionResult, setRawExtractionResult] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState<boolean | null>(null);
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

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
    setPreviewImage(imageDataUri); // Show preview immediately
    setStep(3); // Move to results view to show preview and loading state
    setIsLoading(true);
    setExtractedData(null);
    setRawExtractionResult(null);
    setIsDuplicate(null);
    setIsClaimed(false);

    try {
        const result = await extractTransactionDetailsFromImage({ imageDataUri });

        if (result.error || !result.data) {
            toast({ variant: 'destructive', title: 'Extraction Failed', description: result.error || "The AI could not extract details from the image." });
            setIsLoading(false); // Stop loading on failure
            return;
        }
        
        let data: ExtractedData = result.data;
        if (result.raw) {
            setRawExtractionResult(result.raw)
        };
        
        // Trim whitespace from reference and account number if they exist
        if (data.reference) {
            data.reference = data.reference.replace(/\s+/g, '');
        }
        if (data.accountNumber) {
            data.accountNumber = data.accountNumber.replace(/\s+/g, '');
        }
        
        // Handle Cash Out auto-detection of account used
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
            setIsDuplicate(!!duplicateTx);

            if (duplicateTx && transactionType === 'Cash Out' && duplicateTx.status === 'Claimed') {
                setIsClaimed(true);
            }
        } else {
            setIsDuplicate(false);
        }
        
        toast({ title: 'Extraction Successful', description: 'Review the extracted details below.' });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || "An unknown error occurred during image processing." });
    } finally {
        setIsLoading(false);
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

  const handleAddTransaction = () => {
    if (!extractedData) return;

    const queryParams = new URLSearchParams();
    
    // Prioritize user's selection over AI extraction for transactionType
    if(transactionType) {
        queryParams.set('transactionType', transactionType);
    }
    
    Object.entries(extractedData).forEach(([key, value]) => {
        // Skip setting transactionType if it came from AI, as we already set the user's choice
        // also skip our custom 'Account Used' display field
        if (key === 'transactionType' || key === 'Account Used') return;
        
        if (value) {
            queryParams.set(key, String(value));
        }
    });

    if (rawExtractionResult) {
        queryParams.set('message', rawExtractionResult);
    }

    router.push(`/admin/cashio/new?${queryParams.toString()}`);
  };

  const handleAddToOrder = async () => {
    if (!extractedData?.reference) return;

    const existingTx = await getCashTransactionByReference(extractedData.reference);

    if (!existingTx) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find the existing transaction to add to the order.'});
        return;
    }

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
        image: 'https://placehold.co/600x600.png',
        material: 'N/A',
        dimensions: 'N/A',
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
    setIsDuplicate(null);
    setPreviewImage(null);
    setIsClaimed(false);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const canAddToOrder = isDuplicate && !isClaimed && transactionType !== 'Cash In';


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
                    disabled={isLoading}
                />

                <div className="grid grid-cols-2 gap-2">
                    <Button size="lg" className="w-full" onClick={handleScanClick} disabled={!hasCameraPermission || isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Camera className="mr-2 h-5 w-5" />}
                        Scan
                    </Button>
                     <Button size="lg" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
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
                
                {isLoading && (
                    <div className="flex items-center justify-center text-muted-foreground py-4">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Extracting details...</span>
                    </div>
                )}

                {!isLoading && (
                    <>
                        {isDuplicate !== null && (
                             isClaimed ? (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Transaction Already Claimed</AlertTitle>
                                    <AlertDescription>
                                        This cash-out transaction has already been claimed and cannot be added to a new order.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant={isDuplicate ? "destructive" : "default"}>
                                    {isDuplicate ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                    <AlertTitle>{isDuplicate ? "Duplicate Transaction" : "New Transaction"}</AlertTitle>
                                    <AlertDescription>
                                        {isDuplicate
                                            ? "This reference number already exists in your records."
                                            : "This reference number appears to be new."
                                        }
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
                            <Button className="w-full" size="lg" onClick={handleAddTransaction} disabled={isDuplicate}>Add Transaction</Button>
                        )}
                    </>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
    