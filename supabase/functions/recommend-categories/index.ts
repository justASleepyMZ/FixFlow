const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, categories, season } = await req.json();
    if (!Array.isArray(categories) || categories.length === 0) {
      return new Response(JSON.stringify({ error: "categories[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const ctxSeason = season ?? `Current month: ${month}`;

    const systemPrompt = `You are a smart recommendation engine for a home services marketplace in Kazakhstan.
Pick the 4 MOST RELEVANT categories from the provided list for the user right now.
Consider: user query (if any), seasonal relevance (${ctxSeason}), common household needs.
Use the recommend_categories tool. Return EXACTLY 4 categories from the provided list (use exact names).`;

    const userPrompt = `Available categories: ${categories.join(", ")}
${query ? `User interest: ${query}` : "No specific query — recommend based on season and general demand."}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_categories",
            description: "Return 4 recommended categories with reasoning.",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", description: "Exact category name from the list" },
                      reason: { type: "string", description: "Short reason in English, max 60 chars" },
                    },
                    required: ["category", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["recommendations"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "recommend_categories" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway error: ${aiRes.status} ${t}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("recommend-categories error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
