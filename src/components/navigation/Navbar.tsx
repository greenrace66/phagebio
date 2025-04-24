
import { Button } from "@/components/ui/button";
import { 
  Database, 
  FileText, 
  Search, 
  Settings 
} from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <div className="mr-3 relative w-8 h-8">
              <div className="absolute inset-0 bg-biostruct-500 rounded-full opacity-70 molecule-spinner"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-xl font-bold text-gradient">BioStruct</span>
          </a>

          <nav className="hidden md:flex ml-8">
            <ul className="flex space-x-6">
              {isLoggedIn && (
                <>
                  <li>
                    <a href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                      Dashboard
                    </a>
                  </li>
                  <li>
                    <a href="/projects" className="text-sm font-medium hover:text-primary transition-colors">
                      Projects
                    </a>
                  </li>
                  <li>
                    <a href="/tools" className="text-sm font-medium hover:text-primary transition-colors">
                      Tools
                    </a>
                  </li>
                </>
              )}
              <li>
                <a href="/about" className="text-sm font-medium hover:text-primary transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="/pricing" className="text-sm font-medium hover:text-primary transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
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
              <Button variant="ghost" onClick={() => setIsLoggedIn(true)}>
                Log in
              </Button>
              <Button onClick={() => setIsLoggedIn(true)}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
