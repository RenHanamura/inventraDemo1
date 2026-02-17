import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// Status categories that are NOT available for sales/transfers
const UNAVAILABLE_STATUSES = ['under_maintenance', 'repairing', 'refunded'];

export interface DashboardStats {
  totalProducts: number;
  totalAssets: number;
  totalValue: number;
  lowStockItems: number;
  totalCategories: number;
  availableStock: number;
  unavailableStock: number;
}

export interface CategoryStock {
  name: string;
  stock: number;
}

export function useDashboardStats() {
  const queryClient = useQueryClient();

  // Set up realtime subscription for products, stock_levels, movements
  useEffect(() => {
    const channels = [
      supabase
        .channel('dashboard-products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['category-stocks'] });
        })
        .subscribe(),
      supabase
        .channel('dashboard-stock-levels')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_levels' }, () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        })
        .subscribe(),
      supabase
        .channel('dashboard-movements')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['recent-movements'] });
        })
        .subscribe(),
      supabase
        .channel('dashboard-transfers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_transfers' }, () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['recent-movements'] });
        })
        .subscribe(),
      supabase
        .channel('dashboard-categories')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['category-stocks'] });
        })
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Get products with status
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('quantity, unit_price, reorder_point, status_category');
      
      if (productsError) throw productsError;

      // Get categories count
      const { count: categoriesCount, error: categoriesError } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });
      
      if (categoriesError) throw categoriesError;

      const totalProducts = products?.length || 0;
      
      // Calculate totals based on status
      let totalAssets = 0;
      let totalValue = 0;
      let availableStock = 0;
      let unavailableStock = 0;
      let lowStockItems = 0;

      products?.forEach(p => {
        const qty = p.quantity;
        const value = qty * Number(p.unit_price);
        const isUnavailable = UNAVAILABLE_STATUSES.includes(p.status_category || 'available');

        totalAssets += qty;
        totalValue += value;

        if (isUnavailable) {
          unavailableStock += qty;
        } else {
          availableStock += qty;
          // Only count low stock for available items
          if (qty <= p.reorder_point) {
            lowStockItems++;
          }
        }
      });

      return {
        totalProducts,
        totalAssets,
        totalValue,
        lowStockItems,
        totalCategories: categoriesCount || 0,
        availableStock,
        unavailableStock,
      };
    },
  });
}

export function useCategoryStocks() {
  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('category-stocks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        queryClient.invalidateQueries({ queryKey: ['category-stocks'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['category-stocks'],
    queryFn: async (): Promise<CategoryStock[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          quantity,
          category:categories(name)
        `);
      
      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, number>();
      
      data?.forEach(product => {
        const categoryName = product.category?.name || 'Uncategorized';
        const currentStock = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, currentStock + product.quantity);
      });

      return Array.from(categoryMap.entries()).map(([name, stock]) => ({
        name,
        stock,
      }));
    },
  });
}

export function useRecentMovements(limit = 5) {
  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('recent-movements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, () => {
        queryClient.invalidateQueries({ queryKey: ['recent-movements'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['recent-movements', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movements')
        .select(`
          *,
          product:products(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  });
}
