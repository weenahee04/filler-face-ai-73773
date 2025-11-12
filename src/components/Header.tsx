import { Button } from "@/components/ui/button";
import { Menu, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
            Pola <span className="text-primary">ai</span>.
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost"
              onClick={() => navigate("/consultation")}
              className="text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              ปรึกษา AI
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-sm font-medium"
            >
              เข้าสู่ระบบ
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
              <Button 
                variant="ghost"
                onClick={() => {
                  navigate("/consultation");
                  setMobileMenuOpen(false);
                }}
                className="text-sm font-medium justify-start"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                ปรึกษา AI
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  navigate("/auth");
                  setMobileMenuOpen(false);
                }}
                className="text-sm font-medium"
              >
                เข้าสู่ระบบ
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
