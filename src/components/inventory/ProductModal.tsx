import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCategories } from '@/hooks/useCategories';
import { useCreateProduct, useUpdateProduct, Product } from '@/hooks/useProducts';
import { Loader2 } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

function generateSKU(categoryName?: string): string {
  const prefix = categoryName?.substring(0, 4).toUpperCase() || 'PROD';
  const number = Math.floor(Math.random() * 900) + 100;
  return `${prefix}-${number}`;
}

export function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    unit_price: '',
    cost_price: '',
    quantity: '',
    reorder_point: '10',
  });
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);

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
      });
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
      });
      setAutoGenerateSku(true);
    }
  }, [product, isOpen]);

  useEffect(() => {
    if (autoGenerateSku && !product) {
      const category = categories.find(c => c.id === formData.category_id);
      setFormData(prev => ({ ...prev, sku: generateSKU(category?.name) }));
    }
  }, [autoGenerateSku, formData.category_id, categories, product]);

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
    };

    if (product) {
      await updateProduct.mutateAsync({ id: product.id, ...productData });
    } else {
      await createProduct.mutateAsync(productData);
    }
    
    onClose();
  };

  const isSubmitting = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="SKU"
                disabled={autoGenerateSku}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex items-center space-x-2 h-10">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Unit Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost Price ($)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">{product ? 'Current Quantity' : 'Initial Quantity'} *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                min="0"
                value={formData.reorder_point}
                onChange={(e) => setFormData(prev => ({ ...prev, reorder_point: e.target.value }))}
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {product ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
