import { useEffect, useCallback, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (code: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxDelay?: number; // Max delay between keystrokes in ms
}

/**
 * Hook to detect barcode scanner pistol input.
 * Barcode scanners typically emit rapid keystrokes followed by Enter.
 * This hook differentiates scanner input from normal typing by:
 * 1. Tracking keystroke speed (scanners are much faster than humans)
 * 2. Looking for Enter key to complete the scan
 * 3. Ignoring input when user is focused on form fields
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 3,
  maxDelay = 100, // Increased to 100ms to support more scanner types
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeystrokeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

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

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;
      const isInModal = target.closest('[role="dialog"]') !== null;

      // Always ignore when modals are open
      if (isInModal) {
        clearBuffer();
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeystrokeRef.current;
      lastKeystrokeRef.current = now;

      // If too much time has passed, start fresh
      if (timeSinceLastKey > maxDelay && bufferRef.current.length > 0) {
        clearBuffer();
      }

      // Handle Enter key - complete the scan
      if (event.key === 'Enter') {
        // Only trigger scan if we have enough characters AND they came fast (scanner speed)
        // This prevents triggering on manual Enter presses
        if (bufferRef.current.length >= minLength) {
          event.preventDefault();
          event.stopPropagation();
          playBeep();
          triggerHaptic();
          
          // Clear any input field that might have captured partial input
          if (isInputField && target.tagName === 'INPUT') {
            (target as HTMLInputElement).value = '';
          }
          
          onScan(bufferRef.current);
        }
        clearBuffer();
        return;
      }

      // Only accept printable characters
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // For scanner detection: track if keys are coming in rapidly
        const isRapidInput = timeSinceLastKey < maxDelay || bufferRef.current.length === 0;
        
        if (isRapidInput) {
          bufferRef.current += event.key;

          // Set a timeout to clear the buffer if no more input comes
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(clearBuffer, maxDelay * 2);
        } else {
          // Too slow - this is manual typing, clear buffer
          clearBuffer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      clearBuffer();
    };
  }, [enabled, onScan, minLength, maxDelay, clearBuffer, playBeep, triggerHaptic]);

  return { clearBuffer };
}
