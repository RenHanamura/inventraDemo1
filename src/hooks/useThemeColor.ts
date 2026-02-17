import { useState, useEffect } from 'react';

export interface ThemeColor {
  name: string;
  value: string; // HSL values without parentheses: "175 84% 32%"
  preview: string; // Full HSL for preview: "hsl(175, 84%, 32%)"
}

export const themeColors: ThemeColor[] = [
  { name: 'Teal', value: '175 84% 32%', preview: 'hsl(175, 84%, 32%)' },
  { name: 'Cyan', value: '186 100% 42%', preview: 'hsl(186, 100%, 42%)' },
  { name: 'Blue', value: '217 91% 60%', preview: 'hsl(217, 91%, 60%)' },
  { name: 'Indigo', value: '239 84% 67%', preview: 'hsl(239, 84%, 67%)' },
  { name: 'Green', value: '142 76% 36%', preview: 'hsl(142, 76%, 36%)' },
  { name: 'Orange', value: '24 95% 53%', preview: 'hsl(24, 95%, 53%)' },
  { name: 'Rose', value: '346 77% 50%', preview: 'hsl(346, 77%, 50%)' },
  { name: 'Slate', value: '215 25% 35%', preview: 'hsl(215, 25%, 35%)' },
];

const STORAGE_KEY = 'app-theme-color';

export function useThemeColor() {
  const [currentColor, setCurrentColor] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = themeColors.find(c => c.value === saved);
      return found || themeColors[0];
    }
    return themeColors[0];
  });

  useEffect(() => {
    // Apply the color to CSS variables
    const root = document.documentElement;
    root.style.setProperty('--primary', currentColor.value);
    root.style.setProperty('--accent', currentColor.value);
    root.style.setProperty('--ring', currentColor.value);
    root.style.setProperty('--sidebar-primary', currentColor.value);
    root.style.setProperty('--sidebar-ring', currentColor.value);
    root.style.setProperty('--chart-1', currentColor.value);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, currentColor.value);
  }, [currentColor]);

  const setColor = (color: ThemeColor) => {
    setCurrentColor(color);
  };

  return { currentColor, setColor, colors: themeColors };
}