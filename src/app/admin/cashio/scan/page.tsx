
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowUp, ArrowDown, Camera, VideoOff, SwitchCamera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type TransactionType = 'Cash In' | 'Cash Out';

export default function ScanImagePage() {
  const [step, setStep] = useState(1);
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (step !== 2) {
      // Clean up camera when leaving step 2
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }

    const getCameraPermission = async () => {
      // Stop any existing stream before starting a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode }
        });
        streamRef.current = stream; // Store stream to manage it
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

    // Cleanup function
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

  return (
    <div className="space-y-6">
       <Button asChild variant="outline">
          <Link href="/admin/cashio">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cash IO
          </Link>
        </Button>
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Scan Transaction Image</CardTitle>
          <CardDescription>
            {step === 1 
              ? 'First, select the type of transaction you are scanning.' 
              : 'Position the receipt or message in the frame and press scan.'}
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

                <Button size="lg" className="w-full" disabled={!hasCameraPermission}>
                    <Camera className="mr-2 h-5 w-5" />
                    Scan
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
