import { useState } from 'react';
import { Terminal, Shield, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, type AppRole } from '@/hooks/useUserRole';

export function DevConsole() {
  const { user } = useAuth();
  const { role, isDev, isSuperAdmin, promoteToSuperAdmin, updateUserRole, ROLE_LABELS } = useUserRole();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');

  // Only render for dev emails
  if (!isDev) return null;

  const handleSelfPromote = async () => {
    if (!user?.id) return;
    await promoteToSuperAdmin.mutateAsync(user.id);
  };

  const handleRoleChange = async () => {
    if (!user?.id || !selectedRole) return;
    await updateUserRole.mutateAsync({ targetUserId: user.id, newRole: selectedRole });
    setSelectedRole('');
  };

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Terminal className="h-5 w-5" />
          Consola de Desarrollador
          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
            DEV
          </Badge>
          {isExpanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
        </CardTitle>
        <CardDescription>Acceso exclusivo para desarrolladores. Visible solo para emails autorizados.</CardDescription>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Current role info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="text-sm font-medium">Tu rol actual</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Badge className="gap-1" variant={isSuperAdmin ? 'default' : 'secondary'}>
              <Shield className="h-3 w-3" />
              {role ? ROLE_LABELS[role] : 'Sin rol asignado'}
            </Badge>
          </div>

          {/* Quick promote */}
          {!isSuperAdmin && (
            <Button
              onClick={handleSelfPromote}
              className="w-full gap-2"
              variant="default"
              disabled={promoteToSuperAdmin.isPending}
            >
              {promoteToSuperAdmin.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Activar Super Admin (God Mode)
            </Button>
          )}

          {/* Manual role override */}
          <div className="space-y-2">
            <Label>Cambiar rol manualmente</Label>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="warehouse_manager">Jefe de Almacén</SelectItem>
                  <SelectItem value="staff">Personal</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleRoleChange}
                disabled={!selectedRole || updateUserRole.isPending}
                size="sm"
              >
                {updateUserRole.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            ⚠️ Este panel solo es visible para: {'{'}dev emails autorizados{'}'}. Los cambios de rol se aplican inmediatamente.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
