import { Warehouse, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LocationCard } from '@/components/locations';
import { useLocations } from '@/hooks/useLocations';
import { useProducts } from '@/hooks/useProducts';
import { useStockLevels } from '@/hooks/useStockLevels';
import { Skeleton } from '@/components/ui/skeleton';

export function WarehouseOverview() {
  const navigate = useNavigate();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: products = [] } = useProducts();
  const { data: stockLevels = [], isLoading: stockLoading } = useStockLevels();

  const isLoading = locationsLoading || stockLoading;

  const activeLocations = locations.filter((l) => l.status === 'active');

  const getLocationStats = (locationId: string) => {
    const locationStock = stockLevels.filter((sl) => sl.location_id === locationId);
    const totalItems = locationStock.reduce((sum, sl) => sum + sl.quantity, 0);
    const totalValue = locationStock.reduce((sum, sl) => {
      const product = products.find((p) => p.id === sl.product_id);
      return sum + sl.quantity * (product?.unit_price || 0);
    }, 0);
    return { totalItems, totalValue };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Warehouse Overview</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (activeLocations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Warehouse className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Warehouse Overview</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeLocations.map((location) => {
          const stats = getLocationStats(location.id);
          return (
            <LocationCard
              key={location.id}
              location={location}
              totalItems={stats.totalItems}
              totalValue={stats.totalValue}
              onEdit={() => navigate('/locations')}
              onDelete={() => navigate('/locations')}
              onClick={() => navigate('/locations')}
            />
          );
        })}
      </div>
    </div>
  );
}
