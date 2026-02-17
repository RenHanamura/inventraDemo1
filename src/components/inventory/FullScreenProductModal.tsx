import { useState, useEffect, useRef } from 'react';
import { X, Loader2, MapPin, Camera, Upload, ImageIcon, Package, Settings, UserCheck, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategories } from '@/hooks/useCategories';
import { useLocations } from '@/hooks/useLocations';
import { useCreateProduct, useUpdateProduct, Product, ProductStatusCategory, PRODUCT_STATUS_LABELS } from '@/hooks/useProducts';
import { useUpdateStockLevel } from '@/hooks/useStockLevels';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FullScreenProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

function generateSKU(categoryName?: string): string {
  const prefix = categoryName?.substring(0, 4).toUpperCase() || 'PROD';
  const number = Math.floor(Math.random() * 900) + 100;
  return `${prefix}-${number}`;
}

export function FullScreenProductModal({ isOpen, onClose, product }: FullScreenProductModalProps) {
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const updateStockLevel = useUpdateStockLevel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit_price: '',
    cost_price: '',
    quantity: '',
    reorder_point: '10',
    initial_location_id: '',
    image_url: '',
    // New asset management fields
    serial_number: '',
    micro_location: '',
    status_category: 'available' as ProductStatusCategory,
    custodian: '',
    maintenance_alert_date: '',
  });
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Filter active locations
  const activeLocations = locations.filter(l => l.status === 'active');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        category_id: product.category_id || '',
        unit_price: String(product.unit_price),
        cost_price: String(product.cost_price),
        quantity: String(product.quantity),
        reorder_point: String(product.reorder_point),
        initial_location_id: '',
        image_url: product.image_url || '',
        serial_number: product.serial_number || '',
        micro_location: product.micro_location || '',
        status_category: product.status_category || 'available',
        custodian: product.custodian || '',
        maintenance_alert_date: product.maintenance_alert_date || '',
      });
      setImagePreview(product.image_url || null);
      setAutoGenerateSku(false);
    } else {
      setFormData({
        name: '',
        sku: '',
        category_id: '',
        unit_price: '',
        cost_price: '',
        quantity: '',
        reorder_point: '10',
        initial_location_id: '',
        image_url: '',
        serial_number: '',
        micro_location: '',
        status_category: 'available',
        custodian: '',
        maintenance_alert_date: '',
      });
      setImagePreview(null);
      setAutoGenerateSku(true);
      setActiveTab('basic');
    }
  }, [product, isOpen]);

  useEffect(() => {
    if (autoGenerateSku && !product) {
      const category = categories.find(c => c.id === formData.category_id);
      setFormData(prev => ({ ...prev, sku: generateSKU(category?.name) }));
    }
  }, [autoGenerateSku, formData.category_id, categories, product]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      setImagePreview(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      sku: formData.sku,
      category_id: formData.category_id || null,
      unit_price: parseFloat(formData.unit_price),
      cost_price: parseFloat(formData.cost_price) || 0,
      quantity: parseInt(formData.quantity),
      reorder_point: parseInt(formData.reorder_point) || 10,
      image_url: formData.image_url || null,
      serial_number: formData.serial_number || null,
      micro_location: formData.micro_location || null,
      status_category: formData.status_category,
      custodian: formData.custodian || null,
      maintenance_alert_date: formData.maintenance_alert_date || null,
    };

    if (product) {
      await updateProduct.mutateAsync({ id: product.id, ...productData });
    } else {
      // Create product and then create stock level if location selected
      const newProduct = await createProduct.mutateAsync(productData);
      
      if (formData.initial_location_id && newProduct) {
        await updateStockLevel.mutateAsync({
          productId: newProduct.id,
          locationId: formData.initial_location_id,
          quantity: parseInt(formData.quantity),
        });
      }
    }
    
    onClose();
  };

  const isSubmitting = createProduct.isPending || updateProduct.isPending || updateStockLevel.isPending;
  const isNewProduct = !product;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-4 flex items-center justify-between safe-area-top">
        <button 
          onClick={onClose}
          className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors touch-manipulation"
        >
          <X className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold">
          {product ? 'Edit Product' : 'Add New Product'}
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Tabbed Form */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="sticky top-[72px] z-10 bg-background border-b border-border px-4">
          <TabsList className="w-full h-14 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger 
              value="basic" 
              className="flex-1 h-full rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Basic</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tracking" 
              className="flex-1 h-full rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>
            <TabsTrigger 
              value="custody" 
              className="flex-1 h-full rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2"
            >
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Custody</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <form onSubmit={handleSubmit} className="p-4 pb-32 space-y-6 overflow-auto max-h-[calc(100vh-200px)]">
          {/* Tab 1: Basic Info */}
          <TabsContent value="basic" className="mt-0 space-y-6">
            {/* Product Image */}
            <div className="space-y-2">
              <Label className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Product Image
              </Label>
              <div className="flex items-center gap-4">
                {/* Image Preview */}
                <div 
                  className={cn(
                    "relative h-24 w-24 flex-shrink-0 rounded-xl border-2 border-dashed border-muted-foreground/25 overflow-hidden",
                    "flex items-center justify-center bg-muted cursor-pointer hover:border-primary/50 transition-colors"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                
                {/* Upload Controls */}
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4" />
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </Button>
                  {imagePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-10 rounded-xl text-destructive hover:text-destructive"
                      onClick={handleRemoveImage}
                    >
                      Remove Image
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, max 5MB
              </p>
            </div>

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
                required
                className="h-14 text-lg rounded-xl"
              />
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-base">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="SKU"
                disabled={autoGenerateSku}
                required
                className="h-14 text-lg rounded-xl"
              />
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="autoSku"
                  checked={autoGenerateSku}
                  onCheckedChange={(checked) => setAutoGenerateSku(checked as boolean)}
                  disabled={!!product}
                />
                <Label htmlFor="autoSku" className="text-sm font-normal cursor-pointer">
                  Auto-generate SKU
                </Label>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-base">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger className="h-14 text-lg rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="py-3">
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Initial Location - Only for new products */}
            {isNewProduct && (
              <div className="space-y-2">
                <Label htmlFor="location" className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Initial Location *
                </Label>
                <Select
                  value={formData.initial_location_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, initial_location_id: value }))}
                >
                  <SelectTrigger className="h-14 text-lg rounded-xl">
                    <SelectValue placeholder="Select initial location" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id} className="py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{location.name}</span>
                          <Badge variant="secondary" className="text-xs capitalize ml-1">
                            {location.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Stock will be assigned to this location upon creation
                </p>
              </div>
            )}

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-base">Unit Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="0.00"
                  required
                  className="h-14 text-lg rounded-xl tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost" className="text-base">Cost Price ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                  placeholder="0.00"
                  className="h-14 text-lg rounded-xl tabular-nums"
                />
              </div>
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-base">
                  {product ? 'Current Quantity' : 'Initial Stock'} *
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                  required
                  className="h-14 text-lg rounded-xl tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderPoint" className="text-base">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData(prev => ({ ...prev, reorder_point: e.target.value }))}
                  placeholder="10"
                  className="h-14 text-lg rounded-xl tabular-nums"
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Tracking & Status */}
          <TabsContent value="tracking" className="mt-0 space-y-6">
            {/* Serial Number */}
            <div className="space-y-2">
              <Label htmlFor="serial_number" className="text-base">Serial Number / Tag</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                placeholder="e.g., SN-2024-001234"
                className="h-14 text-lg rounded-xl font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for individual asset tracking
              </p>
            </div>

            {/* Micro-Location */}
            <div className="space-y-2">
              <Label htmlFor="micro_location" className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Micro-Location (Internal Shelf)
              </Label>
              <Input
                id="micro_location"
                value={formData.micro_location}
                onChange={(e) => setFormData(prev => ({ ...prev, micro_location: e.target.value }))}
                placeholder="e.g., Aisle 4, Shelf B, Rack 2"
                className="h-14 text-lg rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Specific placement within a warehouse/location
              </p>
            </div>

            {/* Status Category */}
            <div className="space-y-2">
              <Label htmlFor="status_category" className="text-base">Product Status</Label>
              <Select
                value={formData.status_category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status_category: value as ProductStatusCategory }))}
              >
                <SelectTrigger className="h-14 text-lg rounded-xl">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRODUCT_STATUS_LABELS) as [ProductStatusCategory, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="py-3">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current operational state of the asset
              </p>
            </div>

            {/* Maintenance Alert Date */}
            <div className="space-y-2">
              <Label htmlFor="maintenance_alert_date" className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Maintenance Alert Date
              </Label>
              <Input
                id="maintenance_alert_date"
                type="date"
                value={formData.maintenance_alert_date}
                onChange={(e) => setFormData(prev => ({ ...prev, maintenance_alert_date: e.target.value }))}
                className="h-14 text-lg rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                A "Service Due" badge will appear when this date is near
              </p>
            </div>
          </TabsContent>

          {/* Tab 3: Custody */}
          <TabsContent value="custody" className="mt-0 space-y-6">
            {/* Custodian */}
            <div className="space-y-2">
              <Label htmlFor="custodian" className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Custodian / Responsible Person
              </Label>
              <Input
                id="custodian"
                value={formData.custodian}
                onChange={(e) => setFormData(prev => ({ ...prev, custodian: e.target.value }))}
                placeholder="e.g., John Smith"
                className="h-14 text-lg rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Person currently responsible for or assigned to this asset
              </p>
            </div>

            {/* Info Card */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Custody Tracking</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assign assets to specific team members for equipment lending, 
                    construction site assignments, or repair shop tracking. 
                    All custody changes are automatically logged in the audit history.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Status Change */}
            {product && (
              <div className="space-y-3">
                <Label className="text-base">Quick Status Actions</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.status_category === 'assigned' ? 'default' : 'outline'}
                    className="h-12 rounded-xl"
                    onClick={() => setFormData(prev => ({ ...prev, status_category: 'assigned' }))}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Assign
                  </Button>
                  <Button
                    type="button"
                    variant={formData.status_category === 'available' ? 'default' : 'outline'}
                    className="h-12 rounded-xl"
                    onClick={() => setFormData(prev => ({ ...prev, status_category: 'available', custodian: '' }))}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Return
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </form>
      </Tabs>

      {/* Fixed Bottom Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-bottom">
        <Button 
          type="submit" 
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.name || !formData.unit_price || !formData.quantity || (isNewProduct && !formData.initial_location_id)}
          className={cn(
            "w-full h-16 text-lg font-semibold rounded-xl",
            "bg-primary hover:bg-primary/90"
          )}
        >
          {isSubmitting && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
          {product ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
    </div>
  );
}