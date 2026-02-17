import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StockLevel {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit_price: number;
    reorder_point: number;
    image_url: string | null;
    category?: { name: string } | null;
    supplier?: { name: string } | null;
  };
  location?: {
    id: string;
    name: string;
    type: string;
  };
}

export function useStockLevels(locationId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stock-levels', locationId],
    queryFn: async (): Promise<StockLevel[]> => {
      let queryBuilder = supabase
        .from('stock_levels')
        .select(`
          *,
          product:products(id, name, sku, unit_price, reorder_point, image_url, category:categories(name), supplier:suppliers(name)),
          location:locations(id, name, type)
        `);
      
      if (locationId) {
        queryBuilder = queryBuilder.eq('location_id', locationId);
      }
      
      const { data, error } = await queryBuilder.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StockLevel[];
    },
  });

  // Set up realtime subscription
  useQuery({
    queryKey: ['stock-levels-subscription'],
    queryFn: async () => {
      const channel = supabase
        .channel('stock-levels-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_levels' }, () => {
          queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
        })
        .subscribe();
      
      return () => supabase.removeChannel(channel);
    },
    staleTime: Infinity,
  });

  return query;
}

export function useUpdateStockLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, locationId, quantity }: { productId: string; locationId: string; quantity: number }) => {
      // Upsert the stock level
      const { data, error } = await supabase
        .from('stock_levels')
        .upsert({
          product_id: productId,
          location_id: locationId,
          quantity,
        }, {
          onConflict: 'product_id,location_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useProductStockByLocation(productId: string) {
  return useQuery({
    queryKey: ['product-stock', productId],
    queryFn: async (): Promise<StockLevel[]> => {
      const { data, error } = await supabase
        .from('stock_levels')
        .select(`
          *,
          location:locations(id, name, type)
        `)
        .eq('product_id', productId);
      
      if (error) throw error;
      return data as StockLevel[];
    },
    enabled: !!productId,
  });
}
