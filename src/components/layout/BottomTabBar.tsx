import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, MapPin, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tabs = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/inventory', icon: Package, label: t('nav.inventory') },
    { to: '/locations', icon: MapPin, label: t('nav.locations') },
    { to: '/movements', icon: ArrowLeftRight, label: t('nav.movements') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.to === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(tab.to);
          
          return (
            <button
              key={tab.to}
              onClick={() => navigate(tab.to)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors touch-manipulation",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn(
                "h-6 w-6 transition-transform",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] font-medium hyphens-auto leading-tight text-center max-w-[60px]",
                isActive && "font-semibold"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}