
import { Button } from "@/components/ui/button";
import { 
  Database, 
  FileText, 
  Search, 
  Settings,
  LogIn
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
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
              {isLoggedIn && (
                <>
                  <li>
                    <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/projects" className="text-sm font-medium hover:text-primary transition-colors">
                      Projects
                    </Link>
                  </li>
                  <li>
                    <Link to="/tools" className="text-sm font-medium hover:text-primary transition-colors">
                      Tools
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">
                  About
                </Link>
              </li>
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
            </ul>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          {isLoggedIn ? (
            <>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <FileText className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Database className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-biostruct-200 flex items-center justify-center">
                <span className="text-sm font-medium text-biostruct-800">US</span>
              </div>
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
