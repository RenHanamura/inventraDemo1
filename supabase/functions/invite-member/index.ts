import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, organization_id } = await req.json();

    if (!email || !role || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: email, role, organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["super_admin", "admin", "warehouse_manager", "staff"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Rol inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin/super_admin in the org
    const { data: callerRole } = await adminClient.rpc("get_user_role", {
      _user_id: user.id,
      _organization_id: organization_id,
    });
    if (!callerRole || !["super_admin", "admin"].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: "No tienes permisos para invitar miembros" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already a member
    const { data: existingMembers } = await adminClient
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organization_id);

    // Get org name for the email
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    const orgName = org?.name || "Inventra";

    // Try to invite the user via Supabase Auth
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          invited_to_org: organization_id,
          invited_role: role,
          full_name: email.split("@")[0],
        },
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/auth/v1/callback`,
      });

    let inviteLink: string | null = null;
    let newUserId: string | null = null;

    if (inviteError) {
      // User might already exist - check
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email === email
      );

      if (existingUser) {
        // Check if already in this org
        const alreadyMember = existingMembers?.some(
          (m) => m.user_id === existingUser.id
        );
        if (alreadyMember) {
          return new Response(
            JSON.stringify({ error: "Este usuario ya es miembro de la organización" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Add existing user to org
        newUserId = existingUser.id;

        await adminClient.from("organization_members").insert({
          organization_id,
          user_id: newUserId,
          role: "member",
        });

        await adminClient.from("user_roles").upsert(
          {
            user_id: newUserId,
            organization_id,
            role,
          },
          { onConflict: "user_id,organization_id" }
        );
      } else {
        // Truly failed
        console.error("Invite error:", inviteError);
        return new Response(
          JSON.stringify({
            error: "No se pudo enviar la invitación. El email podría no estar habilitado para envío.",
            details: inviteError.message,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Successfully invited new user
      newUserId = inviteData.user.id;

      // Add to org members
      await adminClient.from("organization_members").insert({
        organization_id,
        user_id: newUserId,
        role: "member",
      });

      // Assign role
      await adminClient.from("user_roles").upsert(
        {
          user_id: newUserId,
          organization_id,
          role,
        },
        { onConflict: "user_id,organization_id" }
      );

      // Create profile
      await adminClient.from("profiles").upsert(
        {
          user_id: newUserId,
          full_name: email.split("@")[0],
        },
        { onConflict: "user_id" }
      );
    }

    // Record invitation
    await adminClient.from("pending_invitations").insert({
      organization_id,
      email,
      role,
      invited_by: user.id,
      status: newUserId && !inviteError ? "sent" : "added",
      invite_link: inviteLink,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: inviteError
          ? `Usuario existente agregado a la organización como ${role}`
          : `Invitación enviada a ${email}`,
        user_id: newUserId,
        invite_link: inviteLink,
        was_existing_user: !!inviteError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
