import { useState, useEffect } from 'react';
import { Package, DollarSign, AlertTriangle, Layers, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KPICard, RecentActivityTable, StockChart, WarehouseOverview } from '@/components/dashboard';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useOrganization } from '@/hooks/useOrganization';
import { useTeamCount } from '@/hooks/useTeamCount';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScannerModal } from '@/components/scanner';
import { FullScreenProductModal } from '@/components/inventory';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { organization } = useOrganization();
  const { data: teamCount = 0, isLoading: teamLoading } = useTeamCount();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const handleOpenAddProduct = () => setIsProductModalOpen(true);
    const handleOpenScanner = () => setIsScannerOpen(true);
    window.addEventListener('openAddProduct', handleOpenAddProduct);
    window.addEventListener('openScanner', handleOpenScanner);
    return () => {
      window.removeEventListener('openAddProduct', handleOpenAddProduct);
      window.removeEventListener('openScanner', handleOpenScanner);
    };
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    navigate(`/inventory?search=${encodeURIComponent(decodedText)}`);
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dashboardTitle = organization?.name
    ? t('dashboard.title', { org: organization.name })
    : t('dashboard.titleDefault');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{dashboardTitle}</h1>
        <p className="text-muted-foreground text-sm">{t('dashboard.subtitle')}</p>
      </div>

      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScanSuccess} />
      <FullScreenProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} />

      <NotificationCenter />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KPICard title={t('dashboard.products')} value={stats?.totalProducts || 0} icon={Package} variant="default" />
        <KPICard title={t('dashboard.value')} value={`$${((stats?.totalValue || 0) / 1000).toFixed(1)}k`} icon={DollarSign} variant="success" />
        <KPICard title={t('dashboard.lowStock')} value={stats?.lowStockItems || 0} icon={AlertTriangle} variant="warning" />
        <KPICard title={t('dashboard.categories')} value={stats?.totalCategories || 0} icon={Layers} variant="default" />
        <div className="cursor-pointer" onClick={() => navigate('/team')}>
          <KPICard title={t('dashboard.team')} value={teamLoading ? '...' : teamCount} icon={Users} variant="default" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockChart />
        <RecentActivityTable />
      </div>

      <WarehouseOverview />
    </div>
  );
}