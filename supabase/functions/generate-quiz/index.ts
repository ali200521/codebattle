import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, difficulty, numQuestions } = await req.json();
    
    if (!topic || !difficulty || !numQuestions) {
      throw new Error("Missing required parameters: topic, difficulty, or numQuestions");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an educational quiz generator. Create high-quality, accurate multiple choice questions.
Return ONLY a valid JSON array with no markdown formatting or code blocks.
Each question object must have exactly these fields:
- question: string (the question text)
- options: object with keys A, B, C, D (the answer choices)
- correct_answer: string (one of: "A", "B", "C", or "D")
- explanation: string (brief explanation of the correct answer)`;

    const userPrompt = `Create a ${numQuestions}-question multiple choice quiz about "${topic}" at ${difficulty} difficulty level.`;

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
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable workspace.");
      }
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const quizContent = data.choices?.[0]?.message?.content || "[]";
    
    // Parse and validate the quiz content
    let questions;
    try {
      // Remove markdown code blocks if present
      const cleanContent = quizContent.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(cleanContent);
      
      if (!Array.isArray(questions)) {
        throw new Error("Quiz content is not an array");
      }
    } catch (parseError) {
      console.error("Failed to parse quiz content:", quizContent);
      throw new Error("Invalid quiz format received from AI");
    }

    return new Response(
      JSON.stringify({ questions }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-quiz:", error);
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
