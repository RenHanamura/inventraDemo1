import { ArrowRight, Package, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InternalTransfer } from '@/hooks/useInternalTransfers';
import { format } from 'date-fns';

interface TransferHistoryCardProps {
  transfer: InternalTransfer;
}

export function TransferHistoryCard({ transfer }: TransferHistoryCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-6 w-6 text-primary" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{transfer.product?.name || 'Unknown Product'}</p>
                <p className="text-sm text-muted-foreground">{transfer.product?.sku}</p>
              </div>
              <Badge variant="secondary" className="text-base shrink-0">
                {transfer.quantity}
              </Badge>
            </div>

            {/* Locations */}
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="font-medium">{transfer.from_location?.name}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{transfer.to_location?.name}</span>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(transfer.created_at), 'MMM d, yyyy · h:mm a')}
            </div>

            {/* Notes */}
            {transfer.notes && (
              <p className="text-sm text-muted-foreground mt-2 bg-muted/50 rounded-lg p-2">
                {transfer.notes}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
