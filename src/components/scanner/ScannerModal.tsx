import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { X, Flashlight, FlashlightOff, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function ScannerModal({ isOpen, onClose, onScan }: ScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('Could not play beep sound');
    }
  }, []);

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    playBeep();
    triggerHaptic();
    onScan(decodedText);
    onClose();
  }, [onScan, onClose, playBeep, triggerHaptic]);

  const startScanner = useCallback(async () => {
    if (isStarting || isScanning) return;
    
    setIsStarting(true);
    setError(null);

    try {
      const scanner = new Html5Qrcode('scanner-container');
      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        setError('No camera found on this device.');
        setIsStarting(false);
        return;
      }

      // Prefer back camera
      const backCamera = cameras.find(c => 
        c.label.toLowerCase().includes('back') || 
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('environment')
      );
      const cameraId = backCamera?.id || cameras[0].id;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        handleScanSuccess,
        () => {} // Ignore scan errors (no QR found yet)
      );

      setIsScanning(true);

      // Check for flash support
      try {
        const track = scanner.getRunningTrackCameraCapabilities();
        if (track && track.torchFeature && track.torchFeature().isSupported()) {
          setHasFlash(true);
        }
      } catch {
        setHasFlash(false);
      }
    } catch (err: any) {
      console.error('Scanner error:', err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else {
        setError('Failed to start camera. Please try again.');
      }
    } finally {
      setIsStarting(false);
    }
  }, [handleScanSuccess, isScanning, isStarting]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.log('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setFlashOn(false);
    setHasFlash(false);
    setError(null);
  }, []);

  const toggleFlash = useCallback(async () => {
    if (!scannerRef.current || !hasFlash) return;
    
    try {
      const track = scannerRef.current.getRunningTrackCameraCapabilities();
      if (track && track.torchFeature && track.torchFeature().isSupported()) {
        await track.torchFeature().apply(!flashOn);
        setFlashOn(!flashOn);
      }
    } catch (e) {
      console.log('Could not toggle flash:', e);
    }
  }, [flashOn, hasFlash]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden" 
        aria-describedby="scanner-description"
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Barcode / QR Code
          </DialogTitle>
          <DialogDescription id="scanner-description" className="sr-only">
            Point your camera at a barcode or QR code to scan
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          {/* Scanner Container */}
          <div 
            id="scanner-container" 
            className="w-full aspect-square bg-black relative"
          />
          
          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Darkened corners */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 relative">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-primary/80 animate-pulse" 
                    style={{ 
                      top: '50%',
                      animation: 'scanLine 2s ease-in-out infinite'
                    }} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isStarting && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-2" />
                <p>Starting camera...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="text-destructive text-4xl mb-4">⚠️</div>
                <p className="text-white mb-4">{error}</p>
                <Button onClick={startScanner} variant="secondary">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Flash toggle */}
          {hasFlash && isScanning && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              onClick={toggleFlash}
            >
              {flashOn ? (
                <FlashlightOff className="h-5 w-5" />
              ) : (
                <Flashlight className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 text-center text-sm text-muted-foreground">
          Position the barcode or QR code within the scanning area
        </div>

        {/* Close button */}
        <div className="p-4 pt-0">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>

      <style>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(-100px); opacity: 0; }
          50% { transform: translateY(100px); opacity: 1; }
        }
      `}</style>
    </Dialog>
  );
}
