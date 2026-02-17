import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface ImportHistory {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  file_name: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: { row: number; message: string }[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
}

export function useImportHistory() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: imports = [], isLoading } = useQuery({
    queryKey: ['import-history', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching import history:', error);
        return [];
      }

      return data as ImportHistory[];
    },
    enabled: !!organization?.id,
  });

  const createImportRecord = useMutation({
    mutationFn: async ({ fileName, totalRows }: { fileName: string; totalRows: number }) => {
      if (!user?.id || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('import_history')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          file_name: fileName,
          total_rows: totalRows,
          status: 'processing',
        })
        .select()
        .single();

      if (error) throw error;
      return data as ImportHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
    },
  });

  const updateImportRecord = useMutation({
    mutationFn: async ({
      id,
      successfulRows,
      failedRows,
      errors,
      status,
    }: {
      id: string;
      successfulRows: number;
      failedRows: number;
      errors: { row: number; message: string }[];
      status: 'completed' | 'failed';
    }) => {
      const { data, error } = await supabase
        .from('import_history')
        .update({
          successful_rows: successfulRows,
          failed_rows: failedRows,
          errors: errors as unknown as ImportHistory['errors'],
          status,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
      if (data.status === 'completed') {
        toast.success(`Import completed: ${data.successful_rows} products imported`);
      } else {
        toast.error(`Import failed: ${data.failed_rows} errors`);
      }
    },
  });

  return {
    imports,
    isLoading,
    createImportRecord,
    updateImportRecord,
  };
}
