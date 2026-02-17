import { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Package, 
  MapPin, 
  Loader2,
  Camera,
  Warehouse,
  Store,
  Building2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProducts, Product } from '@/hooks/useProducts';
import { useLocations, Location } from '@/hooks/useLocations';
import { useStockLevels } from '@/hooks/useStockLevels';
import { useCreateInternalTransfer } from '@/hooks/useInternalTransfers';
import { ScannerModal } from '@/components/scanner';
import { cn } from '@/lib/utils';

type WizardStep = 'origin' | 'product' | 'destination' | 'confirm';

const locationTypeIcons = {
  warehouse: Warehouse,
  store: Store,
  central: Building2,
};

interface TransferWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransferWizardModal({ isOpen, onClose }: TransferWizardModalProps) {
  const [step, setStep] = useState<WizardStep>('origin');
  const [originId, setOriginId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products = [] } = useProducts();
  const { data: locations = [] } = useLocations();
  const { data: stockLevels = [] } = useStockLevels();
  const createTransfer = useCreateInternalTransfer();

  const activeLocations = locations.filter(l => l.status === 'active');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('origin');
      setOriginId('');
      setProductId('');
      setQuantity('');
      setDestinationId('');
      setNotes('');
      setSearchQuery('');
    }
  }, [isOpen]);

  // Get stock at a specific location for a product
  const getStockAtLocation = (pId: string, lId: string) => {
    const stock = stockLevels.find(sl => sl.product_id === pId && sl.location_id === lId);
    return stock?.quantity || 0;
  };

  // Get products available at origin location
  const productsAtOrigin = stockLevels
    .filter(sl => sl.location_id === originId && sl.quantity > 0)
    .map(sl => {
      const product = products.find(p => p.id === sl.product_id);
      return product ? { ...product, availableQty: sl.quantity } : null;
    })
    .filter(Boolean) as (Product & { availableQty: number })[];

  // Filter products by search
  const filteredProducts = productsAtOrigin.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get location stats
  const getLocationStats = (locationId: string) => {
    const locationStock = stockLevels.filter(sl => sl.location_id === locationId);
    const totalItems = locationStock.reduce((sum, sl) => sum + sl.quantity, 0);
    const totalValue = locationStock.reduce((sum, sl) => {
      const product = products.find(p => p.id === sl.product_id);
      return sum + (sl.quantity * (product?.unit_price || 0));
    }, 0);
    return { totalItems, totalValue };
  };

  const selectedOrigin = locations.find(l => l.id === originId);
  const selectedProduct = products.find(p => p.id === productId);
  const selectedDestination = locations.find(l => l.id === destinationId);
  const availableStock = originId && productId ? getStockAtLocation(productId, originId) : 0;
  const quantityNum = parseInt(quantity) || 0;
  const isQuantityValid = quantityNum > 0 && quantityNum <= availableStock;

  const handleScan = (code: string) => {
    const product = productsAtOrigin.find(p => 
      p.sku.toLowerCase() === code.toLowerCase() || p.sku === code
    );
    if (product) {
      setProductId(product.id);
    }
    setIsScannerOpen(false);
  };

  const handleSubmit = async () => {
    if (!originId || !productId || !destinationId || !isQuantityValid) return;
    
    await createTransfer.mutateAsync({
      product_id: productId,
      from_location_id: originId,
      to_location_id: destinationId,
      quantity: quantityNum,
      notes: notes || undefined,
    });
    
    onClose();
  };

  const renderStepIndicator = () => {
    const steps: { key: WizardStep; label: string }[] = [
      { key: 'origin', label: 'Origin' },
      { key: 'product', label: 'Product' },
      { key: 'destination', label: 'Destination' },
      { key: 'confirm', label: 'Confirm' },
    ];

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div 
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                index < currentIndex && "bg-primary text-primary-foreground",
                index === currentIndex && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                index > currentIndex && "bg-muted text-muted-foreground"
              )}
            >
              {index < currentIndex ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "h-1 w-8 mx-1 rounded-full transition-colors",
                  index < currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderOriginStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold">Where is the stock coming from?</h3>
        <p className="text-muted-foreground">Select the origin location</p>
      </div>

      <ScrollArea className="h-[400px] -mx-6 px-6">
        <div className="space-y-3">
          {activeLocations.map((location) => {
            const stats = getLocationStats(location.id);
            const Icon = locationTypeIcons[location.type];
            const isSelected = originId === location.id;
            
            return (
              <Card 
                key={location.id}
                className={cn(
                  "rounded-2xl cursor-pointer transition-all touch-manipulation",
                  isSelected 
                    ? "ring-2 ring-primary bg-primary/5" 
                    : "hover:bg-muted/50 active:scale-[0.98]"
                )}
                onClick={() => setOriginId(location.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg">{location.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {stats.totalItems} items · ${stats.totalValue.toFixed(0)} value
                      </p>
                    </div>
                    {isSelected && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <Button 
        onClick={() => setStep('product')}
        disabled={!originId}
        className="w-full h-14 text-base font-semibold rounded-xl gap-2"
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );

  const renderProductStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">Select Product & Quantity</h3>
        <p className="text-muted-foreground">
          From: <span className="font-medium text-foreground">{selectedOrigin?.name}</span>
        </p>
      </div>

      {/* Search / Scan */}
      <div className="flex gap-2">
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 rounded-xl flex-1"
        />
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setIsScannerOpen(true)}
          className="h-12 w-12 rounded-xl shrink-0"
        >
          <Camera className="h-5 w-5" />
        </Button>
      </div>

      {/* Product List */}
      <ScrollArea className="h-[280px] -mx-6 px-6">
        <div className="space-y-2">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const isSelected = productId === product.id;
              
              return (
                <Card 
                  key={product.id}
                  className={cn(
                    "rounded-xl cursor-pointer transition-all touch-manipulation",
                    isSelected 
                      ? "ring-2 ring-primary bg-primary/5" 
                      : "hover:bg-muted/50 active:scale-[0.98]"
                  )}
                  onClick={() => setProductId(product.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                      <Badge variant="secondary" className="text-base">
                        {product.availableQty}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No products with stock at this location</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quantity Input */}
      {productId && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-base">Quantity to transfer</Label>
            <span className="text-sm text-muted-foreground">
              Available: <span className="font-medium">{availableStock}</span>
            </span>
          </div>
          <Input
            type="number"
            min="1"
            max={availableStock}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            className="h-14 text-xl text-center rounded-xl"
          />
          {quantity && !isQuantityValid && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Quantity must be between 1 and {availableStock}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button 
          variant="outline"
          onClick={() => setStep('origin')}
          className="flex-1 h-14 rounded-xl gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>
        <Button 
          onClick={() => setStep('destination')}
          disabled={!productId || !isQuantityValid}
          className="flex-1 h-14 text-base font-semibold rounded-xl gap-2"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const renderDestinationStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">Where is it going?</h3>
        <p className="text-muted-foreground">Select the destination location</p>
      </div>

      {/* Transfer Summary */}
      <Card className="rounded-xl bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{selectedProduct?.name}</p>
              <p className="text-sm text-muted-foreground">
                {quantityNum} units from {selectedOrigin?.name}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[320px] -mx-6 px-6">
        <div className="space-y-3">
          {activeLocations
            .filter(l => l.id !== originId)
            .map((location) => {
              const stats = getLocationStats(location.id);
              const currentStock = getStockAtLocation(productId, location.id);
              const Icon = locationTypeIcons[location.type];
              const isSelected = destinationId === location.id;
              
              return (
                <Card 
                  key={location.id}
                  className={cn(
                    "rounded-2xl cursor-pointer transition-all touch-manipulation",
                    isSelected 
                      ? "ring-2 ring-primary bg-primary/5" 
                      : "hover:bg-muted/50 active:scale-[0.98]"
                  )}
                  onClick={() => setDestinationId(location.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-lg">{location.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Current stock: {currentStock} → {currentStock + quantityNum}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-5 w-5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </ScrollArea>

      <div className="flex gap-3">
        <Button 
          variant="outline"
          onClick={() => setStep('product')}
          className="flex-1 h-14 rounded-xl gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>
        <Button 
          onClick={() => setStep('confirm')}
          disabled={!destinationId}
          className="flex-1 h-14 text-base font-semibold rounded-xl gap-2"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">Confirm Transfer</h3>
        <p className="text-muted-foreground">Review the transfer details</p>
      </div>

      {/* Transfer Visual */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            {/* Origin */}
            <div className="text-center flex-1">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-2">
                {selectedOrigin && (() => {
                  const Icon = locationTypeIcons[selectedOrigin.type];
                  return <Icon className="h-8 w-8 text-muted-foreground" />;
                })()}
              </div>
              <p className="font-semibold">{selectedOrigin?.name}</p>
              <p className="text-sm text-muted-foreground">Origin</p>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="h-8 w-8 text-primary" />
              <Badge className="bg-primary text-primary-foreground">
                {quantityNum} units
              </Badge>
            </div>

            {/* Destination */}
            <div className="text-center flex-1">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-2">
                {selectedDestination && (() => {
                  const Icon = locationTypeIcons[selectedDestination.type];
                  return <Icon className="h-8 w-8 text-muted-foreground" />;
                })()}
              </div>
              <p className="font-semibold">{selectedDestination?.name}</p>
              <p className="text-sm text-muted-foreground">Destination</p>
            </div>
          </div>

          {/* Product Info */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{selectedProduct?.name}</p>
                <p className="text-sm text-muted-foreground">SKU: {selectedProduct?.sku}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-base">Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this transfer..."
          className="rounded-xl resize-none"
          rows={2}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button 
          variant="outline"
          onClick={() => setStep('destination')}
          className="flex-1 h-14 rounded-xl gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={createTransfer.isPending}
          className="flex-1 h-14 text-base font-semibold rounded-xl gap-2 bg-success hover:bg-success/90"
        >
          {createTransfer.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Check className="h-5 w-5" />
          )}
          Complete Transfer
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] p-0 rounded-2xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="sr-only">New Transfer</DialogTitle>
            <DialogDescription className="sr-only">
              Transfer stock between locations
            </DialogDescription>
            {renderStepIndicator()}
          </DialogHeader>
          
          <div className="p-6 pt-0">
            {step === 'origin' && renderOriginStep()}
            {step === 'product' && renderProductStep()}
            {step === 'destination' && renderDestinationStep()}
            {step === 'confirm' && renderConfirmStep()}
          </div>
        </DialogContent>
      </Dialog>

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />
    </>
  );
}
