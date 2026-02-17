export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  category?: Category;
  description?: string;
  price: number;
  cost: number;
  quantity: number;
  reorderPoint: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  status: 'active' | 'inactive';
  productsSupplied: string[];
  createdAt: Date;
}

export type MovementType = 'incoming' | 'outgoing';

export interface Movement {
  id: string;
  productId: string;
  product?: Product;
  type: MovementType;
  quantity: number;
  date: Date;
  notes?: string;
  recordedBy: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  totalCategories: number;
}

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export function getStockStatus(quantity: number, reorderPoint: number): StockStatus {
  if (quantity === 0) return 'out-of-stock';
  if (quantity <= reorderPoint) return 'low-stock';
  return 'in-stock';
}
