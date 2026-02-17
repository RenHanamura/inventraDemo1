import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export type AppRole = "super_admin" | "admin" | "warehouse_manager" | "staff";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  super_admin: 4,
  admin: 3,
  warehouse_manager: 2,
  staff: 1,
};

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  warehouse_manager: "Jefe de Almacén",
  staff: "Personal",
};

// Dev emails that can access the developer console
const DEV_EMAILS = ["admin@cimentica.com", "yosomi5591@gavrom.com", "demo@inventra.app", "gal.blozada@gmail.com"];

export function useUserRole() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role", user?.id, organization?.id],
    queryFn: async (): Promise<AppRole | null> => {
      if (!user?.id || !organization?.id) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return (data?.role as AppRole) || null;
    },
    enabled: !!user?.id && !!organization?.id,
  });

  const isDev = DEV_EMAILS.includes(user?.email || "");
  // Frontend fail-safe: dev emails always get super_admin privileges
  const effectiveRole: AppRole | null = isDev ? "super_admin" : role;
  const isSuperAdmin = effectiveRole === "super_admin";
  const isAdmin = effectiveRole === "admin" || isSuperAdmin;
  const isManager = effectiveRole === "warehouse_manager" || isAdmin;

  const hasRoleOrHigher = (minRole: AppRole): boolean => {
    if (!effectiveRole) return false;
    return ROLE_HIERARCHY[effectiveRole] >= ROLE_HIERARCHY[minRole];
  };

  const updateUserRole = useMutation({
    mutationFn: async ({ targetUserId, newRole }: { targetUserId: string; newRole: AppRole }) => {
      if (!organization?.id) throw new Error("No organization");
      if (!isSuperAdmin && !isDev) throw new Error("Insufficient permissions");

      const { data, error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", targetUserId)
        .eq("organization_id", organization.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      toast.success(`Rol actualizado a ${ROLE_LABELS[variables.newRole]}`);
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast.error("Error al actualizar el rol");
    },
  });

  const promoteToSuperAdmin = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!organization?.id) throw new Error("No organization");

      // Use security definer RPC to bypass RLS
      const { error } = await supabase.rpc('dev_promote_to_super_admin', {
        p_user_id: targetUserId,
        p_organization_id: organization.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      toast.success("Promovido a Super Admin");
    },
    onError: (error) => {
      console.error("Error promoting user:", error);
      toast.error("Error al promover usuario");
    },
  });

  return {
    role: effectiveRole,
    roleLabel: effectiveRole ? ROLE_LABELS[effectiveRole] : "Sin rol",
    isLoading,
    isSuperAdmin,
    isAdmin,
    isManager,
    isDev,
    hasRoleOrHigher,
    updateUserRole,
    promoteToSuperAdmin,
    ROLE_LABELS,
    DEV_EMAILS,
  };
}
