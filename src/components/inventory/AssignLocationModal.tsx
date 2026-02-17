import { useState } from 'react';
import { X, Loader2, MapPin, Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useLocations } from '@/hooks/useLocations';
import { useProductStockByLocation, useUpdateStockLevel } from '@/hooks/useStockLevels';
import { Product } from '@/hooks/useProducts';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AssignLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function AssignLocationModal({ isOpen, onClose, product }: AssignLocationModalProps) {
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [quantity, setQuantity] = useState('');

  const { data: locations = [] } = useLocations();
  const { data: productStock = [], isLoading: stockLoading } = useProductStockByLocation(product?.id || '');
  const updateStockLevel = useUpdateStockLevel();

  // Get locations where product already exists
  const existingLocationIds = new Set(productStock.map(s => s.location_id));
  
  // Locations available for new assignment
  const availableLocations = locations.filter(l => 
    l.status === 'active' && !existingLocationIds.has(l.id)
  );

  const handleAssign = async () => {
    if (!product || !selectedLocationId || !quantity) return;

    try {
      await updateStockLevel.mutateAsync({
        productId: product.id,
        locationId: selectedLocationId,
        quantity: parseInt(quantity),
      });

      toast({
        title: 'Stock assigned',
        description: `Added ${quantity} units to ${locations.find(l => l.id === selectedLocationId)?.name}`,
      });

      setSelectedLocationId('');
      setQuantity('');
      onClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdateStock = async (locationId: string, newQuantity: number) => {
    if (!product) return;

    try {
      await updateStockLevel.mutateAsync({
        productId: product.id,
        locationId,
        quantity: newQuantity,
      });

      toast({
        title: 'Stock updated',
        description: 'Stock level has been updated',
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  if (!product) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
        {/* Header */}
        <SheetHeader className="px-4 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">Manage Stock Locations</SheetTitle>
            <button 
              onClick={onClose}
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Product Info */}
          <div className="flex items-center gap-3 mt-4">
            <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
              <img
                src={product.image_url || '/placeholder.svg'}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.sku}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Current Stock Distribution */}
          <div className="space-y-3">
            <h4 className="font-semibold text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Current Stock Distribution
            </h4>
            
            {stockLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : productStock.length > 0 ? (
              <div className="space-y-2">
                {productStock.map((stock) => (
                  <div 
                    key={stock.id}
                    className="flex items-center justify-between bg-muted/50 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{stock.location?.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{stock.location?.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={stock.quantity}
                        onChange={(e) => handleUpdateStock(stock.location_id, parseInt(e.target.value) || 0)}
                        className="w-20 h-10 text-center rounded-lg"
                      />
                      <span className="text-sm text-muted-foreground">units</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
                <p className="text-destructive font-medium">⚠️ Unassigned Product</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This product has no stock at any location
                </p>
              </div>
            )}
          </div>

          {/* Add to New Location */}
          {availableLocations.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Stock to New Location
              </h4>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Select Location</Label>
                  <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger className="h-14 text-base rounded-xl">
                      <SelectValue placeholder="Choose a location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id} className="py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{location.name}</span>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {location.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Initial Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="h-14 text-lg rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {availableLocations.length === 0 && productStock.length > 0 && (
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-muted-foreground">
                Product is assigned to all available locations
              </p>
            </div>
          )}
        </div>

        {/* Fixed Bottom Button */}
        {availableLocations.length > 0 && (
          <div className="sticky bottom-0 p-4 bg-background border-t border-border safe-area-bottom">
            <Button 
              onClick={handleAssign}
              disabled={!selectedLocationId || !quantity || updateStockLevel.isPending}
              className={cn(
                "w-full h-16 text-lg font-semibold rounded-2xl gap-2",
                "bg-primary hover:bg-primary/90"
              )}
            >
              {updateStockLevel.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
              <MapPin className="h-5 w-5" />
              Confirm Assignment
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
