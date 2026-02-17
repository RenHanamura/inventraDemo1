import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { Header } from './Header';
import { SpeedDial } from './SpeedDial';
import { InventraChatPanel } from '@/components/chat/InventraChatPanel';
import { FullScreenProductModal } from '@/components/inventory';
import { ScannerModal } from '@/components/scanner';
import { TransferWizardModal } from '@/components/locations';
import { useInventraChat } from '@/hooks/useInventraChat';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useOrgBrandColor } from '@/hooks/useOrgBrandColor';
import { toast } from 'sonner';
export function AppLayout() {
  // Apply org brand color on mount - single source of truth
  useOrgBrandColor();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Chat state
  const {
    messages,
    isLoading: chatLoading,
    isOpen: isChatOpen,
    setIsOpen: setIsChatOpen,
    sendMessage,
    handleAction,
    clearChat,
    quickPrompts,
  } = useInventraChat();

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Transfer wizard state
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const handleAskAI = () => {
    setIsChatOpen(true);
  };

  const handleTransfer = () => {
    setIsTransferOpen(true);
  };

  const handleAddProduct = () => {
    // If we're on inventory or dashboard, let those pages handle it
    if (location.pathname === '/inventory' || location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('openAddProduct'));
    } else {
      setIsProductModalOpen(true);
    }
  };

  const handleScan = () => {
    // If we're on inventory or dashboard, let those pages handle it
    if (location.pathname === '/inventory' || location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('openScanner'));
    } else {
      setIsScannerOpen(true);
    }
  };

  const handleScanResult = (code: string) => {
    setIsScannerOpen(false);
    // Navigate to inventory with the search query
    navigate(`/inventory?search=${encodeURIComponent(code)}`);
  };

  // Barcode scanner pistol support - listens for rapid keyboard input
  useBarcodeScanner({
    onScan: (code) => {
      // Normalize scan input: some scanners send "/" instead of "-"
      const normalizedCode = code.trim().replace(/\//g, '-');
      if (normalizedCode) {
        toast.success(`Scanned: ${normalizedCode}`, {
          description: 'Searching inventory...',
          duration: 2000,
        });
        navigate(`/inventory?search=${encodeURIComponent(normalizedCode)}`);
      }
    },
    enabled: true,
    minLength: 3,
    maxDelay: 100,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenAI={handleAskAI} />
      <main className="p-4 pt-20 pb-24">
        <Outlet />
      </main>
      <BottomTabBar />
      
      {/* Unified Speed Dial - hidden on settings page to avoid overlapping UI */}
      {location.pathname !== '/settings' && (
        <SpeedDial
          onAskAI={handleAskAI}
          onTransfer={handleTransfer}
          onAddProduct={handleAddProduct}
          onScan={handleScan}
        />
      )}

      {/* Inventra AI Chat Panel */}
      <InventraChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        isLoading={chatLoading}
        onSendMessage={sendMessage}
        onAction={handleAction}
        onClear={clearChat}
        quickPrompts={quickPrompts}
      />

      {/* Global Product Modal (for non-inventory pages) */}
      {location.pathname !== '/inventory' && (
        <FullScreenProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          product={null}
        />
      )}

      {/* Global Scanner Modal (for non-inventory pages) */}
      {location.pathname !== '/inventory' && (
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleScanResult}
        />
      )}

      {/* Global Transfer Wizard */}
      <TransferWizardModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
      />
    </div>
  );
}
