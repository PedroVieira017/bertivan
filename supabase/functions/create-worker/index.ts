import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "boss" | "worker";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("create-worker:start");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Configuracao do Supabase em falta." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.full_name || "").trim();
    const pin = String(body.pin || "").replace(/\D/g, "");
    const role = String(body.role || "worker") as AppRole;

    if (!email || !password || !fullName || pin.length !== 4) {
      console.error("create-worker:invalid-input", { email, fullName, pinLength: pin.length, role });
      return new Response(JSON.stringify({ error: "Dados invalidos. Verifique email, password, nome e PIN." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["admin", "boss", "worker"].includes(role)) {
      return new Response(JSON.stringify({ error: "Funcao invalida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !createdUser.user) {
      console.error("create-worker:create-user-failed", createError);
      return new Response(JSON.stringify({ error: createError?.message || "Nao foi possivel criar o utilizador." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = createdUser.user.id;

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        pin,
        is_active: true,
      })
      .eq("user_id", newUserId);

    if (profileError) {
      console.error("create-worker:profile-update-failed", profileError);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: userRoleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role });

    if (userRoleError) {
      console.error("create-worker:user-role-failed", userRoleError);
      return new Response(JSON.stringify({ error: userRoleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("create-worker:success", { newUserId, email, role });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        email,
        full_name: fullName,
        role,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    console.error("create-worker:unexpected", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
