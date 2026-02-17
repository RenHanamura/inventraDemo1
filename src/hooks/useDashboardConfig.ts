import { useState, useEffect } from 'react';
import { Package, DollarSign, AlertTriangle, Layers, BarChart3, Activity, LucideIcon } from 'lucide-react';

export interface DashboardModule {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  type: 'kpi' | 'chart' | 'table';
  size: 'small' | 'medium' | 'large';
}

export const AVAILABLE_MODULES: DashboardModule[] = [
  {
    id: 'kpi-products',
    name: 'Total Products',
    description: 'Shows the total number of products in inventory',
    icon: Package,
    type: 'kpi',
    size: 'small',
  },
  {
    id: 'kpi-value',
    name: 'Inventory Value',
    description: 'Shows the total value of all inventory',
    icon: DollarSign,
    type: 'kpi',
    size: 'small',
  },
  {
    id: 'kpi-lowstock',
    name: 'Low Stock Alert',
    description: 'Shows items that need restocking',
    icon: AlertTriangle,
    type: 'kpi',
    size: 'small',
  },
  {
    id: 'kpi-categories',
    name: 'Categories',
    description: 'Shows the total number of categories',
    icon: Layers,
    type: 'kpi',
    size: 'small',
  },
  {
    id: 'chart-stock',
    name: 'Stock by Category',
    description: 'Bar chart showing stock distribution by category',
    icon: BarChart3,
    type: 'chart',
    size: 'large',
  },
  {
    id: 'table-activity',
    name: 'Recent Activity',
    description: 'Table showing recent inventory movements',
    icon: Activity,
    type: 'table',
    size: 'large',
  },
];

const STORAGE_KEY = 'inventra-dashboard-config';

const DEFAULT_CONFIG = [
  'kpi-products',
  'kpi-value',
  'kpi-lowstock',
  'kpi-categories',
  'chart-stock',
  'table-activity',
];

export function useDashboardConfig() {
  const [enabledModules, setEnabledModules] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return DEFAULT_CONFIG;
        }
      }
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledModules));
  }, [enabledModules]);

  const toggleModule = (moduleId: string) => {
    setEnabledModules((prev) => {
      if (prev.includes(moduleId)) {
        return prev.filter((id) => id !== moduleId);
      }
      return [...prev, moduleId];
    });
  };

  const isModuleEnabled = (moduleId: string) => enabledModules.includes(moduleId);

  const getEnabledModulesByType = (type: DashboardModule['type']) => {
    return AVAILABLE_MODULES.filter(
      (module) => module.type === type && enabledModules.includes(module.id)
    );
  };

  const reorderModules = (startIndex: number, endIndex: number) => {
    setEnabledModules((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const getOrderedEnabledModules = () => {
    return enabledModules
      .map((id) => AVAILABLE_MODULES.find((m) => m.id === id))
      .filter((m): m is DashboardModule => m !== undefined);
  };

  const resetToDefault = () => {
    setEnabledModules(DEFAULT_CONFIG);
  };

  return {
    enabledModules,
    toggleModule,
    isModuleEnabled,
    getEnabledModulesByType,
    getOrderedEnabledModules,
    reorderModules,
    resetToDefault,
    availableModules: AVAILABLE_MODULES,
  };
}
