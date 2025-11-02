import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challengeId } = await req.json();
    
    if (!challengeId) {
      throw new Error("Missing challengeId");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*, skill_areas(name)')
      .eq('id', challengeId)
      .single();

    if (challengeError) throw challengeError;
    if (!challenge) throw new Error("Challenge not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const skillAreaName = challenge.skill_areas?.name || "Software Development";
    const numQuestions = 5;

    const systemPrompt = `You are a coding challenge generator. Create practical coding questions for real-time battles.
Return ONLY a valid JSON array with no markdown formatting or code blocks.
Each question object must have exactly these fields:
- question: string (clear, practical coding question)
- hints: array of strings (2-3 helpful hints)
- difficulty: string (easy, medium, or hard)
- points: number (10, 20, or 30 based on difficulty)`;

    const userPrompt = `Create exactly ${numQuestions} coding challenge questions about ${skillAreaName} at difficulty level ${challenge.difficulty_level}.
Make them practical, hands-on questions suitable for a timed coding battle.`;

    console.log("Generating questions for challenge:", challengeId, "skill:", skillAreaName);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable workspace.");
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const questionsContent = data.choices?.[0]?.message?.content || "[]";
    
    console.log("Received questions:", questionsContent);
    
    let questions;
    try {
      const cleanContent = questionsContent.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(cleanContent);
      
      if (!Array.isArray(questions)) {
        throw new Error("Questions content is not an array");
      }
      
      if (questions.length === 0) {
        throw new Error("No questions generated");
      }
      
    } catch (parseError) {
      console.error("Failed to parse questions:", questionsContent);
      throw new Error("Invalid questions format received from AI");
    }

    // Update challenge with questions
    const { error: updateError } = await supabase
      .from('challenges')
      .update({ content: { questions } })
      .eq('id', challengeId);

    if (updateError) throw updateError;

    console.log(`Successfully generated ${questions.length} questions for challenge ${challengeId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        questions,
        message: `Generated ${questions.length} questions`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-challenge-questions:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
