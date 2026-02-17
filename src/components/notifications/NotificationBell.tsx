import { Bell, AlertTriangle, ArrowRightLeft, CheckCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';

function NotifIcon({ type }: { type: string }) {
  if (type === 'ai_suggestion') {
    return (
      <div className="mt-0.5 rounded-full p-1.5 shrink-0 bg-primary/15 text-primary ring-1 ring-primary/20">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
    );
  }
  if (type === 'low_stock') {
    return (
      <div className="mt-0.5 rounded-full p-1.5 shrink-0 bg-destructive/10 text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
      </div>
    );
  }
  return (
    <div className="mt-0.5 rounded-full p-1.5 shrink-0 bg-primary/10 text-primary">
      <ArrowRightLeft className="h-3.5 w-3.5" />
    </div>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const recentNotifications = notifications.slice(0, 8);

  const handleClick = (notif: typeof notifications[0]) => {
    if (!notif.is_read) {
      markAsRead.mutate(notif.id);
    }
    const sku = (notif as any).products?.sku;
    if (sku) {
      navigate(`/inventory?search=${encodeURIComponent(sku)}`);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-50" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {recentNotifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Sin notificaciones
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentNotifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    'flex items-start gap-3 w-full p-3 text-left transition-colors hover:bg-muted/50',
                    !notif.is_read && 'bg-primary/5',
                    notif.type === 'ai_suggestion' && !notif.is_read && 'bg-primary/8'
                  )}
                >
                  <NotifIcon type={notif.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {notif.type === 'ai_suggestion' && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">IA</span>
                      )}
                      <p className={cn('text-sm', !notif.is_read && 'font-medium')}>
                        {notif.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
