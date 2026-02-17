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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Use service role to insert notifications for all relevant users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Also create a user-scoped client if auth header is present (manual trigger)
    const authHeader = req.headers.get('Authorization');
    let targetUserIds: string[] = [];

    if (authHeader) {
      // Manual trigger: only generate for the calling user
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (claims?.claims?.sub) {
        targetUserIds = [claims.claims.sub as string];
      }
    } else {
      // Cron trigger: generate for all org admins
      const { data: admins } = await supabaseAdmin
        .from('organization_members')
        .select('user_id')
        .in('role', ['admin', 'owner']);
      targetUserIds = (admins || []).map(a => a.user_id);
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ message: "No target users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch global data for analysis
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, quantity, reorder_point, unit_price, status_category, updated_at')
      .limit(200);

    const { data: recentMovements } = await supabaseAdmin
      .from('movements')
      .select('type, quantity, created_at, product_id')
      .order('created_at', { ascending: false })
      .limit(100);

    const items = products || [];
    const movements = recentMovements || [];

    // Identify low-stock products
    const lowStock = items.filter(p => p.quantity <= p.reorder_point && p.quantity > 0);
    const outOfStock = items.filter(p => p.quantity === 0);

    // Identify stale products (no movements in 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentProductIds = new Set(
      movements
        .filter(m => new Date(m.created_at) > thirtyDaysAgo)
        .map(m => m.product_id)
    );
    const staleProducts = items.filter(p => !recentProductIds.has(p.id) && p.quantity > 0);

    // Calculate velocity for low-stock items
    const velocityData = lowStock.map(p => {
      const productMovements = movements.filter(m => m.product_id === p.id && m.type === 'outgoing');
      const weeklyOutgoing = productMovements
        .filter(m => new Date(m.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .reduce((s, m) => s + m.quantity, 0);
      const daysUntilOut = weeklyOutgoing > 0 ? Math.round((p.quantity / weeklyOutgoing) * 7) : null;
      return { ...p, weeklyOutgoing, daysUntilOut };
    });

    // Build AI prompt
    const analysisData = {
      lowStock: velocityData.map(p => ({
        nombre: p.name,
        sku: p.sku,
        cantidad: p.quantity,
        reorden: p.reorder_point,
        salidaSemanal: p.weeklyOutgoing,
        diasHastaAgotar: p.daysUntilOut,
      })),
      sinStock: outOfStock.map(p => ({ nombre: p.name, sku: p.sku })),
      sinMovimiento30Dias: staleProducts.slice(0, 10).map(p => ({
        nombre: p.name,
        sku: p.sku,
        cantidad: p.quantity,
        valorTotal: p.quantity * p.unit_price,
      })),
    };

    // Only call AI if there's data to analyze
    if (lowStock.length === 0 && outOfStock.length === 0 && staleProducts.length === 0) {
      return new Response(JSON.stringify({ message: "No issues found", suggestions: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        tools: [{
          type: "function",
          function: {
            name: "generate_suggestions",
            description: "Generate actionable inventory suggestions in Spanish",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Short title with emoji, max 60 chars" },
                      message: { type: "string", description: "Detailed actionable message, max 200 chars" },
                      urgency: { type: "string", enum: ["high", "medium", "low"] },
                      product_sku: { type: "string", description: "SKU of the related product if applicable, or empty string" },
                    },
                    required: ["title", "message", "urgency", "product_sku"],
                  },
                },
              },
              required: ["suggestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_suggestions" } },
        messages: [
          {
            role: "system",
            content: `Eres un analista de inventario profesional para Inventra. Genera sugerencias inteligentes y accionables en español basándote ÚNICAMENTE en los datos proporcionados. Cada sugerencia debe ser específica con nombres de productos, cantidades y recomendaciones concretas. Usa emojis relevantes en los títulos (✨, ⚠️, 📦, 🔄, 💡). Genera entre 1 y 5 sugerencias, priorizando por urgencia.`
          },
          {
            role: "user",
            content: `Analiza estos datos de inventario y genera sugerencias inteligentes:\n\n${JSON.stringify(analysisData, null, 2)}`
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let suggestions: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        suggestions = parsed.suggestions || [];
      } catch {
        console.error("Failed to parse AI suggestions");
      }
    }

    if (suggestions.length === 0) {
      return new Response(JSON.stringify({ message: "No suggestions generated", suggestions: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find product IDs by SKU for linking
    const skuToId = new Map(items.map(p => [p.sku, p.id]));

    // Insert notifications for each target user
    let totalInserted = 0;
    for (const userId of targetUserIds) {
      // Check for existing unread AI suggestions to avoid spam
      const { data: existing } = await supabaseAdmin
        .from('notifications')
        .select('title')
        .eq('user_id', userId)
        .eq('type', 'ai_suggestion')
        .eq('is_read', false);

      const existingTitles = new Set((existing || []).map(n => n.title));

      const newNotifs = suggestions
        .filter(s => !existingTitles.has(s.title))
        .map(s => ({
          user_id: userId,
          type: 'ai_suggestion',
          title: s.title,
          message: s.message,
          product_id: skuToId.get(s.product_sku) || null,
        }));

      if (newNotifs.length > 0) {
        const { error } = await supabaseAdmin.from('notifications').insert(newNotifs);
        if (error) console.error("Insert error:", error);
        else totalInserted += newNotifs.length;
      }
    }

    return new Response(JSON.stringify({ 
      message: `Generated ${totalInserted} AI suggestions for ${targetUserIds.length} user(s)`,
      suggestions: totalInserted,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-suggestions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
