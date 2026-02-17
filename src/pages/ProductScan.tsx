import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Package, MapPin, Tag, ShieldCheck, AlertTriangle, XCircle, LogIn, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ScanProduct {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  quantity: number;
  reorder_point: number;
  image_url: string | null;
  micro_location: string | null;
  status_category: string;
  category?: { id: string; name: string } | null;
}

interface ScanOrg {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

function getStockBadge(quantity: number, reorderPoint: number) {
  if (quantity === 0) return { label: 'Out of Stock', icon: XCircle, variant: 'destructive' as const };
  if (quantity <= reorderPoint) return { label: 'Low Stock', icon: AlertTriangle, variant: 'secondary' as const };
  return { label: 'In Stock', icon: ShieldCheck, variant: 'default' as const };
}

export default function ProductScan() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sku = params.get('sku');
  const [product, setProduct] = useState<ScanProduct | null>(null);
  const [org, setOrg] = useState<ScanOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      if (!sku) { setNotFound(true); setLoading(false); return; }

      // Fetch product (public read via anon key – RLS allows authenticated; 
      // for truly public access we use the edge function approach below)
      const { data: prod, error } = await supabase
        .from('products')
        .select('id, name, sku, description, quantity, reorder_point, image_url, micro_location, status_category, category:categories(id, name)')
        .eq('sku', sku)
        .maybeSingle();

      if (error || !prod) { setNotFound(true); setLoading(false); return; }
      setProduct(prod as ScanProduct);

      // Fetch first org for branding
      const { data: orgs } = await supabase.from('organizations').select('name, logo_url, primary_color').limit(1);
      if (orgs && orgs.length > 0) setOrg(orgs[0]);

      setLoading(false);
    }
    load();
  }, [sku]);

  const brandColor = org?.primary_color || '#0d9488';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 font-[Manrope]">
        <Skeleton className="w-full max-w-md h-96 rounded-2xl" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 font-[Manrope] text-center">
        <Package className="h-16 w-16 text-zinc-300 mb-4" />
        <h1 className="text-xl font-bold text-zinc-800">Product Not Found</h1>
        <p className="text-zinc-500 mt-2 text-sm">The scanned code doesn't match any product in the system.</p>
        <Button className="mt-6" onClick={() => navigate('/auth')}>
          <LogIn className="h-4 w-4 mr-2" /> Login to Inventra
        </Button>
      </div>
    );
  }

  const stock = getStockBadge(product.quantity, product.reorder_point);
  const StockIcon = stock.icon;

  return (
    <div className="min-h-screen bg-zinc-100 font-[Manrope]">
      {/* Hero banner */}
      <div
        className="relative w-full px-6 pt-10 pb-14 flex flex-col items-center"
        style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)` }}
      >
        {org?.logo_url ? (
          <img src={org.logo_url} alt={org.name} className="h-10 object-contain mb-3 drop-shadow-lg" />
        ) : (
          <h2 className="text-white/90 font-bold text-lg tracking-wide mb-3">{org?.name || 'Inventra'}</h2>
        )}
        <p className="text-white/70 text-xs tracking-widest uppercase">Product Information</p>
      </div>

      {/* Card */}
      <div className="max-w-md mx-auto -mt-8 px-4 pb-10">
        <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
          {/* Product image */}
          {product.image_url && (
            <div className="w-full h-52 bg-zinc-50 flex items-center justify-center border-b border-zinc-100">
              <img src={product.image_url} alt={product.name} className="max-h-full max-w-full object-contain p-4" />
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Name + Stock badge */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-zinc-900 leading-tight">{product.name}</h1>
                <p className="text-xs text-zinc-400 font-mono mt-1">SKU: {product.sku}</p>
              </div>
              <Badge
                variant={stock.variant}
                className="flex items-center gap-1.5 shrink-0 px-3 py-1 text-xs font-semibold"
                style={stock.variant === 'default' ? { backgroundColor: brandColor, color: '#fff' } : {}}
              >
                <StockIcon className="h-3.5 w-3.5" />
                {stock.label}
              </Badge>
            </div>

            {product.description && (
              <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>
            )}

            {/* Specs table */}
            <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100 text-sm">
              {product.category && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Tag className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="text-zinc-500 w-24 shrink-0">Category</span>
                  <span className="font-medium text-zinc-800">{product.category.name}</span>
                </div>
              )}
              {product.micro_location && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="text-zinc-500 w-24 shrink-0">Location</span>
                  <span className="font-medium text-zinc-800">{product.micro_location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3">
                <Package className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-zinc-500 w-24 shrink-0">Quantity</span>
                <span className="font-bold text-zinc-800 tabular-nums">{product.quantity}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="w-full gap-2 font-semibold"
                style={{ backgroundColor: brandColor }}
                onClick={() => navigate('/auth')}
              >
                <LogIn className="h-4 w-4" />
                Login to Inventra for more details
              </Button>
              <Button variant="outline" className="w-full gap-2 text-zinc-500" onClick={() => window.location.href = `mailto:admin@inventra.app?subject=Inquiry about ${product.sku}`}>
                <Mail className="h-4 w-4" />
                Contact Administrator
              </Button>
            </div>
          </div>

          {/* Watermark */}
          <div className="border-t border-zinc-100 px-6 py-3 text-center">
            <p className="text-[10px] text-zinc-300 tracking-wide">Powered by Inventra</p>
          </div>
        </div>
      </div>
    </div>
  );
}