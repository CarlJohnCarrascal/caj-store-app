
'use client';

import React, { useState, useEffect } from 'react';
import { useZxing } from 'react-zxing';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { VideoOff } from 'lucide-react';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onCancel: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onResult, onCancel }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { ref } = useZxing({
    onDecodeResult(result) {
      onResult(result.getText());
    },
    onError(error) {
      console.error(error);
    },
    paused: !hasPermission,
  });

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        // Important: stop the tracks immediately after checking permission
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        setHasPermission(false);
      }
    };
    checkPermissions();
  }, []);

  return (
    <div className="space-y-4">
      {hasPermission === null && <div>Requesting camera permission...</div>}
      
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
          <div className="rounded-md overflow-hidden border">
            <video ref={ref} className="w-full h-auto" />
          </div>
      )}

      <Button onClick={onCancel} variant="outline" className="w-full">
        Cancel
      </Button>
    </div>
  );
};

export default BarcodeScanner;
