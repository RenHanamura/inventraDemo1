import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface ProductTag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ProductTagAssignment {
  id: string;
  product_id: string;
  tag_id: string;
  created_at: string;
}

export function useProductTags() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['product-tags', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('product_tags')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) {
        console.error('Error fetching product tags:', error);
        return [];
      }

      return data as ProductTag[];
    },
    enabled: !!organization?.id,
  });

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('product_tags')
        .insert({
          organization_id: organization.id,
          name,
          color: color || '#6b7280',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tags'] });
      toast.success('Tag created');
    },
    onError: (error) => {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    },
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      const { data, error } = await supabase
        .from('product_tags')
        .update({ name, color })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tags'] });
      toast.success('Tag updated');
    },
    onError: (error) => {
      console.error('Error updating tag:', error);
      toast.error('Failed to update tag');
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tags'] });
      toast.success('Tag deleted');
    },
    onError: (error) => {
      console.error('Error deleting tag:', error);
      toast.error('Failed to delete tag');
    },
  });

  return {
    tags,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
  };
}

export function useProductTagAssignments(productId?: string) {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['product-tag-assignments', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_tag_assignments')
        .select('*, tag:product_tags(*)')
        .eq('product_id', productId);

      if (error) {
        console.error('Error fetching tag assignments:', error);
        return [];
      }

      return data as (ProductTagAssignment & { tag: ProductTag })[];
    },
    enabled: !!productId,
  });

  const assignTag = useMutation({
    mutationFn: async ({ productId, tagId }: { productId: string; tagId: string }) => {
      const { data, error } = await supabase
        .from('product_tag_assignments')
        .insert({ product_id: productId, tag_id: tagId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tag-assignments'] });
      toast.success('Tag assigned');
    },
    onError: (error) => {
      console.error('Error assigning tag:', error);
      toast.error('Failed to assign tag');
    },
  });

  const removeTag = useMutation({
    mutationFn: async ({ productId, tagId }: { productId: string; tagId: string }) => {
      const { error } = await supabase
        .from('product_tag_assignments')
        .delete()
        .eq('product_id', productId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tag-assignments'] });
      toast.success('Tag removed');
    },
    onError: (error) => {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag');
    },
  });

  return {
    assignments,
    isLoading,
    assignTag,
    removeTag,
  };
}
