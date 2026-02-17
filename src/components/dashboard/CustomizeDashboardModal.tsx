import { Settings2, RotateCcw, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AVAILABLE_MODULES, DashboardModule } from '@/hooks/useDashboardConfig';
import { cn } from '@/lib/utils';

interface CustomizeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  enabledModules?: string[];
  onToggleModule?: (moduleId: string) => void;
}

function ModuleCard({
  module,
  isEnabled,
  onToggle,
}: {
  module: DashboardModule;
  isEnabled: boolean;
  onToggle: () => void;
}) {
  const Icon = module.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
        isEnabled
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/50'
      )}
      onClick={onToggle}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
          isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{module.name}</p>
        <p className="text-sm text-muted-foreground truncate">{module.description}</p>
      </div>
      <Switch checked={isEnabled} onCheckedChange={onToggle} />
    </div>
  );
}

const DEFAULT_MODULES = [
  'kpi-products',
  'kpi-value',
  'kpi-lowstock',
  'kpi-categories',
  'chart-stock',
  'table-activity',
];

export function CustomizeDashboardModal({ 
  isOpen, 
  onClose,
  enabledModules = DEFAULT_MODULES,
  onToggleModule,
}: CustomizeDashboardModalProps) {
  const isModuleEnabled = (moduleId: string) => enabledModules.includes(moduleId);
  
  const handleToggle = (moduleId: string) => {
    if (onToggleModule) {
      onToggleModule(moduleId);
    }
  };

  const handleReset = () => {
    DEFAULT_MODULES.forEach((moduleId) => {
      if (!enabledModules.includes(moduleId)) {
        onToggleModule?.(moduleId);
      }
    });
    enabledModules.forEach((moduleId) => {
      if (!DEFAULT_MODULES.includes(moduleId)) {
        onToggleModule?.(moduleId);
      }
    });
  };

  const kpiModules = AVAILABLE_MODULES.filter((m) => m.type === 'kpi');
  const chartModules = AVAILABLE_MODULES.filter((m) => m.type === 'chart');
  const tableModules = AVAILABLE_MODULES.filter((m) => m.type === 'table');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Customize Dashboard
          </DialogTitle>
          <DialogDescription>
            Choose which modules to display on your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* KPI Modules */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              KPI Cards
            </h3>
            <div className="space-y-2">
              {kpiModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  isEnabled={isModuleEnabled(module.id)}
                  onToggle={() => handleToggle(module.id)}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Chart Modules */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Charts
            </h3>
            <div className="space-y-2">
              {chartModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  isEnabled={isModuleEnabled(module.id)}
                  onToggle={() => handleToggle(module.id)}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Table Modules */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Tables
            </h3>
            <div className="space-y-2">
              {tableModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  isEnabled={isModuleEnabled(module.id)}
                  onToggle={() => handleToggle(module.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4" />
            {enabledModules.length} modules active
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
