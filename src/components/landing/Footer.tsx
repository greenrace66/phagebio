
import { Button } from "@/components/ui/button";
import { Twitter, Github, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-muted py-12">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="mr-3 relative w-7 h-7">
                <div className="absolute inset-0 bg-Phage-500 rounded-full opacity-70"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 bg-white rounded-full"></div>
                </div>
              </div>
              <span className="text-xl font-bold text-gradient">Phage</span>
            </div>
            <p className="text-muted-foreground max-w-xs">
              Making structural computational biology accessible to researchers worldwide.
            </p>
            <div className="mt-4 flex gap-4">
              <Button variant="ghost" size="icon" asChild>
                <a href="https://twitter.com/bionikil" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </a>
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link to="/tutorials" className="text-muted-foreground hover:text-foreground transition-colors"></Link></li>
              <li><Link to="/changelog" className="text-muted-foreground hover:text-foreground transition-colors"></Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/careers" className="text-muted-foreground hover:text-foreground transition-colors"></Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors"></Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-4 border-t border-border flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© 2025 Phage. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="/terms" className="hover:text-foreground transition-colors"></Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors"></Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors"></Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
