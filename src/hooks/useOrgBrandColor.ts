import { useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';

const BRAND_COLORS: Record<string, string> = {
  '#0d9488': '175 84% 32%',
  '#3b82f6': '217 91% 60%',
  '#6366f1': '239 84% 67%',
  '#9333ea': '271 81% 56%',
  '#ec4899': '330 81% 60%',
  '#ef4444': '0 84% 60%',
  '#f97316': '24 95% 53%',
  '#f59e0b': '38 92% 50%',
};

function applyBrandColor(hsl: string) {
  const root = document.documentElement;
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--accent', hsl);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--sidebar-primary', hsl);
  root.style.setProperty('--sidebar-ring', hsl);
  root.style.setProperty('--chart-1', hsl);
}

/**
 * Single source of truth: applies the organization's brand color
 * to CSS variables on mount and whenever the org data changes.
 */
export function useOrgBrandColor() {
  const { organization } = useOrganization();

  useEffect(() => {
    if (organization?.primary_color) {
      const hsl = BRAND_COLORS[organization.primary_color];
      if (hsl) {
        applyBrandColor(hsl);
      }
    }
  }, [organization?.primary_color]);
}
