import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface InternalTransfer {
  id: string;
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  product?: {
    name: string;
    sku: string;
  };
  from_location?: {
    name: string;
  };
  to_location?: {
    name: string;
  };
}

export function useInternalTransfers() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['internal-transfers'],
    queryFn: async (): Promise<InternalTransfer[]> => {
      const { data, error } = await supabase
        .from('internal_transfers')
        .select(`
          *,
          product:products(name, sku),
          from_location:locations!internal_transfers_from_location_id_fkey(name),
          to_location:locations!internal_transfers_to_location_id_fkey(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InternalTransfer[];
    },
  });

  // Set up realtime subscription
  useQuery({
    queryKey: ['internal-transfers-subscription'],
    queryFn: async () => {
      const channel = supabase
        .channel('internal-transfers-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_transfers' }, () => {
          queryClient.invalidateQueries({ queryKey: ['internal-transfers'] });
          queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
        })
        .subscribe();
      
      return () => supabase.removeChannel(channel);
    },
    staleTime: Infinity,
  });

  return query;
}

export function useCreateInternalTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transfer: {
      product_id: string;
      from_location_id: string;
      to_location_id: string;
      quantity: number;
      notes?: string;
    }) => {
      // Use atomic database function to prevent race conditions
      const { data, error } = await supabase
        .rpc('record_internal_transfer', {
          p_product_id: transfer.product_id,
          p_from_location_id: transfer.from_location_id,
          p_to_location_id: transfer.to_location_id,
          p_quantity: transfer.quantity,
          p_notes: transfer.notes || null,
          p_user_id: user?.id || null,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast({
        title: 'Transfer completed',
        description: 'The internal transfer has been recorded successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Transfer failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
