import { Edit2, MoreHorizontal, Trash2, Tag, MapPin, Wrench, UserCheck, AlertTriangle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Product, PRODUCT_STATUS_LABELS, PRODUCT_STATUS_COLORS, ProductStatusCategory } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

// Status categories that are NOT available for sales/transfers
const UNAVAILABLE_STATUSES: ProductStatusCategory[] = ["under_maintenance", "repairing", "refunded"];

interface LocationStock {
  locationId: string;
  locationName: string;
  quantity: number;
}

interface ProductCardProps {
  product: Product;
  quantity: number;
  locationStocks?: LocationStock[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onLabel: (product: Product) => void;
  onAssign?: (product: Product) => void;
}

function getStockStatus(quantity: number, reorderPoint: number, statusCategory: ProductStatusCategory) {
  // If product is not available, always show as unavailable
  if (UNAVAILABLE_STATUSES.includes(statusCategory)) {
    return "unavailable";
  }
  if (quantity === 0) return "out-of-stock";
  if (quantity <= reorderPoint) return "low-stock";
  return "in-stock";
}

function getLocationAbbrev(name: string): string {
  const words = name.split(" ");
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);
  }
  return name.slice(0, 3).toUpperCase();
}

function isMaintenanceDueSoon(date: string | null): boolean {
  if (!date) return false;
  const maintenanceDate = new Date(date);
  const today = new Date();
  const diffDays = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7 && diffDays >= 0;
}

function isMaintenanceOverdue(date: string | null): boolean {
  if (!date) return false;
  const maintenanceDate = new Date(date);
  const today = new Date();
  return maintenanceDate < today;
}

function isUnavailableStatus(status: ProductStatusCategory): boolean {
  return UNAVAILABLE_STATUSES.includes(status);
}

export function ProductCard({
  product,
  quantity,
  locationStocks = [],
  onEdit,
  onDelete,
  onLabel,
  onAssign,
}: ProductCardProps) {
  const statusCategory = (product.status_category || "available") as ProductStatusCategory;
  const status = getStockStatus(quantity, product.reorder_point, statusCategory);
  const hasNoStock = locationStocks.length === 0;
  const showMaintenanceWarning = isMaintenanceDueSoon(product.maintenance_alert_date);
  const showMaintenanceOverdue = isMaintenanceOverdue(product.maintenance_alert_date);
  const isUnavailable = isUnavailableStatus(statusCategory);

  return (
    <div
      className={cn(
        "bg-card rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow",
        isUnavailable
          ? "border-warning/50 bg-warning/5"
          : status === "out-of-stock"
            ? "border-destructive/50"
            : "border-border",
      )}
    >
      {/* Alert Badges Row */}
      {(showMaintenanceWarning || showMaintenanceOverdue || statusCategory !== "available") && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {showMaintenanceOverdue && (
            <Badge variant="destructive" className="text-xs gap-1 animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              Service Overdue
            </Badge>
          )}
          {showMaintenanceWarning && !showMaintenanceOverdue && (
            <Badge className="text-xs gap-1 bg-warning text-warning-foreground">
              <Wrench className="h-3 w-3" />
              Service Due
            </Badge>
          )}
          {statusCategory !== "available" && (
            <Badge className={cn("text-xs gap-1", PRODUCT_STATUS_COLORS[statusCategory as ProductStatusCategory])}>
              {statusCategory === "assigned" && <UserCheck className="h-3 w-3" />}
              {statusCategory === "repairing" && <Wrench className="h-3 w-3" />}
              {PRODUCT_STATUS_LABELS[statusCategory as ProductStatusCategory]}
            </Badge>
          )}
        </div>
      )}

      {/* Header with Image and Actions */}
      <div className="flex gap-4">
        {/* Product Image */}
        <div className="h-20 w-20 flex-shrink-0 rounded-xl bg-muted overflow-hidden">
          <img
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
              <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
              {product.category?.name && <p className="text-xs text-muted-foreground mt-1">{product.category.name}</p>}
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLabel(product)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Print Label
                </DropdownMenuItem>
                {onAssign && (
                  <DropdownMenuItem onClick={() => onAssign(product)}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Assign Location
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(product)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Serial Number & Micro-Location */}
      {(product.serial_number || product.micro_location || product.custodian) && (
        <div className="mt-3 p-2 bg-muted/50 rounded-lg text-xs space-y-1">
          {product.serial_number && (
            <p className="font-mono text-muted-foreground">
              <span className="font-medium text-foreground">S/N:</span> {product.serial_number}
            </p>
          )}
          {product.micro_location && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">📍</span> {product.micro_location}
            </p>
          )}
          {product.custodian && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">👤</span> {product.custodian}
            </p>
          )}
        </div>
      )}

      {/* Location Badges */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {hasNoStock ? (
          <Badge variant="destructive" className="text-xs gap-1">
            ⚠️ No Stock
          </Badge>
        ) : (
          locationStocks.slice(0, 4).map((stock) => (
            <Badge key={stock.locationId} variant="secondary" className="text-xs font-medium tabular-nums">
              {getLocationAbbrev(stock.locationName)}: {stock.quantity}
            </Badge>
          ))
        )}
        {locationStocks.length > 4 && (
          <Badge variant="outline" className="text-xs">
            +{locationStocks.length - 4} more
          </Badge>
        )}
      </div>

      {/* Stock Info Bar */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        {/* Stock Badge - Large and Prominent */}
        <div className="flex items-center gap-2">
          <Badge
            variant={status === "in-stock" ? "default" : status === "unavailable" ? "outline" : "destructive"}
            className={cn(
              "text-base px-4 py-1.5 font-semibold tabular-nums",
              status === "in-stock" && "bg-success hover:bg-success/80",
              status === "unavailable" && "bg-warning/20 text-warning-foreground border-warning",
            )}
          >
            {quantity} total
          </Badge>
          {isUnavailable && (
            <Badge variant="outline" className="text-xs gap-1 text-warning border-warning">
              <Ban className="h-3 w-3" />
              Not for sale
            </Badge>
          )}
        </div>

        {/* Price */}
        <span className="text-lg font-bold text-foreground tabular-nums">${Number(product.unit_price).toFixed(2)}</span>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          className="flex-1 h-12 text-base font-medium rounded-xl"
          onClick={() => onEdit(product)}
        >
          <Edit2 className="h-4 w-4 mr-2" />
          Edit
        </Button>
        {onAssign && (
          <Button
            variant="secondary"
            className="flex-1 h-12 text-base font-medium rounded-xl gap-2"
            onClick={() => onAssign(product)}
          >
            <MapPin className="h-4 w-4" />
            Assign
          </Button>
        )}
      </div>
    </div>
  );
}
