import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { offerId, requestId } = await req.json();
    if (!offerId || !requestId) {
      return new Response(JSON.stringify({ error: "Missing offerId or requestId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check ownership
    const { data: reqRow, error: reqErr } = await supabase
      .from("service_requests")
      .select("id, user_id, status")
      .eq("id", requestId)
      .single();

    if (reqErr || !reqRow) {
      return new Response(JSON.stringify({ error: "Request not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (reqRow.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Only the request owner can accept offers" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (reqRow.status !== "open" && reqRow.status !== "in_negotiation") {
      return new Response(JSON.stringify({ error: "Request is not open for acceptance" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Accept selected offer, reject the rest
    const { error: acceptErr } = await supabase
      .from("offers")
      .update({ status: "accepted" })
      .eq("id", offerId)
      .eq("request_id", requestId);
    if (acceptErr) throw acceptErr;

    await supabase
      .from("offers")
      .update({ status: "rejected" })
      .eq("request_id", requestId)
      .neq("id", offerId);

    // Move request to assigned
    const { error: srErr } = await supabase
      .from("service_requests")
      .update({
        status: "assigned",
        customer_confirmed_complete: false,
        worker_confirmed_complete: false,
      })
      .eq("id", requestId);
    if (srErr) throw srErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
