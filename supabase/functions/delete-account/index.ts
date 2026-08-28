import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  // Identity comes ONLY from the verified JWT — never from the request body.
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  const authUser = userData?.user;
  if (userErr || !authUser) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (profile?.id) {
      // Businesses this user owns, and every card profile under them.
      const { data: businesses } = await admin
        .from("businesses")
        .select("id")
        .eq("owner_id", profile.id);
      const businessIds = (businesses ?? []).map((b) => b.id);

      const { data: ownCustomers } = await admin
        .from("customers")
        .select("id")
        .eq("user_id", profile.id);
      let customerIds = (ownCustomers ?? []).map((c) => c.id);

      if (businessIds.length) {
        const { data: bizCustomers } = await admin
          .from("customers")
          .select("id")
          .in("business_id", businessIds);
        customerIds = [...new Set([...customerIds, ...(bizCustomers ?? []).map((c) => c.id)])];
      }

      if (customerIds.length) {
        await admin.from("link_clicks").delete().in("customer_id", customerIds);
        await admin.from("profile_views").delete().in("customer_id", customerIds);
        await admin.from("links").delete().in("customer_id", customerIds);
        await admin.from("business_members").delete().in("customer_id", customerIds);
        await admin.from("customers").delete().in("id", customerIds);
      }

      if (businessIds.length) {
        await admin.from("business_members").delete().in("business_id", businessIds);
        await admin.from("businesses").delete().in("id", businessIds);
      }

      await admin.from("user_roles").delete().eq("user_id", authUser.id);
      await admin.from("profiles").delete().eq("id", profile.id);
    }

    // Storage: every avatar lives under <auth uid>/…
    const { data: files } = await admin.storage.from("profile-images").list(authUser.id, { limit: 1000 });
    if (files?.length) {
      await admin.storage
        .from("profile-images")
        .remove(files.map((f) => `${authUser.id}/${f.name}`));
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(authUser.id);
    if (delErr) return json({ error: delErr.message }, 400);

    return json({ success: true });
  } catch (e) {
    console.error("delete-account failed", e);
    return json({ error: e instanceof Error ? e.message : "Deletion failed" }, 500);
  }
});
