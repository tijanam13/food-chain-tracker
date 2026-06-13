import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const today = new Date().toISOString().split("T")[0];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a grocery receipt analyzer for the EatSmart app. Today's date is ${today}.

Rules:
1. Extract ONLY food items from the receipt. Ignore bags, tax, discounts, store name, non-food items (cleaning supplies, toiletries, etc.).
2. Translate Serbian/local product names to English (e.g. "Jogurt" -> "Yogurt", "Mleko" -> "Milk", "Jaja" -> "Eggs", "Hleb" -> "Bread", "Piletina" -> "Chicken", "Jabuke" -> "Apples", "Paradajz" -> "Tomatoes").
3. Assign a category: Dairy, Meat, Fruit, Vegetable, Bakery, Pantry, Beverage, or Other.
4. Detect quantity AND unit from the receipt:
   - If it says "500g" or "500 g", set quantity to 500 and unit to "g".
   - If it says "1.5kg" or "1.5 kg", set quantity to 1.5 and unit to "kg".
   - If it says "1L" or "1 l", set quantity to 1 and unit to "l".
   - If it says "250ml" or "250 ml", set quantity to 250 and unit to "ml".
   - If it says "2x" or "x2" or just a count, set quantity to 2 and unit to "pcs".
   - If no unit or quantity is found, default to quantity 1 and unit "pcs".
5. Predict expiry dates using USDA FoodKeeper standards from today (${today}):
   - Fresh Poultry (chicken, turkey): +2 days
   - Fresh Meat (beef, pork, lamb): +3 days
   - Fresh Fish/Seafood: +2 days
   - Ground Meat: +2 days
   - Fresh Milk: +7 days
   - Yogurt: +10 days
   - Hard Cheese: +28 days
   - Soft Cheese: +14 days
   - Eggs: +21 days
   - Butter: +30 days
   - Bread/Bakery: +4 days
   - Apples: +21 days
   - Berries: +5 days
   - Bananas: +5 days
   - Citrus Fruits: +14 days
   - Other Fresh Fruits: +7 days
   - Leafy Greens (lettuce, spinach): +5 days
   - Root Vegetables (carrots, potatoes): +21 days
   - Tomatoes: +7 days
   - Other Fresh Vegetables: +10 days
   - Pantry/Canned/Dry goods: +180 days
   - Beverages (juice): +14 days
   - Beverages (soda, water): +180 days
6. SPECIAL RULE: If a product mentions "Dugotrajno", "UHT", or "long-life", set expiry to +90 days.
7. Return ONLY a valid JSON array. No markdown, no explanation.

Each item: {"name": "English Name", "category": "Category", "quantity": 1, "unit": "pcs", "expiry_date": "YYYY-MM-DD"}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this grocery receipt and extract food items:" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let items;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse items:", content);
      items = [];
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
