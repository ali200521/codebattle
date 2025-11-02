import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Clock, Send, Bot, Loader2, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import SquadChat from "@/components/SquadChat";

export default function ChallengeRoom() {
  const { challengeId, squadId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [notes, setNotes] = useState("");
  const [viewingOpponent, setViewingOpponent] = useState(false);

  const { data: challenge } = useQuery({
    queryKey: ["challenge", challengeId],
    queryFn: async () => {
      if (!challengeId) throw new Error("No challenge ID");
      const { data, error } = await supabase.from("challenges").select("*").eq("id", challengeId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!challengeId,
  });

  const { data: squad } = useQuery({
    queryKey: ["squad", squadId],
    queryFn: async () => {
      if (!squadId) throw new Error("No squad ID");
      const { data, error } = await supabase
        .from("squads")
        .select(
          `
          *,
          squad_members(
            id,
            role,
            profiles(username, display_name, avatar_url, current_level, total_xp)
          )
        `,
        )
        .eq("id", squadId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!squadId,
  });

  const { data: opponentSquad } = useQuery({
    queryKey: ["opponentSquad", squad?.opponent_squad_id],
    queryFn: async () => {
      if (!squad?.opponent_squad_id) return null;
      const { data, error } = await supabase
        .from("squads")
        .select(
          `
          *,
          squad_members(
            id,
            role,
            profiles(username, display_name, avatar_url, current_level, total_xp)
          )
        `,
        )
        .eq("id", squad.opponent_squad_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!squad?.opponent_squad_id,
  });

  useEffect(() => {
    if (challenge?.time_limit) {
      setTimeLeft(challenge.time_limit);
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
  }, [challenge]);

  useEffect(() => {
    const channel = supabase
      .channel(`squad-${squadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_submissions",
          filter: `squad_id=eq.${squadId}`,
        },
        () => {
          toast({
            title: "Team member submitted!",
            description: "A squad member just completed their submission",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [squadId]);

  const handleSubmit = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const score = Object.keys(answers).length * 10;

      const { error } = await supabase.from("challenge_submissions").insert({
        user_id: user.id,
        squad_id: squadId,
        challenge_id: challengeId,
        answers,
        time_taken: timeTaken,
        score,
      });

      if (error) throw error;

      toast({
        title: "Challenge completed!",
        description: "Your answers have been submitted.",
      });

      navigate(`/challenge-results/${challengeId}/${squadId}`);
    } catch (error: any) {
      toast({
        title: "Failed to submit challenge",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!challenge || !squad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const questions = (challenge.content as any)?.questions || [];
  const question = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const squadSize = squad.squad_members?.length || 0;
  const isOneVsOne = squadSize === 1 && challenge.challenge_type === "1v1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6 border-primary/20 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{challenge.title}</h2>
                {timeLeft !== null && (
                  <div className="flex items-center gap-2 text-lg font-mono">
                    <Clock className="w-5 h-5" />
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                  </div>
                )}
              </div>
              <Progress value={progress} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </Card>

            <Card className="p-8 border-primary/20">
              <h3 className="text-xl font-semibold mb-6">{question?.question}</h3>

              <Textarea
                placeholder="Enter your solution here..."
                className="min-h-[300px] font-mono"
                value={answers[currentQuestion] || ""}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion]: e.target.value })}
              />

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>

                {currentQuestion === questions.length - 1 ? (
                  <Button onClick={handleSubmit} variant="challenge">
                    <Send className="w-4 h-4 mr-2" />
                    Submit Challenge
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>Next Question</Button>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Squad Cards with Swap Button */}
            <Card className="p-6 border-primary/20 sticky top-6">
              {opponentSquad && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingOpponent(!viewingOpponent)}
                  className="w-full mb-4"
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  {viewingOpponent ? "View Your Squad" : "View Opponent Squad"}
                </Button>
              )}

              {!viewingOpponent ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-lg">Your Squad</h3>
                    </div>
                    <Badge variant="secondary">{squad.status}</Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    {squad.squad_members?.map((member: any) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{member.profiles?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{member.profiles?.display_name || member.profiles?.username}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="capitalize">{member.role}</span>
                            <span>Lvl {member.profiles?.current_level || 1}</span>
                            <span>{member.profiles?.total_xp || 0} XP</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {squad.bot_mode && (
                    <Badge variant="outline" className="w-full justify-center">
                      <Bot className="w-3 h-3 mr-1" />
                      Bot Practice Mode
                    </Badge>
                  )}
                </>
              ) : (
                opponentSquad && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-destructive" />
                      <h3 className="font-bold text-lg">Opponent Squad</h3>
                    </div>

                    <div className="space-y-3">
                      {opponentSquad.squad_members?.map((member: any) => (
                        <div key={member.id} className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-destructive/20">
                              {member.profiles?.username?.[0]?.toUpperCase() || "O"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{member.profiles?.display_name || member.profiles?.username}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>Lvl {member.profiles?.current_level || 1}</span>
                              <span>{member.profiles?.total_xp || 0} XP</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )
              )}
            </Card>

            {/* Squad Chat or Notes */}
            {isOneVsOne ? (
              <Card className="p-6 border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-bold">Notes</h3>
                </div>
                <Textarea
                  placeholder="Take notes here..."
                  className="min-h-[200px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">Your personal notes for this challenge</p>
              </Card>
            ) : (
              <SquadChat squadId={squadId || ""} botMode={squad.bot_mode || false} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
