import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  created_at: string;
}

interface UseAuditLogsOptions {
  tableName?: string;
  recordId?: string;
  action?: "INSERT" | "UPDATE" | "DELETE";
  limit?: number;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { tableName, recordId, action, limit = 100 } = options;
  const queryClient = useQueryClient();

  // Real-time subscription for audit_logs
  useEffect(() => {
    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["audit-logs", tableName, recordId, action, limit],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tableName) {
        query = query.eq("table_name", tableName);
      }

      if (recordId) {
        query = query.eq("record_id", recordId);
      }

      if (action) {
        query = query.eq("action", action);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

// Utility function to format audit log changes for display
export function formatAuditChange(log: AuditLog): string {
  const data = log.new_data || log.old_data;
  const productName = (data?.name as string) || (data?.sku as string) || 'Unknown';
  
  switch (log.action) {
    case 'INSERT':
      return `Created ${log.table_name.replace('_', ' ')}: ${productName}`;
    case 'DELETE':
      return `Deleted ${log.table_name.replace('_', ' ')}: ${productName}`;
    case 'UPDATE': {
      if (!log.changed_fields || log.changed_fields.length === 0) {
        return `Updated ${productName}`;
      }
      
      // Format specific field changes
      const changes: string[] = [];
      
      for (const field of log.changed_fields) {
        const oldVal = log.old_data?.[field];
        const newVal = log.new_data?.[field];
        
        // Skip updated_at field
        if (field === 'updated_at') continue;
        
        if (field === 'status_category') {
          changes.push(`status changed from "${oldVal}" to "${newVal}"`);
        } else if (field === 'custodian') {
          const oldCust = oldVal || 'none';
          const newCust = newVal || 'none';
          changes.push(`custodian changed from "${oldCust}" to "${newCust}"`);
        } else if (field === 'quantity') {
          changes.push(`quantity changed from ${oldVal} to ${newVal}`);
        } else if (field === 'micro_location') {
          changes.push(`location changed to "${newVal}"`);
        } else {
          changes.push(`${field.replace('_', ' ')} updated`);
        }
      }
      
      if (changes.length === 0) {
        return `Updated ${productName}`;
      }
      
      return `${productName}: ${changes.join(', ')}`;
    }
    default:
      return `${log.action} on ${log.table_name}`;
  }
}
