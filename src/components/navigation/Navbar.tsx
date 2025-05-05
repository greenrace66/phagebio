import { Button } from "@/components/ui/button";
import { 
  Database as DatabaseIcon,
  FileText, 
  Search, 
  Settings,
  LogIn,
  LogOut
} from "lucide-react";
// import type { Database } from "@/integrations/supabase/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [initials, setInitials] = useState("");
  const [credits, setCredits] = useState<number>(0);
  
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      const fullName = user.user_metadata.full_name as string;
      const parts = fullName.split(' ');
      let userInitials = '';
      
      if (parts.length >= 2) {
        userInitials = parts[0][0] + parts[1][0];
      } else if (parts.length === 1 && parts[0]) {
        userInitials = parts[0][0];
      }
      
      setInitials(userInitials.toUpperCase());
    } else if (user?.email) {
      setInitials(user.email.substring(0, 2).toUpperCase());
    }
  }, [user]);

  // Fetch and renew credits daily
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("credits, credits_updated_at")
        .eq("id", user.id)
        .single();
      if (error || !profile) return console.error("Profile fetch error:", error);
      const now = new Date();
      const last = new Date(profile.credits_updated_at);
      let currentCredits = profile.credits;
      if (last.toDateString() !== now.toDateString()) {
        await supabase
          .from("profiles")
          .update({ credits: 10, credits_updated_at: now.toISOString() })
          .eq("id", user.id);
        currentCredits = 10;
      }
      setCredits(currentCredits);
    })();
  }, [user]);
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <div className="mr-3 relative w-8 h-8">
              <div className="absolute inset-0 bg-biostruct-500 rounded-full opacity-70 molecule-spinner"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-white dark:bg-black rounded-full"></div>
              </div>
            </div>
            <span className="text-xl font-bold text-gradient">BioStruct</span>
          </Link>

          <nav className="hidden md:flex ml-8">
            <ul className="flex space-x-6">
              <li>
                <Link to="/pricing" className="text-sm font-medium hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/models" className="text-sm font-medium hover:text-primary transition-colors">
                  Models
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="text-sm font-medium hover:text-primary transition-colors">
                  Jobs
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium">Credits: {credits}</div>
          <ThemeToggle />
          
          {user ? (
            <>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <FileText className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <DatabaseIcon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Settings className="h-5 w-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account">Account settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">
                  <LogIn className="mr-2 h-4 w-4" />
                  Log in
                </Button>
              </Link>
              <Link to="/login?tab=signup">
                <Button>
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
