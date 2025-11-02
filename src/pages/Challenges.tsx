import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Zap, Users, Bot, Swords, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";

const Challenges = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [testingBotId, setTestingBotId] = useState<string | null>(null);
  const [matchingDialogOpen, setMatchingDialogOpen] = useState(false);
  const [matchingType, setMatchingType] = useState<"1v1" | "squad" | null>(null);
  const [squadMembers, setSquadMembers] = useState<any[]>([]);
  const [opponentSquad, setOpponentSquad] = useState<any[]>([]);

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

      toast({
        title: "Match Created!",
        description: "Your 1v1 bot match is ready",
      });

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

      toast({
        title: "Squad Match Created!",
        description: "Your 3v3 bot match is ready",
      });

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
    setMatchingType("1v1");
    setMatchingDialogOpen(true);

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
        setMatchingDialogOpen(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("find-1v1-opponent", {
        body: { userId: user.id, challengeId },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data.status === "matched") {
        setMatchingDialogOpen(false);
        toast({
          title: "Opponent Found!",
          description: "Starting your 1v1 match",
        });
        navigate(`/challenge/${challengeId}/squad/${data.squadId}`);
      } else {
        // Subscribe to queue updates for real-time matching
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
              if (payload.new.status === "matched") {
                const { data: matchData } = await supabase.functions.invoke("find-1v1-opponent", {
                  body: { userId: user.id, challengeId },
                });

                if (matchData?.status === "matched") {
                  supabase.removeChannel(channel);
                  setMatchingDialogOpen(false);
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

        // Timeout after 2 minutes
        setTimeout(() => {
          supabase.removeChannel(channel);
          setMatchingDialogOpen(false);
          setIsJoining(false);
        }, 120000);
      }
    } catch (error) {
      console.error("Error finding opponent:", error);
      setMatchingDialogOpen(false);
      toast({
        title: "No Active Players",
        description: "No opponents available right now. Try bot mode or come back later!",
        variant: "destructive",
      });
      setIsJoining(false);
    }
  };

  const handleJoinSquad = async (challengeId: string) => {
    setIsJoining(true);
    setMatchingType("squad");
    setMatchingDialogOpen(true);
    setSquadMembers([]);
    setOpponentSquad([]);

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
        setMatchingDialogOpen(false);
        return;
      }

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

      // Get current user profile
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .single();

      setSquadMembers([
        {
          username: userProfile?.username || "You",
          display_name: userProfile?.display_name || "You",
        },
      ]);

      // Subscribe to squad member changes
      const membersChannel = supabase
        .channel(`squad-members-${data.squadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "squad_members",
            filter: `squad_id=eq.${data.squadId}`,
          },
          async () => {
            const { data: members } = await supabase
              .from("squad_members")
              .select("profiles(username, display_name)")
              .eq("squad_id", data.squadId);

            setSquadMembers(members?.map((m) => m.profiles) || []);
          },
        )
        .subscribe();

      // Subscribe to squad updates (for matching)
      const squadChannel = supabase
        .channel(`squad-${data.squadId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "squads",
            filter: `id=eq.${data.squadId}`,
          },
          async (payload) => {
            if (payload.new.status === "active" && payload.new.opponent_squad_id) {
              // Get opponent squad members
              const { data: opponentMembers } = await supabase
                .from("squad_members")
                .select("profiles(username, display_name)")
                .eq("squad_id", payload.new.opponent_squad_id);

              setOpponentSquad(opponentMembers?.map((m) => m.profiles) || []);

              // Wait a moment to show the match, then navigate
              setTimeout(() => {
                supabase.removeChannel(membersChannel);
                supabase.removeChannel(squadChannel);
                setMatchingDialogOpen(false);
                toast({
                  title: "Squad Ready!",
                  description: "Match starting now!",
                });
                navigate(`/challenge/${challengeId}/squad/${data.squadId}`);
              }, 2000);
            }
          },
        )
        .subscribe();

      // Timeout after 3 minutes
      setTimeout(() => {
        supabase.removeChannel(membersChannel);
        supabase.removeChannel(squadChannel);
        setMatchingDialogOpen(false);
        setIsJoining(false);
      }, 180000);
    } catch (error) {
      console.error("Error joining squad:", error);
      setMatchingDialogOpen(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join squad",
        variant: "destructive",
      });
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

        {/* Matching Dialog */}
        <Dialog open={matchingDialogOpen} onOpenChange={setMatchingDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{matchingType === "1v1" ? "Finding Opponent..." : "Forming Squad..."}</DialogTitle>
              <DialogDescription>
                {matchingType === "1v1"
                  ? "Searching for an opponent. This may take a moment."
                  : "Finding teammates and opponents for your squad battle."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              {matchingType === "1v1" ? (
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium">You</p>
                  </div>

                  <Loader2 className="w-8 h-8 animate-spin text-primary" />

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Searching...</p>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-6">
                  {/* Your Squad */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <h3 className="font-semibold text-blue-500">Your Squad</h3>
                    </div>
                    <div className="space-y-2">
                      {[0, 1, 2].map((idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2 rounded bg-blue-500/10 border border-blue-500/20"
                        >
                          {squadMembers[idx] ? (
                            <>
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                                {squadMembers[idx].username[0].toUpperCase()}
                              </div>
                              <span className="text-sm">
                                {squadMembers[idx].display_name || squadMembers[idx].username}
                              </span>
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                              <span className="text-sm text-muted-foreground">Searching...</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="flex items-center justify-center">
                    <div className="flex-1 border-t border-border"></div>
                    <span className="px-4 text-sm font-bold text-muted-foreground">VS</span>
                    <div className="flex-1 border-t border-border"></div>
                  </div>

                  {/* Opponent Squad */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <h3 className="font-semibold text-red-500">Opponent Squad</h3>
                    </div>
                    <div className="space-y-2">
                      {[0, 1, 2].map((idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2 rounded bg-red-500/10 border border-red-500/20"
                        >
                          {opponentSquad[idx] ? (
                            <>
                              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm">
                                {opponentSquad[idx].username[0].toUpperCase()}
                              </div>
                              <span className="text-sm">
                                {opponentSquad[idx].display_name || opponentSquad[idx].username}
                              </span>
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                              <span className="text-sm text-muted-foreground">Searching...</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setMatchingDialogOpen(false);
                  setIsJoining(false);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
              {duelChallenges.length > 0 && (
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
                      onClick={() => handleTestWithBot1v1(duelChallenges[0].id)}
                      disabled={testingBotId !== null}
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
              )}

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
                        <Swords className="w-4 h-4 mr-2" />
                        Find Opponent
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Empty state */}
              {duelChallenges.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <Swords className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No 1v1 Challenges Available</h3>
                  <p className="text-muted-foreground">Check back soon for new challenges!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="squad" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Test with Bots Card */}
              {squadChallenges.length > 0 && (
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
                      onClick={() => handleTestWithBotsSquad(squadChallenges[0].id)}
                      disabled={testingBotId !== null}
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
              )}

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
                        Join Squad
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Empty state */}
              {squadChallenges.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Squad Challenges Available</h3>
                  <p className="text-muted-foreground">Check back soon for new challenges!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Challenges;
