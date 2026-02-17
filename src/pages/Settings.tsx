import { useState, useEffect } from 'react';
import { User, Bell, Palette, Loader2, Shield } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useLanguage } from '@/contexts/LanguageContext';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { DevConsole } from '@/components/settings/DevConsole';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { settings, isLoading, updateNotifications, isSaving } = useUserSettings();
  const { role, roleLabel, isSuperAdmin, isDev } = useUserRole();
  const { t } = useLanguage();
  
  const [localNotifications, setLocalNotifications] = useState({
    lowStock: true, newMovements: false, weeklyReport: true,
  });

  useEffect(() => {
    if (settings) {
      setLocalNotifications({
        lowStock: settings.notification_low_stock,
        newMovements: settings.notification_movements,
        weeklyReport: settings.notification_weekly_report,
      });
    }
  }, [settings]);

  const handleNotificationChange = async (key: keyof typeof localNotifications, value: boolean) => {
    setLocalNotifications((prev) => ({ ...prev, [key]: value }));
    const fieldMap = { lowStock: 'notification_low_stock', newMovements: 'notification_movements', weeklyReport: 'notification_weekly_report' };
    await updateNotifications({ [fieldMap[key]]: value });
  };

  const userInitials = user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </div>
        {isSaving && (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('settings.saving')}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{t('settings.profileSettings')}</CardTitle>
            <CardDescription>{t('settings.profileDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary text-primary-foreground text-lg">{userInitials}</AvatarFallback></Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{user?.user_metadata?.full_name || t('settings.user')}</p>
                  {isSuperAdmin && (<Badge variant="default" className="gap-1 text-xs"><Shield className="h-3 w-3" />{t('settings.fullAccess')}</Badge>)}
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {role && (<p className="text-xs text-muted-foreground mt-1">{t('settings.role')}: <span className="font-medium">{roleLabel}</span></p>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />{t('settings.appearance')}</CardTitle>
            <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.darkMode')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.darkModeDesc')}</p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />{t('settings.notifications')}</CardTitle>
            <CardDescription>{t('settings.notificationsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.lowStockAlerts')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.lowStockAlertsDesc')}</p>
              </div>
              <Switch checked={localNotifications.lowStock} onCheckedChange={(checked) => handleNotificationChange('lowStock', checked)} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.newMovements')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.newMovementsDesc')}</p>
              </div>
              <Switch checked={localNotifications.newMovements} onCheckedChange={(checked) => handleNotificationChange('newMovements', checked)} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('settings.weeklyReport')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.weeklyReportDesc')}</p>
              </div>
              <Switch checked={localNotifications.weeklyReport} onCheckedChange={(checked) => handleNotificationChange('weeklyReport', checked)} />
            </div>
          </CardContent>
        </Card>

        <BrandingSettings />
        <DevConsole />
      </div>
    </div>
  );
}