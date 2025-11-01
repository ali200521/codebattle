import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TakeQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (quiz?.time_limit) {
      setTimeLeft(quiz.time_limit);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quiz]);

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const questions = quiz?.questions as any[];
      const score = Object.entries(answers).reduce((acc, [idx, answer]) => {
        return acc + (questions[parseInt(idx)].correctAnswer === answer ? 1 : 0);
      }, 0);

      const timeTaken = Math.floor((Date.now() - startTime) / 1000);

      const { error } = await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        quiz_id: id,
        score,
        max_score: questions.length,
        answers,
        time_taken: timeTaken,
      });

      if (error) throw error;

      const xpGained = score * 10;
      
      const { data: currentSkillLevel } = await supabase
        .from("user_skill_levels")
        .select("xp")
        .eq("user_id", user.id)
        .eq("skill_area_id", quiz.skill_area_id)
        .single();

      if (currentSkillLevel) {
        await supabase
          .from("user_skill_levels")
          .update({ xp: (currentSkillLevel.xp || 0) + xpGained })
          .eq("user_id", user.id)
          .eq("skill_area_id", quiz.skill_area_id);
      }

      toast({
        title: "Quiz completed!",
        description: `You scored ${score}/${questions.length} and earned ${xpGained} XP!`,
      });

      navigate(`/quiz-results/${id}`);
    } catch (error: any) {
      toast({
        title: "Failed to submit quiz",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const questions = (quiz?.questions as any[]) || [];
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl p-8 border-primary/20">
        <div className="mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{quiz?.title}</h2>
            {timeLeft !== null && (
              <div className="flex items-center gap-2 text-lg font-mono">
                <Clock className="w-5 h-5" />
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </div>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold">{question?.question}</h3>

          <RadioGroup
            value={answers[currentQuestion]?.toString()}
            onValueChange={(value) =>
              setAnswers({ ...answers, [currentQuestion]: parseInt(value) })
            }
          >
            {question?.options?.map((option: string, idx: number) => (
              <div key={idx} className="flex items-center space-x-2 p-4 rounded-lg border border-primary/20 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button onClick={handleSubmit} variant="challenge">
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={answers[currentQuestion] === undefined}
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
