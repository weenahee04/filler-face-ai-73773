import { Button } from "@/components/ui/button";
import { Menu, MessageCircle, LogOut, User, UserCircle, Clock, Sparkles, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
const profileSchema = z.object({
  full_name: z.string().trim().min(1, {
    message: "กรุณากรอกชื่อ"
  }).max(100, {
    message: "ชื่อต้องไม่เกิน 100 ตัวอักษร"
  }).regex(/^[a-zA-Zก-๙\s]+$/, {
    message: "ชื่อต้องเป็นตัวอักษรเท่านั้น"
  })
});
export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const openEditDialog = () => {
    setFullName(user?.user_metadata?.full_name || "");
    setError("");
    setEditDialogOpen(true);
  };
  const handleUpdateProfile = async () => {
    setError("");
    try {
      // Validate input
      const result = profileSchema.safeParse({
        full_name: fullName
      });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
      setLoading(true);

      // Update auth metadata
      const {
        error: authError
      } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim()
        }
      });
      if (authError) throw authError;

      // Update profiles table
      const {
        error: profileError
      } = await supabase.from("profiles").update({
        full_name: fullName.trim()
      }).eq("id", user.id);
      if (profileError) throw profileError;
      toast({
        title: "✅ อัปเดตสำเร็จ!",
        description: "ชื่อของคุณถูกเปลี่ยนแปลงแล้ว"
      });
      setEditDialogOpen(false);

      // Refresh session to get updated metadata
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถอัปเดตโปรไฟล์ได้",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return user?.email?.split('@')[0] || 'ผู้ใช้';
  };
  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };
  return <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
            Polaai
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-3">
            <Button variant="ghost" onClick={() => navigate("/forum")} className="text-sm font-medium px-3">
              <Users className="w-4 h-4 lg:mr-2" />
              <span className="hidden xl:inline">Forum</span>
            </Button>

            <Button variant="ghost" onClick={() => navigate("/consultation")} className="text-sm font-medium px-3">
              <MessageCircle className="w-4 h-4 lg:mr-2" />
              <span className="hidden xl:inline">ปรึกษา AI</span>
            </Button>

            <Button variant="ghost" onClick={() => navigate("/age-progression")} className="text-sm font-medium px-3">
              <Clock className="w-4 h-4 lg:mr-2" />
              <span className="hidden xl:inline">ดูหน้าในอนาคต</span>
            </Button>

            <Button variant="ghost" onClick={() => navigate("/skin-analysis")} className="text-sm font-medium px-3">
              <Sparkles className="w-4 h-4 lg:mr-2" />
              <span className="hidden xl:inline">วิเคราะห์ผิวหน้า</span>
            </Button>
            
            {user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 ml-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium hidden xl:inline">{getUserDisplayName()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg z-50">
                  <DropdownMenuLabel>บัญชีของฉัน</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openEditDialog}>
                    <UserCircle className="w-4 h-4 mr-2" />
                    แก้ไขโปรไฟล์
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> : <Button variant="outline" onClick={() => navigate("/auth")} className="text-sm font-medium ml-2">
                เข้าสู่ระบบ
              </Button>}
          </nav>

          {/* Mobile Menu Button */}
          <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="w-6 h-6 text-foreground" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && <nav className="lg:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {user && <div className="flex items-center gap-3 px-3 py-2 bg-accent rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>}

              <Button variant="ghost" onClick={() => {
            navigate("/forum");
            setMobileMenuOpen(false);
          }} className="text-sm font-medium justify-start">
                <Users className="w-4 h-4 mr-2" />
                Forum
              </Button>

              <Button variant="ghost" onClick={() => {
            navigate("/consultation");
            setMobileMenuOpen(false);
          }} className="text-sm font-medium justify-start">
                <MessageCircle className="w-4 h-4 mr-2" />
                ปรึกษา AI
              </Button>

              <Button variant="ghost" onClick={() => {
            navigate("/age-progression");
            setMobileMenuOpen(false);
          }} className="text-sm font-medium justify-start">
                <Clock className="w-4 h-4 mr-2" />
                ดูหน้าในอนาคต
              </Button>

              <Button variant="ghost" onClick={() => {
            navigate("/skin-analysis");
            setMobileMenuOpen(false);
          }} className="text-sm font-medium justify-start">
                <Sparkles className="w-4 h-4 mr-2" />
                วิเคราะห์ผิวหน้า
              </Button>

              {user ? <>
                  <Button variant="ghost" onClick={() => {
              openEditDialog();
              setMobileMenuOpen(false);
            }} className="text-sm font-medium justify-start">
                    <UserCircle className="w-4 h-4 mr-2" />
                    แก้ไขโปรไฟล์
                  </Button>
                  <Button variant="outline" onClick={() => {
              handleSignOut();
              setMobileMenuOpen(false);
            }} className="text-sm font-medium text-destructive justify-start">
                    <LogOut className="w-4 h-4 mr-2" />
                    ออกจากระบบ
                  </Button>
                </> : <Button variant="outline" onClick={() => {
            navigate("/auth");
            setMobileMenuOpen(false);
          }} className="text-sm font-medium">
                  เข้าสู่ระบบ
                </Button>}
            </div>
          </nav>}
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขโปรไฟล์</DialogTitle>
            <DialogDescription>
              เปลี่ยนชื่อของคุณที่นี่
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">ชื่อ-นามสกุล</Label>
              <Input id="fullname" placeholder="กรอกชื่อของคุณ" value={fullName} onChange={e => {
              setFullName(e.target.value);
              setError("");
            }} disabled={loading} maxLength={100} />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button onClick={handleUpdateProfile} disabled={loading}>
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>;
};