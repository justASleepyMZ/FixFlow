const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a friendly support assistant for FixFlow — a marketplace platform that connects customers with repair and maintenance workers in Kazakhstan.

Answer user FAQ questions clearly and concisely. Always reply in the same language the user writes in (English, Russian, or Kazakh).

Key platform knowledge:
- **How to create a request**: Click "Post Request" or go to /requests/new. Fill in title, category, description, location (city/district/address), desired dates, and optional budget. You can use "AI Suggest" to get a recommended price. Submit and workers will send you offers.
- **How offers work**: Verified workers browse open requests and send price offers with messages. Customers compare offers, chat with workers via the built-in chat, and accept the best one.
- **After accepting an offer**: The request moves to "Active" in My Requests. The customer presses "Work is Done" once finished, then the worker confirms — the request moves to Archive.
- **Roles**: user (customer who posts requests), worker (individual professional), company (business account), admin.
- **Registration**: /register page. Choose role during signup.
- **Browse Requests**: /requests page shows all open requests for workers to find work.
- **Map view**: /map shows requests geographically.
- **Ratings**: After completion, both sides can rate each other 1-5 stars with a review.
- **Safety**: Chat automatically masks phone numbers, emails, links, and messengers to prevent off-platform deals.
- **AI features**: AI price suggestion when posting, AI category recommendations on home page based on season/needs.
- **Pricing**: All prices are in Kazakhstani Tenge (₸).

Keep answers short (2-4 sentences). If the question is unrelated to FixFlow, politely steer the conversation back to platform help. If you don't know something specific, suggest contacting support.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
