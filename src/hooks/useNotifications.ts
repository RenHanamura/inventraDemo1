import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  type: "low_stock" | "movement" | "ai_suggestion";
  title: string;
  message: string;
  product_id: string | null;
  is_read: boolean;
  created_at: string;
  products?: { sku: string } | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, products(sku)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const unreadCount = query.data?.filter((n) => !n.is_read).length ?? 0;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const dismissNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const triggerAISuggestions = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-suggestions');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    triggerAISuggestions,
  };
}

/** Generate client-side notifications from current product data */
export function useGenerateNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const generate = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { data: allProducts } = await supabase.from("products").select("id, name, quantity, reorder_point");

      const lowStockProducts = (allProducts ?? []).filter((p) => p.quantity <= p.reorder_point);

      const { data: existingNotifs } = await supabase
        .from("notifications")
        .select("product_id")
        .eq("user_id", user.id)
        .eq("type", "low_stock")
        .eq("is_read", false);

      const existingProductIds = new Set((existingNotifs ?? []).map((n) => n.product_id));

      const newNotifs = lowStockProducts
        .filter((p) => !existingProductIds.has(p.id))
        .map((p) => ({
          user_id: user.id,
          type: "low_stock" as const,
          title: `Stock bajo en ${p.name}`,
          message: `${p.name} tiene ${p.quantity} unidades (mínimo: ${p.reorder_point})`,
          product_id: p.id,
        }));

      if (newNotifs.length > 0) {
        await supabase.from("notifications").insert(newNotifs);
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentMovements } = await supabase
        .from("movements")
        .select("id, product_id, type, quantity, created_at, products(name)")
        .gte("created_at", oneHourAgo)
        .order("created_at", { ascending: false })
        .limit(10);

      const { data: existingMovNotifs } = await supabase
        .from("notifications")
        .select("message")
        .eq("user_id", user.id)
        .eq("type", "movement")
        .gte("created_at", oneHourAgo);

      const existingMessages = new Set((existingMovNotifs ?? []).map((n) => n.message));

      const movNotifs = (recentMovements ?? [])
        .map((m) => {
          const productName = (m.products as any)?.name ?? "Producto";
          const typeLabel = m.type === "incoming" ? "Entrada" : "Salida";
          const message = `${typeLabel} de ${m.quantity} uds de ${productName}`;
          return {
            user_id: user!.id,
            type: "movement" as const,
            title: "Nuevo movimiento registrado",
            message,
            product_id: m.product_id,
          };
        })
        .filter((n) => !existingMessages.has(n.message));

      if (movNotifs.length > 0) {
        await supabase.from("notifications").insert(movNotifs);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  return generate;
}
