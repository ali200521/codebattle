import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, skillAreaId, challengeId } = await req.json();
    console.log('Matching squad for:', { userId, skillAreaId, challengeId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's skill level
    const { data: userSkill } = await supabase
      .from('user_skill_levels')
      .select('level')
      .eq('user_id', userId)
      .eq('skill_area_id', skillAreaId)
      .single();

    if (!userSkill) {
      throw new Error('User skill level not found');
    }

    const userLevel = userSkill.level;
    const levelRange = 1; // Match with users within ±1 level

    // Find existing squad that needs members
    const { data: existingSquads } = await supabase
      .from('squads')
      .select(`
        *,
        squad_members (count)
      `)
      .eq('challenge_id', challengeId)
      .eq('status', 'forming')
      .gte('average_level', userLevel - levelRange)
      .lte('average_level', userLevel + levelRange);

    let squadId;

    if (existingSquads && existingSquads.length > 0) {
      // Find squad with space
      const squad = existingSquads.find((s: any) => {
        const memberCount = s.squad_members?.[0]?.count || 0;
        return memberCount < 3; // max 3 members per squad
      });

      if (squad) {
        squadId = squad.id;
        
        // Add user to existing squad
        await supabase
          .from('squad_members')
          .insert({
            squad_id: squadId,
            user_id: userId,
            role: 'member',
          });

        // Update squad average level
        const { data: members } = await supabase
          .from('squad_members')
          .select(`
            user:profiles (
              user_skill_levels!inner (level)
            )
          `)
          .eq('squad_id', squadId);

        const levels = members?.map((m: any) => 
          m.user.user_skill_levels.find((s: any) => s.skill_area_id === skillAreaId)?.level || 1
        ) || [];
        const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;

        await supabase
          .from('squads')
          .update({ 
            average_level: avgLevel,
            status: levels.length >= 3 ? 'ready' : 'forming'
          })
          .eq('id', squadId);
      }
    }

    if (!squadId) {
      // Create new squad
      const { data: newSquad } = await supabase
        .from('squads')
        .insert({
          challenge_id: challengeId,
          name: `Squad ${Math.random().toString(36).substring(7).toUpperCase()}`,
          average_level: userLevel,
          status: 'forming',
        })
        .select()
        .single();

      squadId = newSquad.id;

      // Add user as leader
      await supabase
        .from('squad_members')
        .insert({
          squad_id: squadId,
          user_id: userId,
          role: 'leader',
        });
    }

    // Try to match ready squads against each other
    const { data: readySquads } = await supabase
      .from('squads')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('status', 'ready')
      .is('opponent_squad_id', null)
      .limit(2);

    if (readySquads && readySquads.length >= 2) {
      const [squad1, squad2] = readySquads;
      
      // Link squads as opponents
      await supabase
        .from('squads')
        .update({ 
          opponent_squad_id: squad2.id,
          status: 'active'
        })
        .eq('id', squad1.id);

      await supabase
        .from('squads')
        .update({ 
          opponent_squad_id: squad1.id,
          status: 'active'
        })
        .eq('id', squad2.id);
    }

    return new Response(
      JSON.stringify({ squadId, message: 'Successfully matched to squad' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in match-squad function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to match squad' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
