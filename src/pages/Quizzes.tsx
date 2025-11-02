import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Clock, Target, Trophy, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import Navigation from "@/components/Navigation";

export default function Quizzes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedSkillArea, setSelectedSkillArea] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: skillAreas } = useQuery({
    queryKey: ["skillAreas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_areas")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: quizzes, refetch } = useQuery({
    queryKey: ["quizzes", selectedSkillArea],
    queryFn: async () => {
      let query = supabase.from("quizzes").select("*, skill_areas(name, icon)");
      if (selectedSkillArea) {
        query = query.eq("skill_area_id", selectedSkillArea);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: userSkillLevels } = useQuery({
    queryKey: ["userSkillLevels"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_skill_levels")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const handleGenerateQuiz = async (skillAreaId: string, topic: string) => {
    setIsGenerating(true);
    try {
      const skillLevel = userSkillLevels?.find(s => s.skill_area_id === skillAreaId);
      const difficulty = skillLevel?.level || 1;

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          topic,
          difficulty: difficulty <= 2 ? "beginner" : difficulty <= 4 ? "intermediate" : "advanced",
          numQuestions: 5,
        },
      });

      if (error) throw error;
      if (!data?.questions) throw new Error("No questions returned from AI");

      const { data: newQuiz, error: insertError } = await supabase.from("quizzes").insert({
        title: `${topic} Quiz`,
        skill_area_id: skillAreaId,
        questions: data.questions,
        difficulty_level: difficulty,
        time_limit: 300,
      }).select().single();

      if (insertError) throw insertError;

      toast({ title: "Quiz generated successfully!" });
      navigate(`/quiz/${newQuiz.id}`);
    } catch (error: any) {
      toast({ 
        title: "Failed to generate quiz", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return "bg-green-500";
    if (level <= 4) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return "Beginner";
    if (level <= 4) return "Intermediate";
    return "Advanced";
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Quizzes
          </h1>
          <p className="text-muted-foreground">Test your knowledge and earn XP</p>
        </div>

        <Tabs defaultValue="all" className="mb-8">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setSelectedSkillArea(null)}>
              All Quizzes
            </TabsTrigger>
            {skillAreas?.map((area) => (
              <TabsTrigger
                key={area.id}
                value={area.id}
                onClick={() => setSelectedSkillArea(area.id)}
              >
                {area.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedSkillArea || "all"} className="mt-6">
            {skillAreas?.map((area) => (
              <Card key={area.id} className="p-6 mb-4 border-primary/20">
                <h3 className="text-xl font-bold mb-4">{area.name}</h3>
                <div className="flex gap-2 flex-wrap">
                  {["React Hooks", "State Management", "API Integration", "Performance"].map((topic) => (
                    <Button
                      key={topic}
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateQuiz(area.id, topic)}
                      disabled={isGenerating}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate: {topic}
                    </Button>
                  ))}
                </div>
              </Card>
            ))}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              {quizzes?.map((quiz) => (
                <Card
                  key={quiz.id}
                  className="p-6 hover:shadow-elegant transition-all cursor-pointer border-primary/20 hover:border-primary/40"
                  onClick={() => navigate(`/quiz/${quiz.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{quiz.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {quiz.skill_areas?.name}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      <span>
                        {Array.isArray(quiz.questions) ? quiz.questions.length : 0} Questions
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{quiz.time_limit ? `${quiz.time_limit / 60} min` : "Unlimited"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      <Badge className={getDifficultyColor(quiz.difficulty_level || 1)}>
                        {getDifficultyLabel(quiz.difficulty_level || 1)}
                      </Badge>
                    </div>
                  </div>

                  <Button className="w-full mt-4" variant="hero">
                    Start Quiz
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </>
  );
}
