import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditLogs, formatAuditChange } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { Loader2, Plus, Pencil, Trash2, ArrowRightLeft, Package } from "lucide-react";

const ACTION_ICONS = {
  INSERT: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

export function RecentActivityTable() {
  const { data: logs, isLoading } = useAuditLogs({ limit: 8 });

  // Filter to show only the most relevant tables
  const relevantTables = ["products", "movements", "internal_transfers", "stock_levels", "suppliers"];
  const filteredLogs = logs?.filter((log) => relevantTables.includes(log.table_name)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Changes will appear here as you modify inventory</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Table</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.slice(0, 6).map((log) => {
                const ActionIcon = ACTION_ICONS[log.action] || Pencil;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{formatAuditChange(log)}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANTS[log.action] || "secondary"} className="gap-1">
                        <ActionIcon className="h-3 w-3" />
                        {log.action === "INSERT" ? "Created" : log.action === "UPDATE" ? "Updated" : "Deleted"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground capitalize">
                      {log.table_name.replace("_", " ")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
