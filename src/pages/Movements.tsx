import { useState, useRef } from "react";
import { useAIInsights } from "@/hooks/useAIInsights";
import { InsightPanel } from "@/components/ai/InsightPanel";
import { Loader2, Camera, ArrowDown, ArrowUp, Package, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScannerModal } from "@/components/scanner";
import { EmptyState } from "@/components/ui/empty-state";

import { useMovements, useCreateMovement } from "@/hooks/useMovements";
import { useProducts } from "@/hooks/useProducts";
import { useLocations } from "@/hooks/useLocations";
import { useStockLevels } from "@/hooks/useStockLevels";
import { useLocationContext } from "@/contexts/LocationContext";
import { LocationSwitcher } from "@/components/layout/LocationSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";

export default function Movements() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const aiInsights = useAIInsights('movements');
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    notes: "",
    locationId: "",
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const quantityInputRef = useRef<HTMLInputElement>(null);

  const { selectedLocationId, isGlobalView } = useLocationContext();

  const { data: movements = [], isLoading } = useMovements();
  const { data: products = [] } = useProducts();
  const { data: locations = [] } = useLocations();
  const { data: stockLevels = [] } = useStockLevels();
  const createMovement = useCreateMovement();

  const activeLocations = locations.filter((l) => l.status === "active");

  const handleScan = (code: string) => {
    const product = products.find((p) => p.sku.toLowerCase() === code.toLowerCase() || p.sku === code);
    if (product) {
      setFormData((prev) => ({ ...prev, productId: product.id }));
      setTimeout(() => quantityInputRef.current?.focus(), 100);
    }
    setIsScannerOpen(false);
  };

  const filteredMovements = movements.filter((m) => m.type === tab);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMovement.mutateAsync({
      product_id: formData.productId,
      type: tab as "incoming" | "outgoing",
      quantity: parseInt(formData.quantity),
      notes: formData.notes || undefined,
      location_id: formData.locationId || selectedLocationId || undefined,
    });
    setFormData({ productId: "", quantity: "", notes: "", locationId: "" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const typeLabel = tab === "incoming" ? t('movements.incoming') : t('movements.outgoing');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('movements.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('movements.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={aiInsights.analyze} disabled={aiInsights.isLoading} className="gap-1.5 rounded-xl">
            <Sparkles className="h-4 w-4" />
            {t('inventory.analyzeAI')}
          </Button>
          <LocationSwitcher />
        </div>
      </div>

      <InsightPanel isOpen={aiInsights.isOpen} onClose={() => aiInsights.setIsOpen(false)} insights={aiInsights.insights} isLoading={aiInsights.isLoading} />

      {!isGlobalView && (
        <Badge variant="secondary" className="gap-1">
          <MapPin className="h-3 w-3" />
          {locations.find((l) => l.id === selectedLocationId)?.name}
        </Badge>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "incoming" | "outgoing")}>
        <TabsList className="w-full h-12 p-1 rounded-2xl bg-muted">
          <TabsTrigger value="incoming" className="flex-1 h-10 rounded-xl gap-2 data-[state=active]:bg-card">
            <ArrowDown className="h-4 w-4" />
            {t('movements.incoming')}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="flex-1 h-10 rounded-xl gap-2 data-[state=active]:bg-card">
            <ArrowUp className="h-4 w-4" />
            {t('movements.outgoing')}
          </TabsTrigger>
        </TabsList>

        {(tab === "incoming" || tab === "outgoing") && (
          <TabsContent value={tab} className="space-y-4 mt-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {tab === "incoming" ? <ArrowDown className="h-5 w-5 text-success" /> : <ArrowUp className="h-5 w-5 text-destructive" />}
                  {tab === "incoming" ? t('movements.recordIncoming') : t('movements.recordOutgoing')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">{t('movements.product')}</Label>
                    <div className="flex gap-2">
                      <Select value={formData.productId} onValueChange={(value) => setFormData((prev) => ({ ...prev, productId: value }))}>
                        <SelectTrigger className="flex-1 h-14 text-base rounded-xl">
                          <SelectValue placeholder={t('movements.selectProduct')} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id} className="py-3">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                {product.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" onClick={() => setIsScannerOpen(true)} className="h-14 w-14 rounded-xl shrink-0">
                        <Camera className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {isGlobalView && (
                    <div className="space-y-2">
                      <Label className="text-base">{t('movements.location')}</Label>
                      <Select value={formData.locationId} onValueChange={(value) => setFormData((prev) => ({ ...prev, locationId: value }))}>
                        <SelectTrigger className="h-14 text-base rounded-xl">
                          <SelectValue placeholder={t('movements.selectLocation')} />
                        </SelectTrigger>
                        <SelectContent>
                          {activeLocations.map((location) => (
                            <SelectItem key={location.id} value={location.id} className="py-3">{location.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-base">{t('movements.quantity')}</Label>
                    <Input ref={quantityInputRef} type="number" min="1" value={formData.quantity} onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))} required className="h-14 text-lg rounded-xl" placeholder={t('movements.enterQuantity')} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">{t('movements.notes')}</Label>
                    <Textarea value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} className="rounded-xl resize-none" rows={2} placeholder={t('movements.addNotes')} />
                  </div>

                  <Button type="submit" className="w-full h-14 text-base font-semibold rounded-xl" disabled={!formData.productId || !formData.quantity || createMovement.isPending}>
                    {createMovement.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    {tab === "incoming" ? t('movements.recordIncoming') : t('movements.recordOutgoing')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">{tab === "incoming" ? t('movements.recentIncoming') : t('movements.recentOutgoing')}</h3>

              {filteredMovements.length > 0 ? (
                <div className="space-y-3">
                  {filteredMovements.slice(0, 10).map((movement) => (
                    <Card key={movement.id} className="rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${movement.type === "incoming" ? "bg-success/10" : "bg-destructive/10"}`}>
                              {movement.type === "incoming" ? <ArrowDown className="h-6 w-6 text-success" /> : <ArrowUp className="h-6 w-6 text-destructive" />}
                            </div>
                            <div>
                              <p className="font-semibold">{movement.product?.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">{format(new Date(movement.created_at), "MMM d, yyyy · h:mm a")}</p>
                            </div>
                          </div>
                          <Badge variant={movement.type === "incoming" ? "default" : "secondary"} className={`text-lg px-4 py-1 ${movement.type === "incoming" ? "bg-success hover:bg-success/80" : ""}`}>
                            {movement.type === "incoming" ? "+" : "-"}{movement.quantity}
                          </Badge>
                        </div>
                        {movement.notes && (
                          <p className="text-sm text-muted-foreground mt-3 bg-muted/50 rounded-lg p-2">{movement.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  emoji={tab === "incoming" ? "📥" : "📤"}
                  title={t('movements.noMovements', { type: typeLabel.toLowerCase() })}
                  description={t('movements.noMovementsDesc', { type: typeLabel.toLowerCase() })}
                />
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScan} />
    </div>
  );
}
