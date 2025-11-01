import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Users, Bot, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";

const Challenges = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [testingBotId, setTestingBotId] = useState<string | null>(null);

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(
          `
          *,
          skill_areas (
            id,
            name,
            icon
          )
        `,
        )
        .in("status", ["active", "pending"])
        .order("starts_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const duelChallenges = challenges?.filter((c) => c.challenge_type === "1v1") || [];
  const squadChallenges = challenges?.filter((c) => c.challenge_type === "squad") || [];

  const handleTestWithBot1v1 = async (challengeId: string) => {
    setTestingBotId(challengeId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      // Get CodeNinja bot profile
      const { data: botProfile, error: botError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", "CodeNinja")
        .single();

      if (botError || !botProfile) {
        console.error("Bot profile error:", botError);
        toast({
          title: "Error",
          description: "Test bot not available. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      console.log("Creating 1v1 bot match:", { challengeId, userId: user.id, botId: botProfile.id });

      // Call edge function to create match
      const { data, error } = await supabase.functions.invoke("create-1v1-match", {
        body: {
          challengeId,
          user1Id: user.id,
          user2Id: botProfile.id,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      console.log("Match created:", data);

      toast({
        title: "Match Created!",
        description: "Your 1v1 bot match is ready",
      });

      // Navigate using the correct key from response
      navigate(`/challenge/${challengeId}/squad/${data.squadId}`);
    } catch (error) {
      console.error("Error creating bot match:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bot match",
        variant: "destructive",
      });
    } finally {
      setTestingBotId(null);
    }
  };

  const handleTestWithBotsSquad = async (challengeId: string) => {
    setTestingBotId(challengeId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      console.log("Creating squad bot match:", { userId: user.id, challengeId });

      const { data, error } = await supabase.functions.invoke("create-bot-squad-match", {
        body: {
          userId: user.id,
          challengeId,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      console.log("Squad match created:", data);

      toast({
        title: "Squad Match Created!",
        description: "Your 3v3 bot match is ready",
      });

      // FIXED: Use 'squadId' instead of 'userSquadId'
      const squadId = data.squadId || data.userSquadId;
      navigate(`/challenge/${challengeId}/squad/${squadId}`);
    } catch (error) {
      console.error("Error creating bot squad match:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bot squad match",
        variant: "destructive",
      });
    } finally {
      setTestingBotId(null);
    }
  };

  const handleFindOpponent = async (challengeId: string) => {
    setIsJoining(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      console.log("Finding 1v1 opponent:", { userId: user.id, challengeId });

      const { data, error } = await supabase.functions.invoke("find-1v1-opponent", {
        body: { userId: user.id, challengeId },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      console.log("Match response:", data);

      if (data.status === "matched") {
        toast({
          title: "Opponent Found!",
          description: "Starting your 1v1 match",
        });
        navigate(`/challenge/${challengeId}/squad/${data.squadId}`);
      } else {
        toast({
          title: "Searching...",
          description: "Looking for an opponent. This may take a moment.",
        });

        // IMPROVED: Use realtime subscription instead of polling
        const channel = supabase
          .channel(`match-queue-${user.id}-${challengeId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "match_queue",
              filter: `user_id=eq.${user.id}`,
            },
            async (payload) => {
              console.log("Queue updated:", payload);
              if (payload.new.status === "matched") {
                // Re-check with edge function to get squad info
                const { data: matchData } = await supabase.functions.invoke("find-1v1-opponent", {
                  body: { userId: user.id, challengeId },
                });

                if (matchData?.status === "matched") {
                  supabase.removeChannel(channel);
                  toast({
                    title: "Opponent Found!",
                    description: "Starting your 1v1 match",
                  });
                  navigate(`/challenge/${challengeId}/squad/${matchData.squadId}`);
                }
              }
            },
          )
          .subscribe();

        // Cleanup after 2 minutes
        setTimeout(() => {
          supabase.removeChannel(channel);
          toast({
            title: "Search Timeout",
            description: "No opponent found. Please try again.",
            variant: "destructive",
          });
          setIsJoining(false);
        }, 120000);
      }
    } catch (error) {
      console.error("Error finding opponent:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to find opponent",
        variant: "destructive",
      });
      setIsJoining(false);
    }
  };

  const handleJoinSquad = async (challengeId: string) => {
    setIsJoining(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      console.log("Joining squad:", { userId: user.id, challengeId });

      const { data, error } = await supabase.functions.invoke("match-squad", {
        body: {
          userId: user.id,
          challengeId,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      console.log("Squad joined:", data);

      toast({
        title: "Joined Squad!",
        description: "Finding your teammates...",
      });

      // IMPROVED: Subscribe to squad updates
      const channel = supabase
        .channel(`squad-${data.squadId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "squads",
            filter: `id=eq.${data.squadId}`,
          },
          (payload) => {
            console.log("Squad updated:", payload);
            if (payload.new.status === "active" && payload.new.opponent_squad_id) {
              supabase.removeChannel(channel);
              toast({
                title: "Squad Ready!",
                description: "Match starting now!",
              });
              navigate(`/challenge/${challengeId}/squad/${data.squadId}`);
            }
          },
        )
        .subscribe();

      // Navigate immediately (user can see squad forming in challenge room)
      navigate(`/challenge/${challengeId}/squad/${data.squadId}`);
    } catch (error) {
      console.error("Error joining squad:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join squad",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const getTimeUntil = (date: string) => {
    const start = new Date(date);
    const now = new Date();
    const diff = start.getTime() - now.getTime();

    if (diff < 0) return "Started";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days}d`;
    }

    return `Starts in ${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Challenges</h1>
          <p className="text-muted-foreground">Test your skills in 1v1 duels or team up for squad battles</p>
        </div>

        <Tabs defaultValue="1v1" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="1v1" className="flex items-center gap-2">
              <Swords className="w-4 h-4" />
              1v1 Duels
            </TabsTrigger>
            <TabsTrigger value="squad" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Squad Battles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="1v1" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Test with Bot Card */}
              <Card className="border-2 border-primary/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      Test Mode
                    </Badge>
                  </div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Test with a Bot
                  </CardTitle>
                  <CardDescription>Practice your skills against CodeNinja in an instant 1v1 match</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => duelChallenges[0] && handleTestWithBot1v1(duelChallenges[0].id)}
                    disabled={testingBotId !== null || !duelChallenges[0]}
                    className="w-full"
                  >
                    {testingBotId === duelChallenges[0]?.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Match...
                      </>
                    ) : (
                      "Start Bot Match"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Real 1v1 Challenges */}
              {duelChallenges.map((challenge) => (
                <Card key={challenge.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={challenge.status === "active" ? "default" : "secondary"}>
                        {challenge.status}
                      </Badge>
                      <Badge variant="outline">Level {challenge.difficulty_level}</Badge>
                    </div>
                    <CardTitle>{challenge.title}</CardTitle>
                    <CardDescription>{challenge.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Time Limit</span>
                        <span className="font-medium">{challenge.time_limit} min</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Starts</span>
                        <span className="font-medium">{getTimeUntil(challenge.starts_at)}</span>
                      </div>
                      <Button
                        onClick={() => handleFindOpponent(challenge.id)}
                        disabled={isJoining}
                        className="w-full"
                        variant="outline"
                      >
                        {isJoining ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Swords className="w-4 h-4 mr-2" />
                            Find Opponent
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="squad" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Test with Bots Card */}
              <Card className="border-2 border-primary/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      Test Mode
                    </Badge>
                  </div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Test with Bots
                  </CardTitle>
                  <CardDescription>Practice in a 3v3 match with AI teammates against AI opponents</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => squadChallenges[0] && handleTestWithBotsSquad(squadChallenges[0].id)}
                    disabled={testingBotId !== null || !squadChallenges[0]}
                    className="w-full"
                  >
                    {testingBotId === squadChallenges[0]?.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Match...
                      </>
                    ) : (
                      "Start Bot Match"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Real Squad Challenges */}
              {squadChallenges.map((challenge) => (
                <Card key={challenge.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={challenge.status === "active" ? "default" : "secondary"}>
                        {challenge.status}
                      </Badge>
                      <Badge variant="outline">Level {challenge.difficulty_level}</Badge>
                    </div>
                    <CardTitle>{challenge.title}</CardTitle>
                    <CardDescription>{challenge.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Squad Size</span>
                        <span className="font-medium">
                          {challenge.max_squad_size} vs {challenge.max_squad_size}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Time Limit</span>
                        <span className="font-medium">{challenge.time_limit} min</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Starts</span>
                        <span className="font-medium">{getTimeUntil(challenge.starts_at)}</span>
                      </div>
                      <Button onClick={() => handleJoinSquad(challenge.id)} disabled={isJoining} className="w-full">
                        {isJoining ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          "Join Squad"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Challenges;
