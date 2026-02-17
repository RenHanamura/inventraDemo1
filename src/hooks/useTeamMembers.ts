import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useUserRole";

export interface TeamMember {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  member_role: string;
  app_role: AppRole | null;
  display_role: string | null;
  joined_at: string;
}

/**
 * Cleans up an orphaned member (exists in organization_members but not in auth.users).
 * Removes from both organization_members and user_roles.
 */
async function cleanOrphanedMember(userId: string, organizationId: string) {
  await Promise.all([
    supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organizationId),
    supabase
      .from("organization_members")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organizationId),
  ]);
}

export function useTeamMembers() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", organization?.id],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!organization?.id) return [];

      // Fetch organization members
      const { data: orgMembers, error: membersError } = await supabase
        .from("organization_members")
        .select("user_id, role, created_at, display_role")
        .eq("organization_id", organization.id);

      if (membersError) {
        console.error("Error fetching members:", membersError);
        return [];
      }

      if (!orgMembers?.length) return [];

      // Fetch profiles for these users
      const userIds = orgMembers.map((m) => m.user_id);

      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds),
        supabase
          .from("user_roles")
          .select("user_id, role")
          .eq("organization_id", organization.id)
          .in("user_id", userIds),
      ]);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );
      const roleMap = new Map(
        (roles || []).map((r) => [r.user_id, r.role as AppRole])
      );

      // Detect orphaned members: those without a profile are likely deleted auth users
      const orphanedIds = orgMembers
        .filter((m) => !profileMap.has(m.user_id) && m.user_id !== user?.id)
        .map((m) => m.user_id);

      if (orphanedIds.length > 0) {
        // Clean up orphans in background
        Promise.all(
          orphanedIds.map((id) => cleanOrphanedMember(id, organization.id))
        ).then(() => {
          toast.info(
            `Se ${orphanedIds.length === 1 ? 'eliminó 1 usuario inválido' : `eliminaron ${orphanedIds.length} usuarios inválidos`} automáticamente.`,
            { description: "Cuentas que ya no existen en el sistema fueron limpiadas.", duration: 5000 }
          );
          queryClient.invalidateQueries({ queryKey: ["team-members"] });
          queryClient.invalidateQueries({ queryKey: ["team-count"] });
        });
      }

      // Return only valid members
      return orgMembers
        .filter((m) => !orphanedIds.includes(m.user_id))
        .map((m) => {
          const profile = profileMap.get(m.user_id);
          return {
            user_id: m.user_id,
            email: "",
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            member_role: m.role,
            app_role: roleMap.get(m.user_id) || null,
            display_role: (m as any).display_role || null,
            joined_at: m.created_at,
          };
        });
    },
    enabled: !!organization?.id,
  });

  const changeRole = useMutation({
    mutationFn: async ({
      targetUserId,
      newRole,
    }: {
      targetUserId: string;
      newRole: AppRole;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      if (newRole === "super_admin") {
        const { error } = await supabase.rpc("dev_promote_to_super_admin", {
          p_user_id: targetUserId,
          p_organization_id: organization.id,
        });
        if (error) {
          if (error.code === "23503") {
            await cleanOrphanedMember(targetUserId, organization.id);
            throw new Error("Este usuario ya no existe en el sistema. Se ha eliminado automáticamente.");
          }
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", targetUserId)
          .eq("organization_id", organization.id)
          .select()
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            const { error: insertError } = await supabase
              .from("user_roles")
              .insert({
                user_id: targetUserId,
                organization_id: organization.id,
                role: newRole,
              });
            if (insertError) {
              if (insertError.code === "23503") {
                await cleanOrphanedMember(targetUserId, organization.id);
                throw new Error("Este usuario ya no existe en el sistema. Se ha eliminado automáticamente.");
              }
              throw insertError;
            }
          } else if (error.code === "23503") {
            await cleanOrphanedMember(targetUserId, organization.id);
            throw new Error("Este usuario ya no existe en el sistema. Se ha eliminado automáticamente.");
          } else {
            throw error;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      queryClient.invalidateQueries({ queryKey: ["team-count"] });
      toast.success("Rol actualizado correctamente");
    },
    onError: (error: Error) => {
      console.error("Error changing role:", error);
      toast.error(error.message || "Error al cambiar el rol. Verifica tus permisos.");
    },
  });

  const inviteMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!organization?.id) throw new Error("No organization");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No autenticado");

      const response = await supabase.functions.invoke("invite-member", {
        body: { email, role, organization_id: organization.id },
      });

      if (response.error) {
        throw new Error(response.error.message || "Error al invitar");
      }

      const result = response.data;
      if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      toast.success(data?.message || `Invitación enviada a ${variables.email}`);
    },
    onError: (error: Error) => {
      console.error("Invite error:", error);
      toast.error(error.message || "Error al enviar la invitación");
    },
  });

  // Fetch pending invitations
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ["pending-invitations", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("pending_invitations")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("status", "sent")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching invitations:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!organization?.id) throw new Error("No organization");
      const { error } = await supabase
        .from("pending_invitations")
        .delete()
        .eq("id", invitationId)
        .eq("organization_id", organization.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      toast.success("Invitación cancelada correctamente");
    },
    onError: (error) => {
      console.error("Cancel invitation error:", error);
      toast.error("Error al cancelar la invitación");
    },
  });

  const removeMember = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!organization?.id) throw new Error("No organization");
      // Remove user role (ignore errors — may not exist or user may be orphaned)
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("organization_id", organization.id);
      // Remove org membership
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("user_id", targetUserId)
        .eq("organization_id", organization.id);
      if (error) {
        if (error.code === "23503") {
          // FK issue — force cleanup
          await cleanOrphanedMember(targetUserId, organization.id);
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team-count"] });
      toast.success("Miembro eliminado correctamente");
    },
    onError: (error) => {
      console.error("Remove member error:", error);
      toast.error("Error al eliminar el miembro");
    },
  });

  const updateDisplayRole = useMutation({
    mutationFn: async ({
      targetUserId,
      displayRole,
    }: {
      targetUserId: string;
      displayRole: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      const { error } = await supabase
        .from("organization_members")
        .update({ display_role: displayRole || null } as any)
        .eq("user_id", targetUserId)
        .eq("organization_id", organization.id);

      if (error) {
        if (error.code === "23503") {
          await cleanOrphanedMember(targetUserId, organization.id);
          throw new Error("Este usuario ya no existe en el sistema. Se ha eliminado automáticamente.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Nombre de cargo actualizado");
    },
    onError: (error: Error) => {
      console.error("Update display role error:", error);
      toast.error(error.message || "Error al actualizar el nombre de cargo");
    },
  });

  return {
    members,
    isLoading,
    changeRole,
    inviteMember,
    pendingInvitations,
    cancelInvitation,
    removeMember,
    updateDisplayRole,
  };
}
