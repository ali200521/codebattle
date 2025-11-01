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
    const { challengeId, user1Id, user2Id } = await req.json();
    console.log('Creating 1v1 match:', { challengeId, user1Id, user2Id });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create two squads (one for each player)
    const squadName1 = `1v1-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const squadName2 = `1v1-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create first squad
    const { data: squad1 } = await supabase
      .from('squads')
      .insert({
        challenge_id: challengeId,
        name: squadName1,
        average_level: 1,
        status: 'ready',
      })
      .select()
      .single();

    // Create second squad
    const { data: squad2 } = await supabase
      .from('squads')
      .insert({
        challenge_id: challengeId,
        name: squadName2,
        average_level: 1,
        status: 'ready',
      })
      .select()
      .single();

    if (!squad1 || !squad2) {
      throw new Error('Failed to create squads');
    }

    // Link squads as opponents
    await supabase
      .from('squads')
      .update({ opponent_squad_id: squad2.id })
      .eq('id', squad1.id);

    await supabase
      .from('squads')
      .update({ opponent_squad_id: squad1.id })
      .eq('id', squad2.id);

    // Add users to their respective squads
    await supabase
      .from('squad_members')
      .insert([
        {
          squad_id: squad1.id,
          user_id: user1Id,
          role: 'leader',
        },
        {
          squad_id: squad2.id,
          user_id: user2Id,
          role: 'leader',
        },
      ]);

    return new Response(
      JSON.stringify({ 
        squadId: squad1.id,
        opponentSquadId: squad2.id,
        message: '1v1 match created successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-1v1-match function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create 1v1 match' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
