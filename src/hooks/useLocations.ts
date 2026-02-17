import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type LocationType = 'warehouse' | 'store' | 'central';

export interface Location {
  id: string;
  name: string;
  address: string | null;
  type: LocationType;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useLocations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['locations'],
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Location[];
    },
  });

  // Set up realtime subscription
  useQuery({
    queryKey: ['locations-subscription'],
    queryFn: async () => {
      const channel = supabase
        .channel('locations-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
          queryClient.invalidateQueries({ queryKey: ['locations'] });
        })
        .subscribe();
      
      return () => supabase.removeChannel(channel);
    },
    staleTime: Infinity,
  });

  return query;
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: { name: string; address?: string; type: LocationType; status?: string }) => {
      const { data, error } = await supabase
        .from('locations')
        .insert({
          name: location.name,
          address: location.address || null,
          type: location.type,
          status: location.status || 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({
        title: 'Location created',
        description: 'The location has been added successfully.',
      });
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

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; address?: string; type?: LocationType; status?: string }) => {
      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({
        title: 'Location updated',
        description: 'The location has been updated successfully.',
      });
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

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({
        title: 'Location deleted',
        description: 'The location has been deleted successfully.',
      });
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
