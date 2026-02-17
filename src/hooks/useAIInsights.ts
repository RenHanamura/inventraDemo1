import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export function useAIInsights(type: 'inventory' | 'movements') {
  const { language } = useLanguage();
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const analyze = useCallback(async () => {
    setIsLoading(true);
    setIsOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: { type, language },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setInsights([]);
        return;
      }
      setInsights(data.insights || []);
    } catch (err) {
      console.error('AI insights error:', err);
      toast.error('Error al generar análisis de IA');
      setInsights([]);
    } finally {
      setIsLoading(false);
    }
  }, [type, language]);

  return { insights, isLoading, isOpen, setIsOpen, analyze };
}
