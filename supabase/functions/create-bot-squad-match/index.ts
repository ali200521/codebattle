import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, challengeId } = await req.json();

    if (!userId || !challengeId) {
      throw new Error("Missing required parameters: userId and challengeId");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Creating bot squad match for user:", userId);

    // Get all bot profiles (excluding the real user)
    const { data: botProfiles, error: botsError } = await supabase
      .from("profiles")
      .select("id, username")
      .neq("id", userId)
      .in("username", ["CodeNinja", "DevMaster", "BugHunter", "PixelPro", "DataDragon"])
      .limit(5);

    if (botsError) {
      console.error("Error fetching bots:", botsError);
      throw new Error("Failed to fetch bot profiles");
    }

    if (!botProfiles || botProfiles.length < 5) {
      console.error("Not enough bots found:", botProfiles?.length);
      throw new Error(
        `Not enough bot profiles available. Found ${botProfiles?.length}, need 5. Please run the bot migration.`,
      );
    }

    // Shuffle and select bots
    const shuffled = botProfiles.sort(() => Math.random() - 0.5);
    const userTeamBots = shuffled.slice(0, 2); // 2 bots for user's team
    const opponentBots = shuffled.slice(2, 5); // 3 bots for opponent team

    console.log("Creating squads with bots:", {
      userTeamBots: userTeamBots.map((b) => b.username),
      opponentBots: opponentBots.map((b) => b.username),
    });

    // Create user's squad (1 user + 2 bots)
    const { data: userSquad, error: squad1Error } = await supabase
      .from("squads")
      .insert({
        challenge_id: challengeId,
        name: `Team ${userId.substring(0, 8)}`,
        status: "active",
        bot_mode: true,
      })
      .select()
      .single();

    if (squad1Error || !userSquad) {
      console.error("Error creating user squad:", squad1Error);
      throw new Error("Failed to create user squad");
    }

    // Create opponent squad (3 bots)
    const { data: opponentSquad, error: squad2Error } = await supabase
      .from("squads")
      .insert({
        challenge_id: challengeId,
        name: `Bot Squad ${Math.random().toString(36).substring(7).toUpperCase()}`,
        status: "active",
        bot_mode: true,
      })
      .select()
      .single();

    if (squad2Error || !opponentSquad) {
      console.error("Error creating opponent squad:", squad2Error);
      throw new Error("Failed to create opponent squad");
    }

    console.log("Squads created:", {
      userSquadId: userSquad.id,
      opponentSquadId: opponentSquad.id,
    });

    // Link squads as opponents
    const { error: link1Error } = await supabase
      .from("squads")
      .update({ opponent_squad_id: opponentSquad.id })
      .eq("id", userSquad.id);

    if (link1Error) {
      console.error("Error linking user squad:", link1Error);
      throw new Error("Failed to link user squad to opponent");
    }

    const { error: link2Error } = await supabase
      .from("squads")
      .update({ opponent_squad_id: userSquad.id })
      .eq("id", opponentSquad.id);

    if (link2Error) {
      console.error("Error linking opponent squad:", link2Error);
      throw new Error("Failed to link opponent squad");
    }

    console.log("Squads linked successfully");

    // Add user to their squad as leader
    const { error: userMemberError } = await supabase.from("squad_members").insert({
      squad_id: userSquad.id,
      user_id: userId,
      role: "leader",
    });

    if (userMemberError) {
      console.error("Error adding user to squad:", userMemberError);
      throw new Error("Failed to add user to squad");
    }

    // Add 2 bots to user's squad
    const userTeamInserts = userTeamBots.map((bot) => ({
      squad_id: userSquad.id,
      user_id: bot.id,
      role: "member",
    }));

    const { error: userTeamError } = await supabase.from("squad_members").insert(userTeamInserts);

    if (userTeamError) {
      console.error("Error adding bots to user squad:", userTeamError);
      throw new Error("Failed to add bot teammates");
    }

    // Add 3 bots to opponent squad
    const opponentTeamInserts = opponentBots.map((bot, idx) => ({
      squad_id: opponentSquad.id,
      user_id: bot.id,
      role: idx === 0 ? "leader" : "member",
    }));

    const { error: opponentTeamError } = await supabase.from("squad_members").insert(opponentTeamInserts);

    if (opponentTeamError) {
      console.error("Error adding bots to opponent squad:", opponentTeamError);
      throw new Error("Failed to add opponent bots");
    }

    console.log("All squad members added successfully");

    // FIXED: Return 'squadId' instead of 'userSquadId' for consistency
    return new Response(
      JSON.stringify({
        squadId: userSquad.id, // ✓ Changed from userSquadId
        opponentSquadId: opponentSquad.id,
        message: "Bot squad match created successfully",
        teamComposition: {
          yourTeam: [
            { type: "user", id: userId },
            ...userTeamBots.map((b) => ({ type: "bot", id: b.id, name: b.username })),
          ],
          opponentTeam: opponentBots.map((b) => ({ type: "bot", id: b.id, name: b.username })),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in create-bot-squad-match:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
