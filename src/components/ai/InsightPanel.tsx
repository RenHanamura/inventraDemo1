import { X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InsightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  insights: string[];
  isLoading: boolean;
}

export function InsightPanel({ isOpen, onClose, insights, isLoading }: InsightPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Análisis IA</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 py-4 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground animate-pulse">✨ IA analizando...</span>
        </div>
      ) : insights.length > 0 ? (
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={i} className="text-sm leading-relaxed bg-background/60 rounded-xl p-3">
              {insight}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground py-2">No se generaron insights.</p>
      )}
    </div>
  );
}
