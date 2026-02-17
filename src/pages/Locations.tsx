import { useState } from 'react';
import { Plus, Loader2, Warehouse, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LocationCard, TransferWizardModal, TransferHistoryCard } from '@/components/locations';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, Location, LocationType } from '@/hooks/useLocations';
import { useProducts } from '@/hooks/useProducts';
import { useStockLevels } from '@/hooks/useStockLevels';
import { useInternalTransfers } from '@/hooks/useInternalTransfers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Locations() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'locations' | 'transfers'>('locations');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferWizardOpen, setIsTransferWizardOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', type: 'warehouse' as LocationType, status: 'active' });

  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: products = [] } = useProducts();
  const { data: stockLevels = [], isLoading: stockLoading } = useStockLevels();
  const { data: transfers = [], isLoading: transfersLoading } = useInternalTransfers();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const isLoading = locationsLoading || stockLoading;

  const getLocationStats = (locationId: string) => {
    const locationStock = stockLevels.filter(sl => sl.location_id === locationId);
    const totalItems = locationStock.reduce((sum, sl) => sum + sl.quantity, 0);
    const totalValue = locationStock.reduce((sum, sl) => {
      const product = products.find(p => p.id === sl.product_id);
      return sum + (sl.quantity * (product?.unit_price || 0));
    }, 0);
    return { totalItems, totalValue };
  };

  const handleOpenModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({ name: location.name, address: location.address || '', type: location.type, status: location.status });
    } else {
      setEditingLocation(null);
      setFormData({ name: '', address: '', type: 'warehouse', status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setFormData({ name: '', address: '', type: 'warehouse', status: 'active' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      await updateLocation.mutateAsync({ id: editingLocation.id, name: formData.name, address: formData.address || undefined, type: formData.type, status: formData.status });
    } else {
      await createLocation.mutateAsync({ name: formData.name, address: formData.address || undefined, type: formData.type, status: formData.status });
    }
    handleCloseModal();
  };

  const handleDelete = async () => {
    if (deletingLocation) {
      await deleteLocation.mutateAsync(deletingLocation.id);
      setDeletingLocation(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('locations.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('locations.subtitle')}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'locations' | 'transfers')}>
        <TabsList className="w-full h-12 p-1 rounded-2xl bg-muted">
          <TabsTrigger value="locations" className="flex-1 h-10 rounded-xl gap-2 data-[state=active]:bg-card">
            <Warehouse className="h-4 w-4" />
            {t('locations.locations')}
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex-1 h-10 rounded-xl gap-2 data-[state=active]:bg-card">
            <ArrowRightLeft className="h-4 w-4" />
            {t('locations.transfers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-4 mt-4">
          <Button onClick={() => handleOpenModal()} className="w-full h-14 rounded-2xl gap-2 text-base">
            <Plus className="h-5 w-5" />
            {t('locations.addLocation')}
          </Button>

          {locations.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => {
                const stats = getLocationStats(location.id);
                return <LocationCard key={location.id} location={location} totalItems={stats.totalItems} totalValue={stats.totalValue} onEdit={handleOpenModal} onDelete={setDeletingLocation} />;
              })}
            </div>
          ) : (
            <EmptyState emoji="🏭" title={t('locations.noLocations')} description={t('locations.noLocationsDesc')} actionLabel={t('locations.addLocation')} onAction={() => handleOpenModal()} />
          )}
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4 mt-4">
          <Button onClick={() => setIsTransferWizardOpen(true)} className="w-full h-14 rounded-2xl gap-2 text-base">
            <ArrowRightLeft className="h-5 w-5" />
            {t('locations.newTransfer')}
          </Button>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{t('locations.transferHistory')}</h3>
            {transfersLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : transfers.length > 0 ? (
              <div className="space-y-3">{transfers.map((transfer) => <TransferHistoryCard key={transfer.id} transfer={transfer} />)}</div>
            ) : (
              <EmptyState emoji="📦" title={t('locations.noTransfers')} description={t('locations.noTransfersDesc')} actionLabel={t('locations.newTransfer')} onAction={() => setIsTransferWizardOpen(true)} />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <TransferWizardModal isOpen={isTransferWizardOpen} onClose={() => setIsTransferWizardOpen(false)} />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingLocation ? t('locations.editLocation') : t('locations.addLocation')}</DialogTitle>
            <DialogDescription>
              {editingLocation ? t('locations.editLocation') : t('locations.addLocation')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">{t('locations.name')} *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-base">{t('locations.type')} *</Label>
              <Select value={formData.type} onValueChange={(value: LocationType) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">{t('locations.warehouse')}</SelectItem>
                  <SelectItem value="store">{t('locations.store')}</SelectItem>
                  <SelectItem value="central">{t('locations.central')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-base">{t('locations.address')}</Label>
              <Textarea id="address" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} className="resize-none rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-base">{t('locations.status')}</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('locations.active')}</SelectItem>
                  <SelectItem value="inactive">{t('locations.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="h-12 rounded-xl flex-1">{t('common.cancel')}</Button>
              <Button type="submit" disabled={createLocation.isPending || updateLocation.isPending} className="h-12 rounded-xl flex-1">
                {(createLocation.isPending || updateLocation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingLocation ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLocation} onOpenChange={() => setDeletingLocation(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('locations.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('locations.deleteDesc', { name: deletingLocation?.name || '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-12 rounded-xl">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 rounded-xl">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
