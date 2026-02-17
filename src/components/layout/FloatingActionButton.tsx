import { useState } from 'react';
import { Plus, X, Camera, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onScanClick: () => void;
  onAddProductClick: () => void;
}

export function FloatingActionButton({ onScanClick, onAddProductClick }: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleScan = () => {
    setIsExpanded(false);
    onScanClick();
  };

  const handleAddProduct = () => {
    setIsExpanded(false);
    onAddProductClick();
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-center gap-3">
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-background/60 backdrop-blur-sm -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center transition-all duration-300",
          "hover:bg-primary/90 active:scale-95 touch-manipulation",
          "focus:outline-none focus:ring-4 focus:ring-primary/30",
          isExpanded && "rotate-45 bg-destructive hover:bg-destructive/90"
        )}
      >
        {isExpanded ? <X className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
      </button>

      {/* Expanded Actions */}
      <div className={cn(
        "flex flex-col items-center gap-3 transition-all duration-300",
        isExpanded 
          ? "opacity-100 translate-y-0 pointer-events-auto" 
          : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {/* Add Product Button */}
        <button
          onClick={handleAddProduct}
          className={cn(
            "flex items-center gap-3 bg-card rounded-full shadow-lg px-5 py-4",
            "border border-border transition-all duration-200",
            "hover:bg-accent active:scale-95 touch-manipulation",
            "focus:outline-none focus:ring-2 focus:ring-primary/30"
          )}
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <span className="font-semibold text-foreground pr-2">Add Product</span>
        </button>

        {/* Scan Barcode Button */}
        <button
          onClick={handleScan}
          className={cn(
            "flex items-center gap-3 bg-card rounded-full shadow-lg px-5 py-4",
            "border border-border transition-all duration-200",
            "hover:bg-accent active:scale-95 touch-manipulation",
            "focus:outline-none focus:ring-2 focus:ring-primary/30"
          )}
        >
          <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
            <Camera className="h-6 w-6 text-success" />
          </div>
          <span className="font-semibold text-foreground pr-2">Scan Barcode</span>
        </button>
      </div>
    </div>
  );
}
