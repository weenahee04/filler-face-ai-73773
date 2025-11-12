import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
            Pola <span className="text-primary">ai</span>.
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              AI TOOLS
            </Link>
            <Link 
              to="/" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              PORTFOLIO
            </Link>
            <Button 
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full px-6"
            >
              LET'S TALK
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <Link 
                to="/" 
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                AI TOOLS
              </Link>
              <Link 
                to="/" 
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                PORTFOLIO
              </Link>
              <Button 
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                LET'S TALK
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
