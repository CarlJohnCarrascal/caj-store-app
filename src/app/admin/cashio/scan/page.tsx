
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ArrowUp, ArrowDown, Camera, Video, VideoOff } from 'lucide-react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (step === 2) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
          // Cleanup: stop video stream when component unmounts or step changes
          if(videoRef.current && videoRef.current.srcObject) {
              const stream = videoRef.current.srcObject as MediaStream;
              stream.getTracks().forEach(track => track.stop());
          }
      }
    }
  }, [step, toast]);
  
  const handleSelectType = (type: TransactionType) => {
    setTransactionType(type);
    setStep(2);
  };

  return (
    <div className="space-y-6">
       <Button asChild variant="outline">
          <Link href="/admin/cashio">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cash IO
          </Link>
        </Button>
      <Card className="max-w-2xl mx-auto">
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
                <div className="w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className={cn("w-full h-full object-cover", hasCameraPermission === false && "hidden")} autoPlay muted playsInline />
                    {hasCameraPermission === null && <p>Requesting camera...</p>}
                    {hasCameraPermission === false && (
                         <div className="text-center text-muted-foreground p-4">
                            <VideoOff className="h-12 w-12 mx-auto mb-2" />
                            <p>Camera access denied.</p>
                         </div>
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
