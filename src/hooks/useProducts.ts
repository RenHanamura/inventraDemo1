import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export type ProductStatusCategory = "available" | "under_maintenance" | "repairing" | "refunded" | "assigned";

export const PRODUCT_STATUS_LABELS: Record<ProductStatusCategory, string> = {
  available: "Available",
  under_maintenance: "Under Maintenance",
  repairing: "Repairing",
  refunded: "Refunded/Returned",
  assigned: "Assigned/In Custody",
};

export const PRODUCT_STATUS_COLORS: Record<ProductStatusCategory, string> = {
  available: "bg-success text-success-foreground",
  under_maintenance: "bg-warning text-warning-foreground",
  repairing: "bg-orange-500 text-white",
  refunded: "bg-muted text-muted-foreground",
  assigned: "bg-primary text-primary-foreground",
};

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category_id: string | null;
  supplier_id: string | null;
  quantity: number;
  unit_price: number;
  cost_price: number;
  reorder_point: number;
  image_url: string | null;
  serial_number: string | null;
  micro_location: string | null;
  status_category: ProductStatusCategory;
  custodian: string | null;
  maintenance_alert_date: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}

export function useProducts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name),
          supplier:suppliers(id, name)
        `,
        )
        .order("name");

      if (error) throw error;
      return data as Product[];
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: {
      name: string;
      sku: string;
      description?: string;
      category_id?: string;
      supplier_id?: string;
      quantity: number;
      unit_price: number;
      cost_price?: number;
      reorder_point?: number;
      image_url?: string;
      serial_number?: string;
      micro_location?: string;
      status_category?: ProductStatusCategory;
      custodian?: string;
      maintenance_alert_date?: string;
    }) => {
      const { data, error } = await supabase.from("products").insert(product).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Product created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create product", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...product
    }: {
      id: string;
      name?: string;
      sku?: string;
      description?: string;
      category_id?: string | null;
      supplier_id?: string | null;
      quantity?: number;
      unit_price?: number;
      cost_price?: number;
      reorder_point?: number;
      image_url?: string;
      serial_number?: string | null;
      micro_location?: string | null;
      status_category?: ProductStatusCategory;
      custodian?: string | null;
      maintenance_alert_date?: string | null;
    }) => {
      const { data, error } = await supabase.from("products").update(product).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Product updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update product", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_product_cascade", {
        p_product_id: id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete product", description: error.message, variant: "destructive" });
    },
  });
}
