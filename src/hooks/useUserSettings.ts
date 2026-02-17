import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useCallback, useRef } from 'react';

export interface UserSettings {
  id: string;
  user_id: string;
  dashboard_layout: string[];
  enabled_dashboard_modules: string[];
  notification_low_stock: boolean;
  notification_movements: boolean;
  notification_weekly_report: boolean;
  theme_color: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_MODULES = [
  'kpi-products',
  'kpi-value',
  'kpi-lowstock',
  'kpi-categories',
  'chart-stock',
  'table-activity',
];

// Debounce utility
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function useUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const saveToastIdRef = useRef<string | number | undefined>(undefined);

  const { data: settings, isLoading, isFetched } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user settings:', error);
        return null;
      }

      if (!data) {
        // Create default settings if none exist
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user settings:', insertError);
          return null;
        }
        return newSettings as UserSettings;
      }

      return data as UserSettings;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Keep data fresh for 30 seconds
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] });
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Failed to save settings');
    },
  });

  // Debounced layout save with visual feedback
  const debouncedSaveLayout = useCallback(
    debounce(async (moduleIds: string[]) => {
      if (!user?.id) return;

      try {
        // Show saving indicator
        saveToastIdRef.current = toast.loading('Saving layout...', {
          id: saveToastIdRef.current,
        });

        const { error } = await supabase
          .from('user_settings')
          .update({
            enabled_dashboard_modules: moduleIds as unknown as string[],
            dashboard_layout: moduleIds as unknown as string[],
          })
          .eq('user_id', user.id);

        if (error) throw error;

        // Show success
        toast.success('Layout saved', {
          id: saveToastIdRef.current,
          duration: 1500,
        });
        
        // Invalidate cache
        queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] });
      } catch (error) {
        console.error('Error saving layout:', error);
        toast.error('Failed to save layout', {
          id: saveToastIdRef.current,
        });
      }
    }, 500), // 500ms debounce
    [user?.id, queryClient]
  );

  const updateDashboardLayout = async (moduleIds: string[]) => {
    // Trigger debounced save
    debouncedSaveLayout(moduleIds);
  };

  const updateNotifications = async (notifications: {
    notification_low_stock?: boolean;
    notification_movements?: boolean;
    notification_weekly_report?: boolean;
  }) => {
    return updateSettings.mutateAsync(notifications);
  };

  const updateThemeColor = async (color: string) => {
    return updateSettings.mutateAsync({ theme_color: color });
  };

  // Get enabled modules, ensuring we have valid data before rendering
  const enabledModules = (settings?.enabled_dashboard_modules as string[] | null) || DEFAULT_MODULES;

  return {
    settings,
    isLoading,
    isFetched,
    enabledModules,
    updateSettings,
    updateDashboardLayout,
    updateNotifications,
    updateThemeColor,
    isSaving: updateSettings.isPending,
  };
}
