import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, Home, BookOpen, Trophy, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
                <Code2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold hidden sm:block">CodeBattle Arena</h1>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <Button
                variant={isActive('/dashboard') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button
                variant={isActive('/quizzes') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/quizzes')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Quizzes
              </Button>
              <Button
                variant={isActive('/challenges') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/challenges')}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Challenges
              </Button>
            </nav>
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Logout</span>
          </Button>
        </div>

        {/* Mobile nav */}
        <nav className="flex md:hidden items-center gap-2 mt-4">
          <Button
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex-1"
          >
            <Home className="w-4 h-4" />
          </Button>
          <Button
            variant={isActive('/quizzes') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/quizzes')}
            className="flex-1"
          >
            <BookOpen className="w-4 h-4" />
          </Button>
          <Button
            variant={isActive('/challenges') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate('/challenges')}
            className="flex-1"
          >
            <Trophy className="w-4 h-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
