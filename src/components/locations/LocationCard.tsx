import { Edit2, Trash2, MapPin, Building2, Store, Warehouse, Package, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Location, LocationType } from '@/hooks/useLocations';
import { cn } from '@/lib/utils';

const locationTypeIcons = {
  warehouse: Warehouse,
  store: Store,
  central: Building2,
};

const locationTypeLabels = {
  warehouse: 'Warehouse',
  store: 'Store',
  central: 'Central',
};

const locationTypeColors = {
  warehouse: 'bg-blue-500/10 text-blue-600',
  store: 'bg-green-500/10 text-green-600',
  central: 'bg-purple-500/10 text-purple-600',
};

interface LocationCardProps {
  location: Location;
  totalItems: number;
  totalValue: number;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onClick?: () => void;
}

export function LocationCard({ 
  location, 
  totalItems, 
  totalValue, 
  onEdit, 
  onDelete,
  onClick 
}: LocationCardProps) {
  const Icon = locationTypeIcons[location.type];
  const isActive = location.status === 'active';
  
  return (
    <Card 
      className={cn(
        "rounded-2xl overflow-hidden transition-all touch-manipulation",
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.98]",
        !isActive && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Header Section */}
        <div className={cn(
          "p-4 pb-3",
          locationTypeColors[location.type]
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-background/80 backdrop-blur flex items-center justify-center shadow-sm">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">{location.name}</h3>
                <p className="text-sm text-muted-foreground">{locationTypeLabels[location.type]}</p>
              </div>
            </div>
            <Badge 
              variant={isActive ? 'default' : 'secondary'}
              className={cn(
                "text-xs",
                isActive && "bg-success hover:bg-success/80"
              )}
            >
              {location.status}
            </Badge>
          </div>
        </div>

        {/* Stats Section */}
        <div className="p-4 pt-3 space-y-3">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium">Items</span>
              </div>
              <p className="text-2xl font-bold">{totalItems.toLocaleString()}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Value</span>
              </div>
              <p className="text-2xl font-bold">
                ${totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Address */}
          {location.address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{location.address}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 h-11 rounded-xl gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(location);
              }}
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-11 w-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(location);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
