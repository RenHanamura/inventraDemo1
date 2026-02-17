import { useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Product } from '@/hooks/useProducts';
import { useOrganization } from '@/hooks/useOrganization';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExportColumn {
  key: string;
  label: string;
  pdfLabel: string;
  default: boolean;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'name', label: 'Nombre del Producto', pdfLabel: 'Nombre', default: true },
  { key: 'sku', label: 'SKU', pdfLabel: 'SKU', default: true },
  { key: 'category', label: 'Categoría', pdfLabel: 'Categoría', default: true },
  { key: 'quantity', label: 'Cantidad', pdfLabel: 'Cantidad', default: true },
  { key: 'price', label: 'Precio', pdfLabel: 'Precio', default: true },
  { key: 'location', label: 'Bodega/Ubicación', pdfLabel: 'Ubicación', default: true },
  { key: 'serial_number', label: 'Número de Serie', pdfLabel: 'N° Serie', default: false },
  { key: 'micro_location', label: 'Micro-Ubicación', pdfLabel: 'Micro Ubic.', default: false },
  { key: 'status', label: 'Estado', pdfLabel: 'Estado', default: false },
  { key: 'custodian', label: 'Custodio', pdfLabel: 'Custodio', default: false },
  { key: 'maintenance_date', label: 'Fecha de Mantenimiento', pdfLabel: 'Mant.', default: false },
];

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  under_maintenance: 'En Mantenimiento',
  repairing: 'Reparando',
  refunded: 'Devuelto',
  assigned: 'Asignado/Custodia',
};

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  productStockMap: Map<string, { quantity: number; locationName?: string }>;
  isGlobalView: boolean;
  locationName: string;
}

export function ExportModal({
  isOpen,
  onClose,
  products,
  productStockMap,
  isGlobalView,
  locationName,
}: ExportModalProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.filter(c => c.default).map(c => c.key))
  );
  const { organization } = useOrganization();

  const toggleColumn = (key: string) => {
    const newSet = new Set(selectedColumns);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedColumns(newSet);
  };

  const selectAll = () => {
    setSelectedColumns(new Set(EXPORT_COLUMNS.map(c => c.key)));
  };

  const selectDefault = () => {
    setSelectedColumns(new Set(EXPORT_COLUMNS.filter(c => c.default).map(c => c.key)));
  };

  const getColumnValue = (product: Product, columnKey: string): string => {
    const stockInfo = productStockMap.get(product.id);
    const quantity = stockInfo?.quantity ?? product.quantity;

    switch (columnKey) {
      case 'name':
        return product.name;
      case 'sku':
        return product.sku;
      case 'category':
        return product.category?.name || '-';
      case 'quantity':
        return quantity.toLocaleString('es-MX');
      case 'price':
        return `$${Number(product.unit_price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'location':
        return isGlobalView ? 'Todas las ubicaciones' : stockInfo?.locationName || '-';
      case 'serial_number':
        return product.serial_number || '-';
      case 'micro_location':
        return product.micro_location || '-';
      case 'status':
        return STATUS_LABELS[product.status_category] || 'Disponible';
      case 'custodian':
        return product.custodian || '-';
      case 'maintenance_date':
        return product.maintenance_alert_date
          ? new Date(product.maintenance_alert_date).toLocaleDateString('es-MX')
          : '-';
      default:
        return '-';
    }
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let startY = 15;

    const orgName = organization?.name || 'Inventra';
    const brandColor = organization?.primary_color || '#0d9488';
    const r = parseInt(brandColor.slice(1, 3), 16);
    const g = parseInt(brandColor.slice(3, 5), 16);
    const b = parseInt(brandColor.slice(5, 7), 16);

    // --- Organization Logo ---
    if (organization?.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = organization.logo_url!;
        });
        const logoHeight = 18;
        const logoWidth = (img.width / img.height) * logoHeight;
        doc.addImage(img, 'PNG', 14, startY, Math.min(logoWidth, 40), logoHeight);
        startY += logoHeight + 4;
      } catch {
        // Logo couldn't load, continue without it
      }
    }

    // --- Organization Name ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b);
    doc.text(orgName, 14, startY + 4);
    startY += 10;

    // --- Report Title ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Reporte de Inventario — ${locationName === 'All Locations' ? 'Todas las ubicaciones' : locationName}`, 14, startY + 4);
    startY += 8;

    // --- Date ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Fecha de exportación: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`,
      14,
      startY + 4
    );
    doc.setTextColor(0, 0, 0);
    startY += 8;

    // --- Summary ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const totalValue = products.reduce((sum, p) => {
      const qty = productStockMap.get(p.id)?.quantity ?? p.quantity;
      return sum + qty * Number(p.unit_price);
    }, 0);
    doc.text(
      `Total de productos: ${products.length}  •  Valor total del stock: $${totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      14,
      startY + 4
    );
    doc.setTextColor(0, 0, 0);
    startY += 8;

    // --- Separator ---
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.line(14, startY, pageWidth - 14, startY);
    startY += 4;

    // --- Table ---
    const orderedColumns = EXPORT_COLUMNS.filter(c => selectedColumns.has(c.key));
    const headers = orderedColumns.map(c => c.pdfLabel);
    const tableData = products.map(product =>
      orderedColumns.map(col => getColumnValue(product, col.key))
    );

    autoTable(doc, {
      startY,
      head: [headers],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [r, g, b],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: orderedColumns.reduce((acc, col, idx) => {
        if (['quantity', 'price'].includes(col.key)) {
          acc[idx] = { halign: 'right' };
        }
        return acc;
      }, {} as Record<number, { halign: 'right' }>),
    });

    // --- Footer on all pages ---
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 14,
        { align: 'center' }
      );
      doc.text(
        `Generado por Inventra para ${orgName}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`Inventario_${orgName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    onClose();
  };

  const handleExportCSV = () => {
    const orderedColumns = EXPORT_COLUMNS.filter(c => selectedColumns.has(c.key));
    const headers = orderedColumns.map(c => c.pdfLabel);

    const csvData = products.map(product =>
      orderedColumns.map(col => {
        const value = getColumnValue(product, col.key);
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
    );

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventario_${(organization?.name || 'Inventra').replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Exportar Reporte
          </DialogTitle>
          <DialogDescription>
            Selecciona las columnas a incluir en tu exportación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} className="rounded-lg">
              Seleccionar Todo
            </Button>
            <Button variant="outline" size="sm" onClick={selectDefault} className="rounded-lg">
              Restablecer
            </Button>
          </div>

          {/* Column Selection */}
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
            {EXPORT_COLUMNS.map((column) => (
              <div
                key={column.key}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={column.key}
                  checked={selectedColumns.has(column.key)}
                  onCheckedChange={() => toggleColumn(column.key)}
                />
                <Label
                  htmlFor={column.key}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>

          {/* Selected Count */}
          <p className="text-xs text-muted-foreground text-center">
            {selectedColumns.size} de {EXPORT_COLUMNS.length} columnas seleccionadas
          </p>

          {/* Export Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl gap-2"
              onClick={handleExportCSV}
              disabled={selectedColumns.size === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl gap-2"
              onClick={handleExportPDF}
              disabled={selectedColumns.size === 0}
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
