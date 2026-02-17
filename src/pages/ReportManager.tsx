import { useState } from 'react';
import { FileText, Settings2, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useImportHistory } from '@/hooks/useImportHistory';
import { useOrganization } from '@/hooks/useOrganization';
import { useLanguage } from '@/contexts/LanguageContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es, enUS, de } from 'date-fns/locale';

const COLUMN_IDS = [
  'name', 'sku', 'serial_number', 'category', 'quantity',
  'unit_price', 'cost_price', 'reorder_point', 'status_category', 'custodian', 'micro_location',
];

const DEFAULT_ENABLED = ['name', 'sku', 'category', 'quantity', 'unit_price', 'status_category'];

export default function ReportManager() {
  const { t, language } = useLanguage();
  const [enabledCols, setEnabledCols] = useState<Set<string>>(new Set(DEFAULT_ENABLED));
  const [reportTitle, setReportTitle] = useState(t('reports.defaultTitle'));
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const { imports, isLoading: importsLoading } = useImportHistory();
  const { organization } = useOrganization();

  const dateLocale = language === 'de' ? de : language === 'en' ? enUS : es;

  const toggleColumn = (id: string) => {
    setEnabledCols(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const enabledColumns = COLUMN_IDS.filter(id => enabledCols.has(id));

  const getColLabel = (id: string) => t(`col.${id}`);
  const getColPdfLabel = (id: string) => t(`col.${id}.pdf`) !== `col.${id}.pdf` ? t(`col.${id}.pdf`) : t(`col.${id}`);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    return categories.find((c) => c.id === categoryId)?.name || '-';
  };

  const getProductCellValue = (product: typeof products[0], colId: string): string => {
    switch (colId) {
      case 'name': return product.name;
      case 'sku': return product.sku;
      case 'serial_number': return product.serial_number || '-';
      case 'category': return getCategoryName(product.category_id);
      case 'quantity': return product.quantity.toString();
      case 'unit_price': return `$${product.unit_price.toFixed(2)}`;
      case 'cost_price': return `$${product.cost_price.toFixed(2)}`;
      case 'reorder_point': return product.reorder_point.toString();
      case 'status_category': return product.status_category;
      case 'custodian': return product.custodian || '-';
      case 'micro_location': return product.micro_location || '-';
      default: return '-';
    }
  };

  const generatePDF = async () => {
    if (enabledColumns.length === 0) { toast.error(t('reports.selectAtLeastOne')); return; }
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let startY = 15;

      if (organization?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); img.src = organization.logo_url!; });
          const logoHeight = 18;
          const logoWidth = (img.width / img.height) * logoHeight;
          doc.addImage(img, 'PNG', 14, startY, Math.min(logoWidth, 40), logoHeight);
          startY += logoHeight + 4;
        } catch { /* continue without logo */ }
      }

      const orgName = organization?.name || 'Inventra';
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(orgName, 14, startY + 4); startY += 10;
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text(reportTitle, 14, startY + 4); startY += 8;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(`${t('reports.exportDate')}: ${format(new Date(), "PPpp", { locale: dateLocale })}`, 14, startY + 4);
      doc.setTextColor(0, 0, 0); startY += 8;
      doc.setDrawColor(200, 200, 200); doc.line(14, startY, pageWidth - 14, startY); startY += 4;

      const headers = enabledColumns.map(id => getColPdfLabel(id));
      const rows = products.map((product) => enabledColumns.map((col) => getProductCellValue(product, col)));

      const brandColor = organization?.primary_color || '#0d9488';
      const r = parseInt(brandColor.slice(1, 3), 16);
      const g = parseInt(brandColor.slice(3, 5), 16);
      const b = parseInt(brandColor.slice(5, 7), 16);

      autoTable(doc, { head: [headers], body: rows, startY, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [r, g, b], textColor: 255 } });

      if (additionalNotes.trim()) {
        const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || startY;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(`${t('reports.notes')}:`, 14, finalY + 10);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const splitNotes = doc.splitTextToSize(additionalNotes, pageWidth - 28);
        doc.text(splitNotes, 14, finalY + 16);
      }

      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(130, 130, 130);
        doc.text(`${t('reports.page')} ${i} ${t('reports.of')} ${totalPages} | ${t('reports.totalProducts')}: ${products.length}`, pageWidth / 2, pageHeight - 14, { align: 'center' });
        doc.text(`${t('reports.generatedBy')} — ${orgName}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }

      doc.save(`${reportTitle.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success(t('reports.pdfSuccess'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('reports.pdfError'));
    } finally { setIsGenerating(false); }
  };

  const generateCSV = () => {
    if (enabledColumns.length === 0) { toast.error(t('reports.selectAtLeastOne')); return; }
    const headers = enabledColumns.map(id => getColPdfLabel(id));
    const rows = products.map((product) => enabledColumns.map((col) => { const val = getProductCellValue(product, col); return col === 'name' ? `"${val}"` : val; }));
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${reportTitle.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(t('reports.csvSuccess'));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
        <p className="text-muted-foreground">{t('reports.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />{t('reports.config')}</CardTitle>
            <CardDescription>{t('reports.configDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="report-title">{t('reports.reportTitle')}</Label>
              <Input id="report-title" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder={t('reports.reportTitlePlaceholder')} />
            </div>
            <div className="space-y-3">
              <Label>{t('reports.columnsToInclude')}</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {COLUMN_IDS.map((id) => (
                  <div key={id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <span className="text-sm font-medium">{getColLabel(id)}</span>
                    <Switch checked={enabledCols.has(id)} onCheckedChange={() => toggleColumn(id)} />
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="notes">{t('reports.additionalNotes')}</Label>
              <Textarea id="notes" value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder={t('reports.notesPlaceholder')} rows={4} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={generatePDF} disabled={isGenerating || productsLoading}>
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {t('reports.generatePDF')}
              </Button>
              <Button variant="outline" onClick={generateCSV} disabled={productsLoading}>
                <FileText className="h-4 w-4 mr-2" />{t('reports.exportCSV')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />{t('reports.importHistory')}</CardTitle>
            <CardDescription>{t('reports.importHistoryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {importsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : imports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('reports.noImports')}</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {imports.slice(0, 10).map((imp) => (
                    <div key={imp.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[150px]">{imp.file_name}</span>
                        <Badge variant={imp.status === 'completed' ? 'default' : imp.status === 'failed' ? 'destructive' : 'secondary'}>
                          {imp.status === 'completed' ? t('reports.completed') : imp.status === 'failed' ? t('reports.failed') : t('reports.pending')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{imp.successful_rows} {t('reports.imported')}</span>
                        {imp.failed_rows > 0 && <span className="text-destructive">{imp.failed_rows} {t('reports.failedRows')}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(imp.created_at), 'PPp', { locale: dateLocale })}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.preview')}</CardTitle>
          <CardDescription>{t('reports.previewDesc', { count: products.length, cols: enabledColumns.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {enabledColumns.map((col) => <th key={col} className="text-left py-2 px-3 font-medium">{getColPdfLabel(col)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 5).map((product) => (
                    <tr key={product.id} className="border-b">
                      {enabledColumns.map((col) => <td key={col} className="py-2 px-3">{getProductCellValue(product, col)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length > 5 && <p className="text-sm text-muted-foreground text-center py-4">{t('reports.andMore', { count: products.length - 5 })}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
