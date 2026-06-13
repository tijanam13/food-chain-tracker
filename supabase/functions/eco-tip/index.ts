import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const topics = [
      "global food waste statistics and shocking numbers",
      "how much money households lose to food waste annually",
      "CO2 emissions from food waste compared to countries or industries",
      "water footprint of wasted food",
      "landfill methane from rotting food",
      "benefits of composting food scraps",
      "seasonal eating and reducing food miles",
      "how proper fridge organization reduces waste",
      "food waste in restaurants vs homes",
      "the energy wasted when food is thrown away",
      "how food waste affects world hunger",
      "creative ways to use leftovers",
      "the journey of food from farm to trash",
      "biodiversity loss caused by unnecessary food production",
      "how reducing food waste helps save forests",
    ];
    
    const tones = [
      "shocking statistic with a call to action",
      "motivational and empowering",
      "poetic and philosophical",
      "personal finance angle showing money saved",
      "humorous and witty",
      "progress-oriented celebrating small wins",
    ];

    const topic = topics[Math.floor(Math.random() * topics.length)];
    const tone = tones[Math.floor(Math.random() * tones.length)];

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
            content: `You write ONE short eco-awareness message for a food waste app. 
Rules: Start with a relevant emoji. Max 2 sentences. Under 250 characters total. 
Reply ONLY with the message, nothing else.`
          },
          {
            role: "user",
            content: `Topic: ${topic}. Tone: ${tone}. Write a unique message. ID: ${crypto.randomUUID()}`
          }
        ],
        temperature: 1.2,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const tip = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ tip }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("eco-tip error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
