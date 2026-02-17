import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export function useTeamCount() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['team-count', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return 0;

      const [membersRes, invitationsRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
        supabase
          .from('pending_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('status', 'pending'),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (invitationsRes.error) throw invitationsRes.error;

      return (membersRes.count || 0) + (invitationsRes.count || 0);
    },
    enabled: !!organization?.id,
  });
}
