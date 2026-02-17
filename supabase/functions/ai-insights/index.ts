import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, language: lang } = await req.json();
    const responseLang = lang === 'en' ? 'English' : lang === 'de' ? 'German' : 'Spanish';
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    let dataContext = '';

    if (type === 'inventory') {
      const { data: products } = await supabase
        .from('products')
        .select('name, sku, quantity, reorder_point, unit_price, cost_price, status_category, custodian, created_at, updated_at')
        .limit(100);

      const items = products || [];
      const lowStock = items.filter(p => p.quantity <= p.reorder_point);
      const outOfStock = items.filter(p => p.quantity === 0);
      const totalValue = items.reduce((s, p) => s + p.quantity * p.unit_price, 0);
      const totalCost = items.reduce((s, p) => s + p.quantity * p.cost_price, 0);

      dataContext = `DATOS DE INVENTARIO:
- Total productos: ${items.length}
- Valor total (precio venta): $${totalValue.toLocaleString()}
- Costo total: $${totalCost.toLocaleString()}
- Margen estimado: $${(totalValue - totalCost).toLocaleString()}
- Sin stock: ${outOfStock.length} productos (${outOfStock.map(p => p.name).join(', ') || 'ninguno'})
- Stock bajo: ${lowStock.length} productos (${lowStock.map(p => `${p.name}: ${p.quantity}/${p.reorder_point}`).join(', ') || 'ninguno'})
- Productos detallados: ${JSON.stringify(items.slice(0, 30).map(p => ({ nombre: p.name, sku: p.sku, qty: p.quantity, reorden: p.reorder_point, precio: p.unit_price, estado: p.status_category })))}`;
    } else if (type === 'movements') {
      const { data: movements } = await supabase
        .from('movements')
        .select('type, quantity, created_at, notes, product:products(name, sku), location:locations(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      const items = movements || [];
      const incoming = items.filter(m => m.type === 'incoming');
      const outgoing = items.filter(m => m.type === 'outgoing');
      const inTotal = incoming.reduce((s, m) => s + m.quantity, 0);
      const outTotal = outgoing.reduce((s, m) => s + m.quantity, 0);

      dataContext = `DATOS DE MOVIMIENTOS (últimos 50):
- Entradas: ${incoming.length} movimientos, ${inTotal} unidades total
- Salidas: ${outgoing.length} movimientos, ${outTotal} unidades total
- Balance neto: ${inTotal - outTotal} unidades
- Movimientos detallados: ${JSON.stringify(items.slice(0, 20).map(m => ({ tipo: m.type, qty: m.quantity, fecha: m.created_at, producto: (m.product as any)?.name, ubicacion: (m.location as any)?.name })))}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Eres un analista de inventario profesional para Inventra. Analiza los datos proporcionados y genera EXACTAMENTE 3 insights accionables en ${responseLang}. 

Formato de cada insight:
- Usa un emoji relevante al inicio (⚠️ para alertas, 📈 para tendencias, 💡 para recomendaciones, ✅ para positivos)
- Sé específico con nombres de productos, cantidades y porcentajes
- Cada insight debe ser una oración completa y accionable
- NO uses markdown, solo texto plano con emojis

RESTRICCIONES:
- Basa tus análisis SOLO en los datos proporcionados
- NO inventes datos
- Si no hay suficientes datos, indica que se necesitan más registros`
          },
          { role: "user", content: `Analiza estos datos y genera 3 insights:\n\n${dataContext}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + response.status);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "No se pudieron generar insights.";

    // Parse into bullet points
    const insights = content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 10);

    return new Response(JSON.stringify({ insights: insights.slice(0, 3) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
