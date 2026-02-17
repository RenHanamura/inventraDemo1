import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, Printer } from 'lucide-react';
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

interface LabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const escapeHtml = (text: string): string => {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

export function LabelModal({ isOpen, onClose, product }: LabelModalProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const { organization } = useOrganization();

  if (!product) return null;

  const brandColor = organization?.primary_color || '#0d9488';
  const logoUrl = organization?.logo_url || null;
  const scanUrl = `${window.location.origin}/scan?sku=${encodeURIComponent(product.sku)}`;

  const handleDownload = async () => {
    if (!labelRef.current) return;
    const canvas = await html2canvas(labelRef.current, { backgroundColor: '#ffffff', scale: 4 });
    const link = document.createElement('a');
    const safeSku = product.sku.replace(/[^a-zA-Z0-9-_]/g, '_');
    link.download = `label-${safeSku}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = async () => {
    if (!labelRef.current) return;
    const canvas = await html2canvas(labelRef.current, { backgroundColor: '#ffffff', scale: 4 });
    const imgData = canvas.toDataURL('image/png');
    const safeSku = escapeHtml(product.sku);
    const printHtml = `<!DOCTYPE html><html><head><title>Label - ${safeSku}</title><style>@page{size:4in 2in;margin:0}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;height:auto}</style></head><body><img src="${imgData}" alt="Label"/><script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}};<\/script></body></html>`;
    const blob = new Blob([printHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const pw = window.open(url, '_blank');
    if (pw) pw.addEventListener('load', () => URL.revokeObjectURL(url));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" aria-describedby="label-modal-description">
        <DialogHeader>
          <DialogTitle>Product Label</DialogTitle>
          <DialogDescription id="label-modal-description" className="sr-only">
            Preview and download or print product label
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Label Preview */}
          <div className="flex justify-center p-4 bg-muted rounded-lg">
            <div
              ref={labelRef}
              style={{ width: '384px', padding: '20px', fontFamily: 'Manrope, system-ui, sans-serif', background: '#fff', border: '1px solid #e4e4e7' }}
            >
              {/* Header row: logo + org name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: `2px solid ${brandColor}`, paddingBottom: '10px' }}>
                {logoUrl && (
                  <img src={logoUrl} alt="Logo" style={{ height: '22px', objectFit: 'contain' }} crossOrigin="anonymous" />
                )}
                {!logoUrl && organization?.name && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: brandColor, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{organization.name}</span>
                )}
              </div>

              {/* Main content: QR + Info */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* QR Code */}
                <div style={{ flexShrink: 0 }}>
                  <QRCodeSVG
                    value={scanUrl}
                    size={96}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Product info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: brandColor, margin: '0 0 4px 0', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {product.name}
                  </p>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: brandColor, margin: '0 0 8px 0', opacity: 0.7, fontFamily: 'monospace' }}>
                    SKU: {product.sku}
                  </p>
                  {product.micro_location && (
                    <p style={{ fontSize: '10px', color: '#71717a', margin: '0 0 4px 0' }}>
                      📍 {product.micro_location}
                    </p>
                  )}
                  {product.serial_number && (
                    <p style={{ fontSize: '10px', color: '#71717a', margin: 0 }}>
                      S/N: {product.serial_number}
                    </p>
                  )}
                </div>
              </div>

              {/* Watermark */}
              <div style={{ marginTop: '10px', borderTop: '1px solid #f4f4f5', paddingTop: '6px', textAlign: 'center' as const }}>
                <span style={{ fontSize: '7px', color: '#d4d4d8', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Generated by Inventra</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" /> Download PNG
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}