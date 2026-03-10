
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useZxing } from 'react-zxing';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { VideoOff, SwitchCamera, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onCancel: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onResult, onCancel }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);

  const { ref } = useZxing({
    onDecodeResult(result) {
      onResult(result.getText());
    },
    onError(error) {
      // Don't log common "Not Found" errors, they are noisy.
      if (!error.message.includes('No MultiFormat Readers found')) {
        console.error(error);
      }
    },
    constraints: { video: { facingMode, torch: isTorchOn } },
    paused: !hasPermission,
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    const checkPermissionsAndCapabilities = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);

        const tracks = stream.getVideoTracks();
        if (tracks.length > 0) {
            const capabilities = tracks[0].getCapabilities();
            setIsTorchSupported(!!capabilities.torch);
        } else {
            setIsTorchSupported(false);
        }
        
        tracks.forEach(track => track.stop());
      } catch (err) {
        console.error("Camera permission error:", err);
        setHasPermission(false);
      }
    };
    checkPermissionsAndCapabilities();

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, []);

  const handleToggleTorch = () => {
      if (isTorchSupported) {
          setIsTorchOn(prev => !prev);
      }
  }

  return (
    <div className="space-y-4">
      {hasPermission === null && <div className="text-center py-4">Requesting camera permission...</div>}
      
      {hasPermission === false && (
        <Alert variant="destructive">
            <VideoOff className="h-4 w-4" />
            <AlertTitle>Camera Permission Denied</AlertTitle>
            <AlertDescription>
                Please enable camera access in your browser settings to use the barcode scanner.
            </AlertDescription>
        </Alert>
      )}

      {hasPermission && (
          <div className="rounded-md overflow-hidden border relative bg-black">
            <video ref={ref} className="w-full h-auto" />
             <div className="absolute top-2 right-2 flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="bg-black/50 hover:bg-black/70 border-white/50 text-white hover:text-white">
                    <SwitchCamera className="h-5 w-5" />
                </Button>
                {isTorchSupported && (
                    <Button variant="outline" size="icon" onClick={handleToggleTorch} className={cn("bg-black/50 hover:bg-black/70 border-white/50 text-white hover:text-white", isTorchOn && "bg-amber-400/80 text-white border-amber-400/80 hover:bg-amber-500/80")}>
                        <Zap className="h-5 w-5" />
                    </Button>
                )}
             </div>
          </div>
      )}

      <Button onClick={onCancel} variant="outline" className="w-full">
        Cancel
      </Button>
    </div>
  );
};

export default BarcodeScanner;
