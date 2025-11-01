import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, Heart, Trophy, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface OneVOneSwipeProps {
  challengeId: string;
  onClose: () => void;
}

export default function OneVOneSwipe({ challengeId, onClose }: OneVOneSwipeProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: potentialOpponents } = useQuery({
    queryKey: ["potentialOpponents", challengeId],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_skill_levels(level, skill_area_id)
        `)
        .neq("id", currentUser.id)
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser,
  });

  const swipeMutation = useMutation({
    mutationFn: async ({ toUserId, status }: { toUserId: string; status: string }) => {
      if (!currentUser) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("match_requests")
        .insert({
          challenge_id: challengeId,
          from_user_id: currentUser.id,
          to_user_id: toUserId,
          status,
        })
        .select()
        .single();

      if (error) throw error;

      // Check if there's a mutual match
      if (status === "accepted") {
        const { data: mutualMatch } = await supabase
          .from("match_requests")
          .select("*")
          .eq("challenge_id", challengeId)
          .eq("from_user_id", toUserId)
          .eq("to_user_id", currentUser.id)
          .eq("status", "accepted")
          .maybeSingle();

        if (mutualMatch) {
          // Create 1v1 match squads
          const { data: matchData, error: matchError } = await supabase.functions.invoke(
            "create-1v1-match",
            {
              body: {
                challengeId,
                user1Id: currentUser.id,
                user2Id: toUserId,
              },
            }
          );

          if (matchError) throw matchError;
          return { matched: true, squadId: matchData.squadId };
        }
      }

      return { matched: false };
    },
    onSuccess: (result) => {
      if (result.matched) {
        toast({
          title: "It's a Match! 🔥",
          description: "Starting your 1v1 challenge...",
        });
        // Navigate to challenge room
        setTimeout(() => {
          navigate(`/challenge/${challengeId}/squad/${result.squadId}`);
        }, 1500);
      }
      queryClient.invalidateQueries({ queryKey: ["potentialOpponents"] });
    },
  });

  const handleSwipe = (direction: "left" | "right") => {
    if (!potentialOpponents || currentIndex >= potentialOpponents.length) return;

    setSwipeDirection(direction);
    const opponent = potentialOpponents[currentIndex];

    setTimeout(() => {
      swipeMutation.mutate({
        toUserId: opponent.id,
        status: direction === "right" ? "accepted" : "rejected",
      });

      setSwipeDirection(null);
      setCurrentIndex((prev) => prev + 1);
    }, 300);
  };

  if (!potentialOpponents || potentialOpponents.length === 0) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <p className="text-lg mb-4">No opponents available right now</p>
          <Button onClick={onClose}>Close</Button>
        </Card>
      </div>
    );
  }

  if (currentIndex >= potentialOpponents.length) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <Zap className="w-16 h-16 mx-auto mb-4 text-primary animate-glow-pulse" />
          <p className="text-lg mb-4">You've seen all available opponents!</p>
          <p className="text-sm text-muted-foreground mb-4">
            Check back soon or try another challenge
          </p>
          <Button onClick={onClose}>Close</Button>
        </Card>
      </div>
    );
  }

  const currentOpponent = potentialOpponents[currentIndex];

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Find Your Opponent
          </h2>
          <p className="text-sm text-muted-foreground">
            Swipe right to challenge, left to pass
          </p>
        </div>

        <Card
          className={`relative overflow-hidden transition-all duration-300 ${
            swipeDirection === "left"
              ? "-translate-x-[200px] opacity-0 rotate-[-20deg]"
              : swipeDirection === "right"
              ? "translate-x-[200px] opacity-0 rotate-[20deg]"
              : "translate-x-0 opacity-100 rotate-0"
          } bg-gradient-card border-2 border-primary/20 hover:border-primary/40 shadow-lg hover:shadow-glow`}
        >
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <Avatar className="w-32 h-32 border-4 border-primary shadow-glow">
                <AvatarFallback className="text-4xl bg-gradient-hero">
                  {currentOpponent.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">
                {currentOpponent.display_name || currentOpponent.username}
              </h3>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Level {currentOpponent.current_level || 1}
                </span>
                <Badge variant="secondary" className="ml-2">
                  {currentOpponent.total_xp || 0} XP
                </Badge>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleSwipe("left")}
                disabled={swipeMutation.isPending}
                className="rounded-full w-16 h-16 p-0 border-2 hover:border-destructive hover:bg-destructive/10 transition-smooth"
              >
                <X className="w-8 h-8 text-destructive" />
              </Button>

              <Button
                size="lg"
                variant="default"
                onClick={() => handleSwipe("right")}
                disabled={swipeMutation.isPending}
                className="rounded-full w-16 h-16 p-0 bg-gradient-challenge hover:shadow-challenge transition-smooth animate-glow-pulse"
              >
                <Heart className="w-8 h-8" />
              </Button>
            </div>
          </div>
        </Card>

        <div className="text-center mt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {currentIndex + 1} / {potentialOpponents.length}
          </p>
        </div>
      </div>
    </div>
  );
}
