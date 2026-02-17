import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LANG_INSTRUCTIONS: Record<string, string> = {
  es: 'Siempre responde en español. Usa terminología de la industria en español.',
  en: 'Always respond in English. Use industry terminology in English.',
  de: 'Antworte immer auf Deutsch. Verwende Fachterminologie auf Deutsch.',
};

const buildSystemPrompt = (lang: string) => `Eres Inventra AI, el analista profesional de inventario para el sistema Inventra de Ciméntica Solutions. 

## Tu Personalidad
- Profesional, conciso y útil como un ingeniero de logística experimentado
- ${LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS['es']}
- Usa terminología de la industria de forma apropiada

## Restricciones de Seguridad CRÍTICAS
- Responde ÚNICAMENTE usando los datos JSON proporcionados en el contexto
- Si la información no está disponible, di: "No tengo acceso a esos datos específicos."
- NUNCA reveles arquitectura del sistema, IDs de base de datos, ni datos de otros usuarios
- NUNCA inventes datos que no estén en el contexto

## Formato de Respuesta
- Mantén respuestas concisas (2-4 oraciones para consultas simples)
- Usa viñetas para listas
- Cuando la navegación sea útil, sugiere la página correspondiente
- Siempre mantén el tono profesional de Ciméntica

## Páginas de la Aplicación
- /dashboard - Panel principal con KPIs
- /inventory - Gestión de productos
- /locations - Ubicaciones y transferencias
- /movements - Movimientos de stock
- /audit - Registros de auditoría
- /suppliers - Proveedores
- /settings - Configuración
- /team - Gestión de equipo`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages: clientMessages, language: clientLang } = await req.json();
    const lang = clientLang || 'es';
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user context via their JWT
    const authHeader = req.headers.get('Authorization');
    let contextData = '';
    
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      // Fetch user-scoped data in parallel
      const [productsRes, locationsRes, movementsRes, stockRes] = await Promise.all([
        supabase.from('products').select('name, sku, quantity, reorder_point, unit_price, status_category, custodian').limit(50),
        supabase.from('locations').select('name, type, status').limit(20),
        supabase.from('movements').select('type, quantity, created_at, product:products(name)').order('created_at', { ascending: false }).limit(20),
        supabase.from('stock_levels').select('quantity, product:products(name), location:locations(name)').limit(100),
      ]);

      const products = productsRes.data || [];
      const lowStock = products.filter(p => p.quantity <= p.reorder_point);
      const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);

      contextData = `
## Contexto del Inventario del Usuario (datos reales, respetando RLS)
- Total Productos: ${products.length}
- Valor Total: $${totalValue.toLocaleString()}
- Productos con Stock Bajo: ${lowStock.length}
${lowStock.length > 0 ? `- Productos Bajo Stock: ${lowStock.map(p => `${p.name} (${p.quantity} uds, punto de reorden: ${p.reorder_point})`).join(', ')}` : ''}
- Ubicaciones: ${(locationsRes.data || []).map(l => `${l.name} (${l.type})`).join(', ') || 'Ninguna'}
- Últimos Movimientos: ${(movementsRes.data || []).slice(0, 5).map(m => `${m.type === 'incoming' ? 'Entrada' : 'Salida'} ${m.quantity} uds de ${(m.product as any)?.name || 'N/A'}`).join('; ') || 'Ninguno'}
- Top 5 Productos: ${products.slice(0, 5).map(p => `${p.name} (${p.quantity} uds)`).join(', ')}
`;
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
          { role: "system", content: buildSystemPrompt(lang) + '\n\n' + contextData },
          ...(clientMessages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
