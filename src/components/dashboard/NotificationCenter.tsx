import { Bell, AlertTriangle, ArrowRightLeft, CheckCheck, Check, Sparkles, X, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

function NotificationIcon({ type }: { type: string }) {
  if (type === "ai_suggestion") {
    return (
      <div className="mt-0.5 rounded-full p-2 shrink-0 bg-primary/15 text-primary ring-1 ring-primary/20">
        <Sparkles className="h-4 w-4" />
      </div>
    );
  }
  if (type === "low_stock") {
    return (
      <div className="mt-0.5 rounded-full p-2 shrink-0 bg-destructive/10 text-destructive">
        <AlertTriangle className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="mt-0.5 rounded-full p-2 shrink-0 bg-primary/10 text-primary">
      <ArrowRightLeft className="h-4 w-4" />
    </div>
  );
}

export function NotificationCenter() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead, dismissNotification, triggerAISuggestions } = useNotifications();
  const navigate = useNavigate();

  const recentNotifications = notifications.slice(0, 10);

  const handleClick = (notif: (typeof notifications)[0]) => {
    if (!notif.is_read) {
      markAsRead.mutate(notif.id);
    }
    const sku = (notif as any).products?.sku;
    if (sku) {
      navigate(`/inventory?search=${encodeURIComponent(sku)}`);
    }
  };

  const handleDismiss = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    dismissNotification.mutate(notifId);
  };

  const handleGenerateAI = () => {
    triggerAISuggestions.mutate(undefined, {
      onSuccess: (data: any) => {
        toast.success(`✨ ${data?.suggestions || 0} sugerencias IA generadas`);
      },
      onError: () => {
        toast.error("Error al generar sugerencias IA");
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Centro de Notificaciones
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleGenerateAI}
            disabled={triggerAISuggestions.isPending}
          >
            <Brain className="h-3.5 w-3.5" />
            {triggerAISuggestions.isPending ? "Analizando..." : "Generar IA"}
          </Button>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentNotifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Sin notificaciones recientes
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "flex items-start gap-3 w-full p-3 rounded-xl text-left transition-colors hover:bg-muted/50 border cursor-pointer",
                    !notif.is_read && "bg-primary/5 border-primary/10",
                    notif.is_read && "border-transparent",
                    notif.type === "ai_suggestion" && !notif.is_read && "bg-primary/8 border-primary/20",
                  )}
                >
                  <NotificationIcon type={notif.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {notif.type === "ai_suggestion" && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">IA</span>
                        )}
                        <p className={cn("text-sm", !notif.is_read && "font-medium")}>{notif.title}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead.mutate(notif.id);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        {notif.type === "ai_suggestion" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDismiss(e, notif.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                      {notif.type === "ai_suggestion" && notif.product_id && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            const sku = (notif as any).products?.sku;
                            if (sku) navigate(`/inventory?search=${encodeURIComponent(sku)}`);
                          }}
                        >
                          Gestionar →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
