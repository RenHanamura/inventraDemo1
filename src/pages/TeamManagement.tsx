import { useState } from "react";
import {
  Users, Shield, Mail, Loader2, UserPlus, Crown, Trash2, AlertTriangle, Pencil, Check, X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useTeamMembers, type TeamMember } from "@/hooks/useTeamMembers";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

const MAX_LICENSES = 5;

function MemberCard({
  member, isCurrentUser, canManage, isSuperAdmin, onRoleChange, onRemoveClick, onDisplayRoleChange, isChanging, t,
}: {
  member: TeamMember; isCurrentUser: boolean; canManage: boolean; isSuperAdmin: boolean;
  onRoleChange: (userId: string, role: AppRole) => void; onRemoveClick: (member: TeamMember) => void;
  onDisplayRoleChange: (userId: string, displayRole: string) => void; isChanging: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [selectedRole, setSelectedRole] = useState<AppRole | "">(member.app_role || "");
  const [editingDisplayRole, setEditingDisplayRole] = useState(false);
  const [displayRoleInput, setDisplayRoleInput] = useState(member.display_role || "");
  const displayName = member.full_name || member.email || "User";
  const initials = displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleApply = () => {
    if (selectedRole && selectedRole !== member.app_role) onRoleChange(member.user_id, selectedRole);
  };

  const isRealMember = !member.user_id.startsWith("demo-");

  const ROLE_COLORS: Record<AppRole, string> = {
    super_admin: "bg-primary text-primary-foreground",
    admin: "bg-accent text-accent-foreground",
    warehouse_manager: "bg-warning text-warning-foreground",
    staff: "bg-secondary text-secondary-foreground",
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            {member.avatar_url && <AvatarImage src={member.avatar_url} />}
            <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{displayName}</p>
              {isCurrentUser && <Badge variant="outline" className="text-xs shrink-0">{t('team.you')}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground truncate">{member.email || `${new Date(member.joined_at).toLocaleDateString()}`}</p>
            {isSuperAdmin && isRealMember ? (
              editingDisplayRole ? (
                <div className="flex items-center gap-1 mt-1">
                  <Input value={displayRoleInput} onChange={(e) => setDisplayRoleInput(e.target.value)} className="h-7 text-xs w-48" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") { onDisplayRoleChange(member.user_id, displayRoleInput); setEditingDisplayRole(false); } if (e.key === "Escape") setEditingDisplayRole(false); }} />
                  <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded text-primary hover:bg-primary/10"
                    onClick={() => { onDisplayRoleChange(member.user_id, displayRoleInput); setEditingDisplayRole(false); }}><Check className="h-3.5 w-3.5" /></button>
                  <button type="button" className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-muted"
                    onClick={() => setEditingDisplayRole(false)}><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <button type="button" className="flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setEditingDisplayRole(true)}>
                  <Pencil className="h-3 w-3" />{member.display_role || t('team.addCustomRole')}
                </button>
              )
            ) : member.display_role ? (
              <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{member.display_role}</p>
            ) : null}
          </div>
        </div>

        {(!canManage || !isRealMember) && (
          <Badge className={member.app_role ? ROLE_COLORS[member.app_role] : "bg-muted text-muted-foreground"}>
            {member.display_role || (member.app_role ? t(`role.${member.app_role}`) : t('role.noRole'))}
          </Badge>
        )}
      </div>

      {canManage && isRealMember && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as AppRole)}
            className="h-9 min-w-[140px] max-w-[180px] flex-shrink-0 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">{t('role.noRole')}</option>
            <option value="super_admin">👑 {t('role.super_admin')}</option>
            <option value="admin">{t('role.admin')}</option>
            <option value="warehouse_manager">{t('role.warehouse_manager')}</option>
            <option value="staff">{t('role.staff')}</option>
          </select>
          <Button type="button" size="sm" variant="outline" className="flex-shrink-0" onClick={handleApply}
            disabled={!selectedRole || selectedRole === member.app_role || isChanging}>
            {isChanging ? <Loader2 className="h-4 w-4 animate-spin" /> : t('team.apply')}
          </Button>
          {!isCurrentUser && (
            <Button type="button" variant="destructive" size="sm" className="flex-shrink-0 ml-auto" onClick={() => onRemoveClick(member)}>
              <Trash2 className="h-4 w-4 mr-1" />{t('team.remove')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const DEMO_MEMBERS: TeamMember[] = [
  { user_id: "demo-1", email: "admin@empresa.com", full_name: "Carlos Martínez", avatar_url: null, member_role: "admin", app_role: "admin", display_role: "Director de Operaciones", joined_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { user_id: "demo-2", email: "almacen@empresa.com", full_name: "Ana López", avatar_url: null, member_role: "member", app_role: "warehouse_manager", display_role: null, joined_at: new Date(Date.now() - 14 * 86400000).toISOString() },
  { user_id: "demo-3", email: "staff@empresa.com", full_name: "Miguel Torres", avatar_url: null, member_role: "member", app_role: "staff", display_role: null, joined_at: new Date(Date.now() - 7 * 86400000).toISOString() },
];

export default function TeamManagement() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const { members, isLoading, changeRole, inviteMember, pendingInvitations, cancelInvitation, removeMember, updateDisplayRole } = useTeamMembers();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("staff");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const canManage = isSuperAdmin || isAdmin;
  const displayMembers = members.length > 0 ? members : DEMO_MEMBERS;
  const isDemo = members.length === 0;
  const usedLicenses = members.length + pendingInvitations.length;
  const licenseLimitReached = usedLicenses >= MAX_LICENSES;
  const licensePercent = Math.min((usedLicenses / MAX_LICENSES) * 100, 100);

  const handleRoleChange = (userId: string, newRole: AppRole) => { changeRole.mutate({ targetUserId: userId, newRole }); };
  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMember.mutate({ email: inviteEmail.trim(), role: inviteRole }, { onSuccess: () => { setInviteEmail(""); setInviteRole("staff"); setInviteOpen(false); } });
  };
  const handleRemoveMember = () => { if (!memberToRemove) return; removeMember.mutate(memberToRemove.user_id, { onSuccess: () => setMemberToRemove(null) }); };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />{t('team.title')}</h1>
          <p className="text-muted-foreground">{t('team.subtitle')}</p>
        </div>
        {canManage && (
          <TooltipProvider><Tooltip><TooltipTrigger asChild><span>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={licenseLimitReached}><UserPlus className="h-4 w-4" />{t('team.inviteMember')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('team.inviteNew')}</DialogTitle>
                  <DialogDescription>{t('team.inviteDesc')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">{t('suppliers.email')}</Label>
                    <Input id="invite-email" type="email" placeholder="user@example.com" value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInvite()} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.role')}</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin"><span className="flex items-center gap-2"><Crown className="h-3 w-3" /> {t('role.super_admin')}</span></SelectItem>
                        <SelectItem value="admin">{t('role.admin')}</SelectItem>
                        <SelectItem value="warehouse_manager">{t('role.warehouse_manager')}</SelectItem>
                        <SelectItem value="staff">{t('role.staff')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>{t('common.cancel')}</Button>
                  <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteMember.isPending}>
                    {inviteMember.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                    {t('team.sendInvitation')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </span></TooltipTrigger>
          {licenseLimitReached && <TooltipContent><p>{t('team.licenseLimitReached')}</p></TooltipContent>}
          </Tooltip></TooltipProvider>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 space-y-3">
          <div className="flex items-baseline justify-between"><div className="text-2xl font-bold">{usedLicenses}</div><span className="text-sm text-muted-foreground">/ {MAX_LICENSES}</span></div>
          <Progress value={licensePercent} className="h-2" /><p className="text-sm text-muted-foreground">{t('team.licenseUsage')}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{displayMembers.filter((m) => m.app_role === "super_admin" || m.app_role === "admin").length}</div><p className="text-sm text-muted-foreground">{t('team.admins')}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{displayMembers.filter((m) => m.app_role === "warehouse_manager").length}</div><p className="text-sm text-muted-foreground">{t('team.warehouseManagers')}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{displayMembers.filter((m) => m.app_role === "staff" || !m.app_role).length}</div><p className="text-sm text-muted-foreground">{t('team.staff')}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t('team.orgMembers')}</CardTitle>
          <CardDescription>{canManage ? t('team.orgMembersDescAdmin') : t('team.orgMembersDescView')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isDemo && (
            <div className="bg-muted/50 border border-dashed border-border rounded-lg p-3 mb-4">
              <p className="text-sm text-muted-foreground text-center">📋 Demo data shown. Real members will appear when they register.</p>
            </div>
          )}
          {displayMembers.map((member) => (
            <MemberCard key={member.user_id} member={member} isCurrentUser={member.user_id === user?.id} canManage={canManage} isSuperAdmin={isSuperAdmin}
              onRoleChange={handleRoleChange} onRemoveClick={setMemberToRemove}
              onDisplayRoleChange={(userId, displayRole) => updateDisplayRole.mutate({ targetUserId: userId, displayRole })}
              isChanging={changeRole.isPending} t={t} />
          ))}

          {pendingInvitations.length > 0 && (
            <>
              <Separator className="my-4" />
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('reports.pending')}</p>
              {pendingInvitations.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-dashed border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10"><AvatarFallback className="bg-muted text-muted-foreground text-sm"><Mail className="h-4 w-4" /></AvatarFallback></Avatar>
                    <div><p className="font-medium">{inv.email}</p><p className="text-sm text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-warning/20 text-warning-foreground border-warning/30">{t('reports.pending')}</Badge>
                    <Badge variant="outline">{t(`role.${inv.role}`)}</Badge>
                    {canManage && (
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => cancelInvitation.mutate(inv.id)} disabled={cancelInvitation.isPending}>
                        {cancelInvitation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('role.super_admin')}/{t('role.admin')}/{t('role.warehouse_manager')}/{t('role.staff')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {(['super_admin', 'admin', 'warehouse_manager', 'staff'] as AppRole[]).map((role) => (
              <div key={role} className="p-4 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2">
                  {role === 'super_admin' ? <Crown className="h-4 w-4 text-primary" /> : role === 'admin' ? <Shield className="h-4 w-4 text-accent" /> : <Users className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium">{t(`role.${role}`)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />{t('common.delete')}?</AlertDialogTitle>
            <AlertDialogDescription>{t('suppliers.deleteDesc', { name: memberToRemove?.full_name || memberToRemove?.email || '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleRemoveMember} disabled={removeMember.isPending}>
              {removeMember.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
