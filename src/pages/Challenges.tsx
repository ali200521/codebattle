import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Users, Clock, Trophy, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Challenges() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [joiningChallenge, setJoiningChallenge] = useState<string | null>(null);

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(`
          *,
          skill_areas(name, icon),
          squads(id, status, squad_members(count))
        `)
        .eq("status", "active")
        .order("starts_at", { ascending: false });
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

  const handleJoinChallenge = async (challengeId: string, skillAreaId: string) => {
    setJoiningChallenge(challengeId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("match-squad", {
        body: {
          userId: user.id,
          skillAreaId,
          challengeId,
        },
      });

      if (error) throw error;

      toast({
        title: "Matched to squad!",
        description: "Redirecting to challenge room...",
      });

      navigate(`/challenge/${challengeId}/squad/${data.squadId}`);
    } catch (error: any) {
      toast({
        title: "Failed to join challenge",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setJoiningChallenge(null);
    }
  };

  const getTimeUntil = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Squad Challenges
          </h1>
          <p className="text-muted-foreground">Team up and compete in real-time challenges</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {challenges?.map((challenge) => {
            const userLevel = userSkillLevels?.find(
              (s) => s.skill_area_id === challenge.skill_area_id
            );
            const isLocked = !userLevel || userLevel.level < (challenge.difficulty_level || 1);

            return (
              <Card
                key={challenge.id}
                className="p-6 border-primary/20 hover:border-primary/40 transition-all hover:shadow-elegant"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2">{challenge.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {challenge.description}
                    </p>
                    <Badge variant="secondary">{challenge.skill_areas?.name}</Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span>Level {challenge.difficulty_level || 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span>Squad size: {challenge.max_squad_size || 3}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{challenge.time_limit ? `${challenge.time_limit / 60} min` : "Unlimited"}</span>
                  </div>
                  {challenge.starts_at && (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span>Starts in: {getTimeUntil(challenge.starts_at)}</span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  variant="challenge"
                  onClick={() => handleJoinChallenge(challenge.id, challenge.skill_area_id)}
                  disabled={isLocked || joiningChallenge === challenge.id}
                >
                  {isLocked ? "Locked" : joiningChallenge === challenge.id ? "Matching..." : "Join Challenge"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
