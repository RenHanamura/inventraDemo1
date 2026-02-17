import { Box, DollarSign, Users, Truck, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export function SuiteMenu() {
  const { t } = useLanguage();

  const suiteApps = [
    { name: 'Inventra', icon: Box, status: 'active' as const, description: t('suite.inventra') },
    { name: 'Ciméntica Finance', icon: DollarSign, status: 'coming-soon' as const, description: t('suite.finance') },
    { name: 'Ciméntica HR', icon: Users, status: 'coming-soon' as const, description: t('suite.hr') },
    { name: 'Ciméntica Fleet', icon: Truck, status: 'coming-soon' as const, description: t('suite.fleet') },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10"><LayoutGrid className="h-5 w-5" /></Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover z-50" align="end">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">{t('suite.title')}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t('suite.subtitle')}</p>
        </div>
        <div className="p-2">
          {suiteApps.map((app) => (
            <button key={app.name} disabled={app.status === 'coming-soon'}
              className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                app.status === 'active' ? "bg-primary/10 hover:bg-primary/15 cursor-pointer" : "opacity-50 cursor-not-allowed"
              )}>
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center",
                app.status === 'active' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}><app.icon className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium text-sm", app.status === 'coming-soon' && "text-muted-foreground")}>{app.name}</span>
                  {app.status === 'coming-soon' && <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{t('common.comingSoon')}</span>}
                  {app.status === 'active' && <span className="text-[10px] font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded">{t('common.active')}</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{app.description}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">Powered by Ciméntica Solutions</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}