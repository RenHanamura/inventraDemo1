import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
}

export function useOrganization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ['organization-membership', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Use ensure_user_organization RPC — creates org if needed, always returns data
      const { data: orgs, error } = await supabase.rpc('ensure_user_organization', {
        p_user_id: user.id,
        p_user_name: user.user_metadata?.full_name || null,
      });

      if (error) {
        console.error('Error ensuring organization:', error);
        return null;
      }

      if (orgs && orgs.length > 0) {
        const org = orgs[0];
        return {
          id: '',
          organization_id: org.out_organization_id,
          user_id: user.id,
          role: org.member_role as 'admin' | 'member',
          created_at: '',
          organization: {
            id: org.out_organization_id,
            name: org.org_name,
            logo_url: org.org_logo_url,
            primary_color: org.org_primary_color,
            created_at: '',
            updated_at: '',
          } as Organization,
        } as OrganizationMember & { organization: Organization };
      }

      return null;
    },
    enabled: !!user?.id,
  });

  const organization = membership?.organization || null;
  const isAdmin = membership?.role === 'admin';

  const updateOrganization = useMutation({
    mutationFn: async (updates: Partial<Pick<Organization, 'name' | 'logo_url' | 'primary_color'>>) => {
      if (!organization?.id) throw new Error('No organization');

      // Use the SECURITY DEFINER RPC to bypass RLS issues
      const { data, error } = await supabase.rpc('update_organization_settings', {
        p_organization_id: organization.id,
        p_name: updates.name || null,
        p_logo_url: updates.logo_url || null,
        p_primary_color: updates.primary_color || null,
        p_clear_logo: updates.logo_url === null,
      });

      if (error) throw error;
      return { data, updates };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['organization-membership', user?.id] });
      const updates = result.updates;
      if (updates.name) {
        toast.success('Nombre de organización guardado');
      } else if (updates.primary_color) {
        toast.success('Color de marca actualizado');
      } else if (updates.logo_url === null) {
        toast.success('Logo eliminado');
      } else if (updates.logo_url) {
        toast.success('Logo actualizado');
      } else {
        toast.success('Configuración guardada con éxito');
      }
    },
    onError: (error) => {
      console.error('Error updating organization:', error);
      toast.error('Error al actualizar la organización');
    },
  });

  const uploadLogo = async (file: File) => {
    if (!organization?.id) {
      toast.error('No se encontró la organización');
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${organization.id}-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('organization-logos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Error al subir el logo');
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('organization-logos')
      .getPublicUrl(filePath);

    await updateOrganization.mutateAsync({ logo_url: urlData.publicUrl });

    return urlData.publicUrl;
  };

  const removeLogo = async () => {
    if (!organization?.id) return;
    await updateOrganization.mutateAsync({ logo_url: null });
  };

  return {
    organization,
    membership,
    isAdmin,
    isLoading: membershipLoading,
    updateOrganization,
    uploadLogo,
    removeLogo,
    isSaving: updateOrganization.isPending,
  };
}
