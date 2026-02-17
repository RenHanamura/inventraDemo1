import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      {/* Icon or Emoji */}
      {emoji ? (
        <span className="text-6xl mb-4">{emoji}</span>
      ) : icon ? (
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      ) : null}

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          size="lg"
          className="h-14 px-8 text-base font-semibold rounded-xl"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
