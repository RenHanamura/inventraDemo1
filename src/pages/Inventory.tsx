import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAIInsights } from "@/hooks/useAIInsights";
import { InsightPanel } from "@/components/ai/InsightPanel";
import { Search, Loader2, FileText, Tags, MapPin, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FullScreenProductModal,
  LabelModal,
  BulkLabelsModal,
  CategoryDialog,
  ProductCard,
  AssignLocationModal,
  ExportModal,
  BulkImportModal,
} from "@/components/inventory";
import { ScannerModal } from "@/components/scanner";
import { EmptyState } from "@/components/ui/empty-state";
import { useProducts, useDeleteProduct, Product } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useStockLevels } from "@/hooks/useStockLevels";
import { useLocations } from "@/hooks/useLocations";
import { useLocationContext } from "@/contexts/LocationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocationSwitcher } from "@/components/layout/LocationSwitcher";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function getStockStatus(quantity: number, reorderPoint: number) {
  if (quantity === 0) return "out-of-stock";
  if (quantity <= reorderPoint) return "low-stock";
  return "in-stock";
}

export default function Inventory() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const aiInsights = useAIInsights('inventory');
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const [assignProduct, setAssignProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBulkLabelsOpen, setIsBulkLabelsOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { selectedLocationId, isGlobalView } = useLocationContext();
  const { t } = useLanguage();

  // Listen for global events from SpeedDial
  useEffect(() => {
    const handleOpenAddProduct = () => { setEditingProduct(null); setIsModalOpen(true); };
    const handleOpenScanner = () => { setIsScannerOpen(true); };
    window.addEventListener("openAddProduct", handleOpenAddProduct);
    window.addEventListener("openScanner", handleOpenScanner);
    return () => {
      window.removeEventListener("openAddProduct", handleOpenAddProduct);
      window.removeEventListener("openScanner", handleOpenScanner);
    };
  }, []);

  useEffect(() => {
    const searchQuery = searchParams.get("search");
    if (searchQuery) setSearch(searchQuery);
  }, [searchParams]);

  const handleScan = (code: string) => { setSearch(code); setIsScannerOpen(false); };

  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: stockLevels = [], isLoading: stockLoading } = useStockLevels(selectedLocationId);
  const { data: allStockLevels = [] } = useStockLevels(null);
  const { data: locations = [] } = useLocations();
  const deleteProduct = useDeleteProduct();

  const isLoading = productsLoading || stockLoading;

  const productLocationStocksMap = useMemo(() => {
    const map = new Map<string, Array<{ locationId: string; locationName: string; quantity: number }>>();
    allStockLevels.forEach((sl) => {
      const existing = map.get(sl.product_id) || [];
      existing.push({ locationId: sl.location_id, locationName: sl.location?.name || "Unknown", quantity: sl.quantity });
      map.set(sl.product_id, existing);
    });
    return map;
  }, [allStockLevels]);

  const productStockMap = new Map<string, { quantity: number; locationName?: string }>();
  if (isGlobalView) {
    stockLevels.forEach((sl) => {
      const current = productStockMap.get(sl.product_id) || { quantity: 0 };
      productStockMap.set(sl.product_id, { quantity: current.quantity + sl.quantity, locationName: t('common.allLocations') });
    });
  } else {
    stockLevels.forEach((sl) => {
      productStockMap.set(sl.product_id, { quantity: sl.quantity, locationName: sl.location?.name });
    });
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter;
    const stockInfo = productStockMap.get(product.id);
    const quantity = stockInfo?.quantity ?? product.quantity;
    const status = getStockStatus(quantity, product.reorder_point);
    const matchesStatus = statusFilter === "all" || (statusFilter === "in-stock" && status === "in-stock") || (statusFilter === "low-stock" && (status === "low-stock" || status === "out-of-stock"));
    if (!isGlobalView && !stockInfo) return false;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleEdit = (product: Product) => { setEditingProduct(product); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingProduct(null); };
  const handleDelete = () => { if (deletingProduct) { deleteProduct.mutate(deletingProduct.id); setDeletingProduct(null); } };
  const handleAddProduct = () => { setEditingProduct(null); setIsModalOpen(true); };

  const selectedProductsList = products.filter((p) => selectedProducts.has(p.id));
  const currentLocationName = selectedLocationId ? locations.find((l) => l.id === selectedLocationId)?.name || "Unknown Location" : t('common.allLocations');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('inventory.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('inventory.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={aiInsights.analyze} disabled={aiInsights.isLoading} className="gap-1.5 rounded-xl">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">{t('inventory.analyzeAI')}</span>
            </Button>
            <LocationSwitcher />
          </div>
        </div>
        <InsightPanel isOpen={aiInsights.isOpen} onClose={() => aiInsights.setIsOpen(false)} insights={aiInsights.insights} isLoading={aiInsights.isLoading} />
        {!isGlobalView && (
          <Badge variant="secondary" className="gap-1"><MapPin className="h-3 w-3" />{locations.find((l) => l.id === selectedLocationId)?.name}</Badge>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder={t('inventory.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-14 text-base rounded-2xl bg-card" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-auto min-w-[140px] h-10 rounded-xl bg-card"><SelectValue placeholder={t('inventory.allCategories')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.allCategories')}</SelectItem>
              {categories.map((category) => (<SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto min-w-[120px] h-10 rounded-xl bg-card"><SelectValue placeholder={t('inventory.allStatus')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.allStatus')}</SelectItem>
              <SelectItem value="in-stock">{t('inventory.inStock')}</SelectItem>
              <SelectItem value="low-stock">{t('inventory.lowStock')}</SelectItem>
            </SelectContent>
          </Select>
          <CategoryDialog />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {selectedProducts.size > 0 && (
            <Button variant="outline" onClick={() => setIsBulkLabelsOpen(true)} size="sm" className="gap-1.5 rounded-xl whitespace-nowrap">
              <Tags className="h-4 w-4" />{t('inventory.labels')} ({selectedProducts.size})
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsImportOpen(true)} size="sm" className="gap-1.5 rounded-xl whitespace-nowrap">
            <Upload className="h-4 w-4" />{t('inventory.importCSV')}
          </Button>
          <Button variant="outline" onClick={() => setIsExportOpen(true)} size="sm" className="gap-1.5 rounded-xl whitespace-nowrap">
            <FileText className="h-4 w-4" />{t('inventory.export')}
          </Button>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const quantity = product.quantity;
            const locationStocks = productLocationStocksMap.get(product.id) || [];
            return (
              <ProductCard key={product.id} product={product} quantity={quantity} locationStocks={locationStocks}
                onEdit={handleEdit} onDelete={setDeletingProduct} onLabel={setLabelProduct} onAssign={setAssignProduct} />
            );
          })}
        </div>
      ) : (
        <EmptyState
          emoji="📦"
          title={products.length === 0 ? t('inventory.noProducts') : t('inventory.noResults')}
          description={products.length === 0 ? t('inventory.noProductsDesc') : isGlobalView ? t('inventory.noResultsDesc') : t('inventory.noStockLocation')}
          actionLabel={products.length === 0 ? t('inventory.addFirst') : undefined}
          onAction={products.length === 0 ? handleAddProduct : undefined}
        />
      )}

      <FullScreenProductModal isOpen={isModalOpen} onClose={handleCloseModal} product={editingProduct} />
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent className="rounded-2xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('inventory.deleteDesc', { name: deletingProduct?.name || '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-12">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-12">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <LabelModal isOpen={!!labelProduct} onClose={() => setLabelProduct(null)} product={labelProduct} />
      <BulkLabelsModal isOpen={isBulkLabelsOpen} onClose={() => setIsBulkLabelsOpen(false)} products={selectedProductsList} />
      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScan} />
      <AssignLocationModal isOpen={!!assignProduct} onClose={() => setAssignProduct(null)} product={assignProduct} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} products={filteredProducts} productStockMap={productStockMap} isGlobalView={isGlobalView} locationName={currentLocationName} />
      <BulkImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}