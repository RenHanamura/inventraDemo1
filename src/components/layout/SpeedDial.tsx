import { useState } from 'react';
import { Plus, X, Sparkles, ArrowRightLeft, Package, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeedDialAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  onClick: () => void;
}

interface SpeedDialProps {
  onAskAI: () => void;
  onTransfer: () => void;
  onAddProduct: () => void;
  onScan: () => void;
}

export function SpeedDial({ onAskAI, onTransfer, onAddProduct, onScan }: SpeedDialProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions: SpeedDialAction[] = [
    {
      id: 'ai',
      label: 'Ask Inventra AI',
      icon: <Sparkles className="h-5 w-5" />,
      colorClass: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25',
      onClick: () => {
        setIsExpanded(false);
        onAskAI();
      },
    },
    {
      id: 'transfer',
      label: 'New Transfer',
      icon: <ArrowRightLeft className="h-5 w-5" />,
      colorClass: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25',
      onClick: () => {
        setIsExpanded(false);
        onTransfer();
      },
    },
    {
      id: 'scan',
      label: 'Scan Barcode',
      icon: <Camera className="h-5 w-5" />,
      colorClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25',
      onClick: () => {
        setIsExpanded(false);
        onScan();
      },
    },
    {
      id: 'add',
      label: 'Add Product',
      icon: <Package className="h-5 w-5" />,
      colorClass: 'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
      onClick: () => {
        setIsExpanded(false);
        onAddProduct();
      },
    },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/70 backdrop-blur-sm transition-opacity duration-300",
          isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsExpanded(false)}
      />

      {/* Speed Dial Container */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse items-end gap-4">
        {/* Main FAB Trigger */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "h-16 w-16 rounded-full",
            "flex items-center justify-center transition-all duration-300 ease-out",
            "hover:scale-105 active:scale-95 touch-manipulation",
            "focus:outline-none focus:ring-4 focus:ring-primary/30",
            "shadow-xl shadow-primary/30",
            isExpanded 
              ? "bg-destructive text-destructive-foreground rotate-45 shadow-destructive/30" 
              : "bg-primary text-primary-foreground"
          )}
          aria-label={isExpanded ? "Close menu" : "Open quick actions"}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <X className="h-7 w-7 transition-transform duration-300" />
          ) : (
            <Plus className="h-7 w-7 transition-transform duration-300" />
          )}
        </button>

        {/* Action Buttons */}
        <div 
          className={cn(
            "flex flex-col items-end gap-4 transition-all duration-300",
            isExpanded 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-6 pointer-events-none"
          )}
        >
          {actions.map((action, index) => (
            <div
              key={action.id}
              className={cn(
                "flex items-center gap-3 transition-all duration-300",
                isExpanded 
                  ? "opacity-100 translate-x-0" 
                  : "opacity-0 translate-x-8"
              )}
              style={{
                transitionDelay: isExpanded ? `${index * 60}ms` : '0ms',
              }}
            >
              {/* Label */}
              <span 
                className={cn(
                  "px-4 py-2.5 rounded-xl bg-card/95 backdrop-blur-sm border border-border/50",
                  "text-sm font-semibold text-foreground whitespace-nowrap",
                  "shadow-lg transition-all duration-200",
                  isExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                )}
                style={{
                  transitionDelay: isExpanded ? `${(index * 60) + 80}ms` : '0ms',
                }}
              >
                {action.label}
              </span>

              {/* Action Button */}
              <button
                onClick={action.onClick}
                className={cn(
                  "h-14 w-14 rounded-full",
                  "flex items-center justify-center transition-all duration-200",
                  "hover:scale-110 active:scale-95 touch-manipulation",
                  "focus:outline-none focus:ring-2 focus:ring-white/50",
                  action.colorClass
                )}
                aria-label={action.label}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
