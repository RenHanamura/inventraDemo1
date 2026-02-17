import { useState } from "react";
import { format } from "date-fns";
import { useAuditLogs, AuditLog } from "@/hooks/useAuditLogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ACTION_BADGES: Record<string, { variant: "default" | "secondary" | "destructive"; icon: React.ReactNode }> = {
  INSERT: { variant: "default", icon: <Plus className="h-3 w-3" /> },
  UPDATE: { variant: "secondary", icon: <Pencil className="h-3 w-3" /> },
  DELETE: { variant: "destructive", icon: <Trash2 className="h-3 w-3" /> },
};

function DataViewDialog({ log }: { log: AuditLog }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Audit Log Details - {log.action} on {log.table_name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="space-y-4 p-4">
            <div>
              <h4 className="font-medium mb-2">Metadata</h4>
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <p><span className="font-medium">Record ID:</span> {log.record_id}</p>
                <p><span className="font-medium">User ID:</span> {log.user_id || "System"}</p>
                <p><span className="font-medium">Timestamp:</span> {format(new Date(log.created_at), "PPpp")}</p>
                {log.changed_fields && log.changed_fields.length > 0 && (
                  <p><span className="font-medium">Changed Fields:</span> {log.changed_fields.join(", ")}</p>
                )}
              </div>
            </div>
            {log.action !== "INSERT" && log.old_data && (
              <div>
                <h4 className="font-medium mb-2">Previous Data</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">{JSON.stringify(log.old_data, null, 2)}</pre>
              </div>
            )}
            {log.action !== "DELETE" && log.new_data && (
              <div>
                <h4 className="font-medium mb-2">New Data</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">{JSON.stringify(log.new_data, null, 2)}</pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function getRecordName(log: AuditLog): string {
  const data = log.new_data || log.old_data;
  if (!data) return log.record_id.substring(0, 8);
  if (typeof data.name === "string") return data.name;
  if (typeof data.sku === "string") return data.sku;
  if (typeof data.full_name === "string") return data.full_name;
  return log.record_id.substring(0, 8);
}

export default function AuditLogs() {
  const { t } = useLanguage();
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const TABLE_OPTIONS = [
    { value: "all", label: t('audit.allTables') },
    { value: "products", label: t('common.products') },
    { value: "categories", label: t('common.categories') },
    { value: "suppliers", label: t('common.suppliers') },
    { value: "locations", label: t('common.locations') },
    { value: "stock_levels", label: t('common.stockLevels') },
    { value: "movements", label: t('movements.title') },
    { value: "internal_transfers", label: t('common.internalTransfers') },
  ];

  const { data: logs, isLoading } = useAuditLogs({
    tableName: tableFilter === "all" ? undefined : tableFilter,
    action: actionFilter === "all" ? undefined : (actionFilter as "INSERT" | "UPDATE" | "DELETE"),
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('audit.title')}</h1>
        <p className="text-muted-foreground">{t('audit.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('audit.activityLog')}
          </CardTitle>
          <CardDescription>{t('audit.activityLogDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('audit.filterByTable')} /></SelectTrigger>
              <SelectContent>
                {TABLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('audit.filterByAction')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audit.allActions')}</SelectItem>
                <SelectItem value="INSERT">{t('audit.created')}</SelectItem>
                <SelectItem value="UPDATE">{t('audit.updated')}</SelectItem>
                <SelectItem value="DELETE">{t('audit.deleted')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('audit.loading')}</div>
          ) : logs && logs.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('audit.timestamp')}</TableHead>
                    <TableHead>{t('audit.table')}</TableHead>
                    <TableHead>{t('audit.record')}</TableHead>
                    <TableHead>{t('audit.action')}</TableHead>
                    <TableHead>{t('audit.changedFields')}</TableHead>
                    <TableHead className="text-right">{t('audit.details')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const actionBadge = ACTION_BADGES[log.action];
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(log.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{log.table_name.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="font-medium">{getRecordName(log)}</TableCell>
                        <TableCell><Badge variant={actionBadge.variant} className="gap-1">{actionBadge.icon}{log.action}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{log.changed_fields?.join(", ") || "-"}</TableCell>
                        <TableCell className="text-right"><DataViewDialog log={log} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('audit.noLogs')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
