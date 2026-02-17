import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface ProductFolder {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FolderWithChildren extends ProductFolder {
  children: FolderWithChildren[];
}

export function useProductFolders() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['product-folders', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('product_folders')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) {
        console.error('Error fetching product folders:', error);
        return [];
      }

      return data as ProductFolder[];
    },
    enabled: !!organization?.id,
  });

  // Build hierarchical tree
  const folderTree = useMemo(() => {
    const buildTree = (parentId: string | null): FolderWithChildren[] => {
      return folders
        .filter((f) => f.parent_id === parentId)
        .map((folder) => ({
          ...folder,
          children: buildTree(folder.id),
        }));
    };
    return buildTree(null);
  }, [folders]);

  const createFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('product_folders')
        .insert({
          organization_id: organization.id,
          name,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-folders'] });
      toast.success('Folder created');
    },
    onError: (error) => {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    },
  });

  const updateFolder = useMutation({
    mutationFn: async ({ id, name, parentId }: { id: string; name?: string; parentId?: string | null }) => {
      const { data, error } = await supabase
        .from('product_folders')
        .update({ name, parent_id: parentId })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-folders'] });
      toast.success('Folder updated');
    },
    onError: (error) => {
      console.error('Error updating folder:', error);
      toast.error('Failed to update folder');
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-folders'] });
      toast.success('Folder deleted');
    },
    onError: (error) => {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    },
  });

  return {
    folders,
    folderTree,
    isLoading,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
