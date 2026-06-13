import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recipe, userMessage, fridgeItems, chatHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const fridgeList = (fridgeItems || [])
      .map((i: any) => i.name)
      .join(", ");

    const messages = [
      {
        role: "system",
        content: `You are a helpful chef assistant for the EatSmart app. The user is viewing a recipe and chatting with you about it.

Current recipe:
Title: ${recipe?.title || "Unknown"}
Ingredients: ${(recipe?.ingredients || []).join(", ")}
Instructions: ${(recipe?.instructions || []).join(" | ")}

User's fridge contains: ${fridgeList || "unknown items"}

Your job:
- If the user says they don't have an ingredient, suggest a substitute OR suggest an entirely different recipe they can make with what they have
- Keep responses concise and friendly
- If suggesting a new recipe, include full ingredients and step-by-step instructions
- Always consider what's actually in their fridge
- Format your response clearly. If suggesting a new recipe, use this format:
  🍳 **Recipe Name**
  ⏱ Time | Difficulty
  
  **Ingredients:**
  • item 1
  • item 2
  
  **Instructions:**
  1. Step one
  2. Step two

Respond in the same language the user writes in.`
      },
    ];

    // Add chat history
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: userMessage });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const reply = aiData.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recipe-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
