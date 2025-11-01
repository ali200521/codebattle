import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Zap, Home, ChevronRight } from "lucide-react";

export default function QuizResults() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: attempt, isLoading } = useQuery({
    queryKey: ["lastQuizAttempt", id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*, quizzes(title, questions)")
        .eq("quiz_id", id)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const percentage = attempt ? Math.round((attempt.score / attempt.max_score) * 100) : 0;
  const xpEarned = (attempt?.score || 0) * 10;

  const getPerformanceBadge = (pct: number) => {
    if (pct >= 90) return { label: "Excellent!", color: "bg-green-500" };
    if (pct >= 70) return { label: "Good Job!", color: "bg-blue-500" };
    if (pct >= 50) return { label: "Not Bad", color: "bg-yellow-500" };
    return { label: "Keep Trying", color: "bg-red-500" };
  };

  const badge = getPerformanceBadge(percentage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="p-8 text-center border-primary/20">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold mb-2">Quiz Complete!</h1>
          <p className="text-muted-foreground mb-6">{attempt?.quizzes?.title}</p>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 rounded-lg bg-accent/20">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">
                {attempt?.score}/{attempt?.max_score}
              </p>
              <p className="text-sm text-muted-foreground">Score</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/20">
              <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">
                {attempt?.time_taken
                  ? `${Math.floor(attempt.time_taken / 60)}:${(attempt.time_taken % 60)
                      .toString()
                      .padStart(2, "0")}`
                  : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">Time</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/20">
              <Zap className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{xpEarned}</p>
              <p className="text-sm text-muted-foreground">XP Earned</p>
            </div>
          </div>

          <Badge className={`${badge.color} text-white text-lg px-6 py-2 mb-6`}>
            {badge.label} - {percentage}%
          </Badge>
        </Card>

        <Card className="p-6 border-primary/20">
          <h2 className="text-2xl font-bold mb-4">Review Answers</h2>
          <div className="space-y-4">
            {(attempt?.quizzes?.questions as any[])?.map((question, idx) => {
              const userAnswer = (attempt?.answers as any)?.[idx];
              const isCorrect = userAnswer === question.correctAnswer;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">Question {idx + 1}</h3>
                    <Badge variant={isCorrect ? "default" : "destructive"}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                  <p className="mb-3">{question.question}</p>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Your answer:</span>{" "}
                      {question.options[userAnswer]}
                    </p>
                    {!isCorrect && (
                      <p>
                        <span className="font-medium">Correct answer:</span>{" "}
                        {question.options[question.correctAnswer]}
                      </p>
                    )}
                    {question.explanation && (
                      <p className="text-muted-foreground italic">
                        {question.explanation}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate("/quizzes")}>
            More Quizzes
          </Button>
          <Button variant="hero" onClick={() => navigate("/dashboard")}>
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
