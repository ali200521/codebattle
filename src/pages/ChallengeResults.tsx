import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Clock, Zap, Home } from "lucide-react";

export default function ChallengeResults() {
  const { challengeId, squadId } = useParams();
  const navigate = useNavigate();

  const { data: results } = useQuery({
    queryKey: ["challengeResults", challengeId, squadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_submissions")
        .select(`
          *,
          profiles(username, display_name, avatar_url)
        `)
        .eq("squad_id", squadId)
        .order("score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: squad } = useQuery({
    queryKey: ["squad", squadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squads")
        .select("*")
        .eq("id", squadId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const totalScore = results?.reduce((sum, r) => sum + (r.score || 0), 0) || 0;
  const avgTime = results?.length
    ? Math.floor(
        results.reduce((sum, r) => sum + (r.time_taken || 0), 0) / results.length
      )
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="p-8 text-center border-primary/20">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold mb-2">Challenge Complete!</h1>
          <p className="text-muted-foreground mb-6">Squad: {squad?.name}</p>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 rounded-lg bg-accent/20">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalScore}</p>
              <p className="text-sm text-muted-foreground">Total Score</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/20">
              <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{Math.floor(avgTime / 60)}:{(avgTime % 60).toString().padStart(2, "0")}</p>
              <p className="text-sm text-muted-foreground">Avg Time</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/20">
              <Zap className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalScore * 2} XP</p>
              <p className="text-sm text-muted-foreground">Earned</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-primary/20">
          <h2 className="text-2xl font-bold mb-4">Squad Performance</h2>
          <div className="space-y-4">
            {results?.map((result, idx) => (
              <div
                key={result.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors"
              >
                <div className="text-2xl font-bold text-muted-foreground">
                  #{idx + 1}
                </div>
                <Avatar>
                  <AvatarFallback>
                    {result.profiles?.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {result.profiles?.display_name || result.profiles?.username}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {result.score} pts
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {Math.floor((result.time_taken || 0) / 60)}:
                      {((result.time_taken || 0) % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>
                {idx === 0 && (
                  <Badge variant="default" className="bg-gradient-primary">
                    Top Contributor
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate("/challenges")}>
            More Challenges
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
