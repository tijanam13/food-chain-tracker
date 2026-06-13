import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fridgeItems } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const itemsList = (fridgeItems || [])
      .map((item: any) => `${item.name} (${item.quantity} ${item.unit}, category: ${item.category}, expires: ${item.expiry_date || 'unknown'})`)
      .join("\n");

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
            content: `You are a smart shopping assistant and nutritionist. Based on the user's current fridge items, suggest products they should buy.

IMPORTANT - Analyze macronutrient balance:
1. First, assess what macronutrients the current fridge items provide (proteins, carbs, fats, fiber, vitamins)
2. Identify macronutrient gaps - e.g., if there's no meat/fish/legumes, protein is lacking; if no fruits/veggies, vitamins/fiber are lacking
3. Prioritize suggestions that fill nutritional gaps

Consider:
- Macronutrient balance: ensure the user has sources of protein, healthy fats, complex carbs, and fiber
- If protein sources are missing (meat, fish, eggs, legumes, tofu), suggest them as HIGH priority
- If fruits/vegetables are lacking, suggest them for vitamins and fiber
- Common items that complement what they already have
- Staple items that might be running low or missing
- Items commonly consumed that need regular restocking

Return a JSON array of suggestions. Each suggestion should have:
- "name": product name
- "reason": brief reason why they should buy it, mentioning the nutritional benefit (1 sentence)
- "category": one of "Dairy", "Meat", "Vegetables", "Fruits", "Bakery", "Beverages", "Snacks", "Condiments", "Grains", "Frozen", "Other"
- "priority": "high" (fills nutritional gap or essential staple), "medium" (good complement), or "low" (nice to have)
- "macronutrient": primary macronutrient this item provides - one of "protein", "carbs", "fats", "fiber", "vitamins", "mixed"

Return ONLY the JSON array, no other text. Suggest 8-12 items.`
          },
          {
            role: "user",
            content: `Here are my current fridge items:\n${itemsList}\n\nWhat should I buy next?`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    let suggestions;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      suggestions = JSON.parse(cleaned);
    } catch {
      suggestions = [];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-shopping error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
