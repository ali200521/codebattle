import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Trophy, Users, BookOpen, Zap, LogOut, Target, 
  Award, TrendingUp, Code2, Sparkles 
} from "lucide-react";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  total_xp: number;
  current_level: number;
}

interface SkillArea {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skillAreas, setSkillAreas] = useState<SkillArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist, redirect to onboarding
        navigate("/onboarding");
        return;
      }

      setProfile(profileData);

      // Fetch skill areas
      const { data: areasData } = await supabase
        .from("skill_areas")
        .select("*")
        .order("name");

      setSkillAreas(areasData || []);
    } catch (error: any) {
      toast.error("Failed to load dashboard data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Logged out successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-glow-pulse">
          <Code2 className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  const xpToNextLevel = profile ? (profile.current_level * 1000) : 1000;
  const xpProgress = profile ? (profile.total_xp % 1000) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Code2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">CodeBattle Arena</h1>
              <p className="text-xs text-muted-foreground">Welcome, {profile?.username}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-primary/20 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="text-3xl font-bold text-primary">{profile?.current_level}</p>
                </div>
                <Trophy className="w-10 h-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total XP</p>
                  <p className="text-3xl font-bold text-secondary">{profile?.total_xp}</p>
                </div>
                <Zap className="w-10 h-10 text-secondary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Achievements</p>
                  <p className="text-3xl font-bold text-accent">12</p>
                </div>
                <Award className="w-10 h-10 text-accent opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Challenges</p>
                  <p className="text-3xl font-bold text-primary">8</p>
                </div>
                <Target className="w-10 h-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level Progress */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Level Progress
            </CardTitle>
            <CardDescription>
              {xpToNextLevel - xpProgress} XP to Level {(profile?.current_level || 1) + 1}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={(xpProgress / xpToNextLevel) * 100} className="h-3" />
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="areas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="areas">Skill Areas</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="areas" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Choose Your Path</h2>
              <Button variant="outline" onClick={() => navigate("/onboarding")}>
                <Sparkles className="w-4 h-4" />
                Take Assessment
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skillAreas.map((area) => (
                <Card 
                  key={area.id} 
                  className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
                  onClick={() => navigate(`/learn/${area.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{area.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{area.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">0 / 12 Classes</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{area.description}</p>
                    <Button variant="hero" className="w-full mt-4" onClick={() => navigate('/quizzes')}>
                      <BookOpen className="w-4 h-4" />
                      Start Learning
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Active Challenges</h2>
              <Button variant="challenge" onClick={() => navigate('/challenges')}>
                <Users className="w-4 h-4" />
                Find Squad
              </Button>
            </div>
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
                  <p className="text-muted-foreground mb-6">
                    Complete your skill assessment to get matched with squads
                  </p>
                  <Button variant="challenge" onClick={() => navigate("/onboarding")}>
                    Get Started
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <h2 className="text-2xl font-bold">Top Performers</h2>
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Leaderboard Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Complete challenges to see your ranking
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
