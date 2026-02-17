import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Product } from '@/hooks/useProducts';
import { useOrganization } from '@/hooks/useOrganization';

interface BulkLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export function BulkLabelsModal({ isOpen, onClose, products }: BulkLabelsModalProps) {
  const labelsRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { organization } = useOrganization();

  const brandColor = organization?.primary_color || '#0d9488';
  const logoUrl = organization?.logo_url || null;

  const handleExportPDF = async () => {
    if (!labelsRef.current || products.length === 0) return;
    setIsGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const labelElements = labelsRef.current.querySelectorAll('.label-item');
      const labelsPerRow = 2;
      const labelsPerPage = 8;
      const labelWidth = 90;
      const labelHeight = 45;
      const marginX = 15;
      const marginY = 15;
      const gapX = 5;
      const gapY = 5;
      let currentLabel = 0;

      for (const labelEl of Array.from(labelElements)) {
        if (currentLabel > 0 && currentLabel % labelsPerPage === 0) pdf.addPage();
        const pageIndex = currentLabel % labelsPerPage;
        const row = Math.floor(pageIndex / labelsPerRow);
        const col = pageIndex % labelsPerRow;
        const x = marginX + col * (labelWidth + gapX);
        const y = marginY + row * (labelHeight + gapY);
        const canvas = await html2canvas(labelEl as HTMLElement, { backgroundColor: '#ffffff', scale: 4 });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', x, y, labelWidth, labelHeight);
        currentLabel++;
      }
      pdf.save('product-labels.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Export Labels</DialogTitle>
          <DialogDescription>
            {products.length} product{products.length !== 1 ? 's' : ''} selected for label export
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div ref={labelsRef} className="grid grid-cols-2 gap-3 p-4 bg-muted rounded-lg">
            {products.map((product) => {
              const scanUrl = `${window.location.origin}/scan?sku=${encodeURIComponent(product.sku)}`;
              return (
                <div
                  key={product.id}
                  className="label-item"
                  style={{ padding: '12px', fontFamily: 'Manrope, system-ui, sans-serif', background: '#fff', border: '1px solid #e4e4e7', borderRadius: '6px' }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: `2px solid ${brandColor}`, paddingBottom: '6px' }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" style={{ height: '14px', objectFit: 'contain' }} crossOrigin="anonymous" />
                    ) : organization?.name ? (
                      <span style={{ fontSize: '8px', fontWeight: 700, color: brandColor, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{organization.name}</span>
                    ) : null}
                  </div>

                  {/* Content */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <QRCodeSVG value={scanUrl} size={52} level="H" includeMargin={false} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: brandColor, margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {product.name}
                      </p>
                      <p style={{ fontSize: '8px', fontWeight: 600, color: brandColor, opacity: 0.7, margin: '0 0 4px 0', fontFamily: 'monospace' }}>
                        SKU: {product.sku}
                      </p>
                      {product.micro_location && (
                        <p style={{ fontSize: '7px', color: '#71717a', margin: 0 }}>📍 {product.micro_location}</p>
                      )}
                    </div>
                  </div>

                  {/* Watermark */}
                  <div style={{ marginTop: '6px', borderTop: '1px solid #f4f4f5', paddingTop: '4px', textAlign: 'center' as const }}>
                    <span style={{ fontSize: '6px', color: '#d4d4d8', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Generated by Inventra</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExportPDF} disabled={isGenerating || products.length === 0} className="gap-2">
            {isGenerating ? (<><Loader2 className="h-4 w-4 animate-spin" />Generating...</>) : (<><FileText className="h-4 w-4" />Export as PDF</>)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}