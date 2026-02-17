import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface Movement {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  product?: { id: string; name: string; quantity: number } | null;
}

export function useMovements() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movements')
        .select(`
          *,
          product:products(id, name, quantity)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Movement[];
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('movements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movements' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['movements'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreateMovement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (movement: {
      product_id: string;
      type: 'incoming' | 'outgoing';
      quantity: number;
      notes?: string;
      location_id?: string;
    }) => {
      // Use atomic database function to prevent race conditions
      const { data, error } = await supabase
        .rpc('record_movement', {
          p_product_id: movement.product_id,
          p_type: movement.type,
          p_quantity: movement.quantity,
          p_notes: movement.notes || null,
          p_user_id: user?.id || null,
          p_location_id: movement.location_id || null,
        });
      
      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      toast({ title: 'Movement recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to record movement', description: error.message, variant: 'destructive' });
    },
  });
}
