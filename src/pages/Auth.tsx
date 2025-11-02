import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Code2, Trophy, Users } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        // Provide more specific error messages
        if (error.message.includes("Email not confirmed")) {
          throw new Error("Please confirm your email address before signing in. Check your inbox for the confirmation link.");
        }
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please check your credentials and try again.");
        }
        throw error;
      }

      if (!data.session) {
        throw new Error("Login failed. Please try again.");
      }

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            username: signupUsername,
            display_name: signupUsername,
          }
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Check if email confirmation is required
      if (authData.session) {
        // User is authenticated immediately (email confirmation disabled)
        // Profile should be created by database trigger, but create as fallback
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            username: signupUsername,
            display_name: signupUsername,
          });

        // Ignore error if profile already exists (created by trigger)
        if (profileError && profileError.code !== '23505') {
          console.error("Profile creation error:", profileError);
          // Don't throw - profile might have been created by trigger
        }

        toast.success("Account created! Redirecting to onboarding...");
        navigate("/onboarding");
      } else {
        // Email confirmation is required
        // Profile will be created by database trigger when user confirms email
        toast.success(
          "Account created! Please check your email to confirm your account before signing in.",
          { duration: 6000 }
        );
        // Clear form
        setSignupEmail("");
        setSignupPassword("");
        setSignupUsername("");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden md:block space-y-6 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            CodeBattle Arena
          </h1>
          <p className="text-xl text-muted-foreground">
            Level up your coding skills through squad-based challenges
          </p>
          
          <div className="space-y-4 pt-8">
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-sm">
              <Code2 className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">Learn by Doing</h3>
                <p className="text-sm text-muted-foreground">Interactive classes and quizzes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-sm">
              <Users className="w-8 h-8 text-secondary" />
              <div>
                <h3 className="font-semibold">Squad Challenges</h3>
                <p className="text-sm text-muted-foreground">Collaborate and compete in teams</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-sm">
              <Trophy className="w-8 h-8 text-accent" />
              <div>
                <h3 className="font-semibold">Rank & Achieve</h3>
                <p className="text-sm text-muted-foreground">Track your progress and climb leaderboards</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <Card className="w-full shadow-xl animate-scale-in">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Login or create an account to start your journey</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="your_username"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading} variant="hero">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
