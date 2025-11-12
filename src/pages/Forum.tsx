import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MessageSquare, Heart, Eye, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  views_count: number;
  created_at: string;
  user_id: string;
  category_id: string;
  forum_categories: { name: string };
  profiles: { full_name: string | null };
  comments_count?: number;
  likes_count?: number;
}

const Forum = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadCategories();
    loadPosts();
  }, [selectedCategory]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error loading categories:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดหมวดหมู่ได้",
        variant: "destructive",
      });
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("forum_posts")
        .select(`
          *,
          forum_categories(name),
          profiles(full_name)
        `)
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      const { data: postsData, error } = await query;

      if (error) throw error;

      // Get comments and likes count for each post
      const postsWithCounts = await Promise.all(
        (postsData || []).map(async (post) => {
          const [commentsResult, likesResult] = await Promise.all([
            supabase
              .from("forum_comments")
              .select("id", { count: "exact", head: true })
              .eq("post_id", post.id),
            supabase
              .from("forum_likes")
              .select("id", { count: "exact", head: true })
              .eq("post_id", post.id),
          ]);

          return {
            ...post,
            comments_count: commentsResult.count || 0,
            likes_count: likesResult.count || 0,
          };
        })
      );

      setPosts(postsWithCounts);
    } catch (error: any) {
      console.error("Error loading posts:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดโพสต์ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = () => {
    if (!user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนสร้างโพสต์",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    navigate("/forum/create");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Header />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">💬 Community Forum</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              พูดคุย แชร์ประสบการณ์ และเรียนรู้เกี่ยวกับความงามและศัลยกรรม
            </p>
          </div>
          <Button onClick={handleCreatePost} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">สร้างโพสต์</span>
          </Button>
        </div>

        {/* Categories */}
        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-transparent">
            <TabsTrigger
              value="all"
              onClick={() => setSelectedCategory("all")}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              ทั้งหมด
            </TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">กำลังโหลดโพสต์...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <MessageSquare className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg md:text-xl font-semibold mb-2">ยังไม่มีโพสต์</h3>
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              เป็นคนแรกที่สร้างโพสต์ในหมวดนี้!
            </p>
            <Button onClick={handleCreatePost} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              สร้างโพสต์แรก
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="p-4 md:p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/forum/post/${post.id}`)}
              >
                <div className="flex gap-3 md:gap-4">
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-16 h-16 md:w-24 md:h-24 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-base md:text-lg mb-1 line-clamp-2">
                          {post.title}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {post.forum_categories.name}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {post.content}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs md:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-xs bg-primary/10">
                            {(post.profiles.full_name || "U").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{post.profiles.full_name || "ไม่ระบุชื่อ"}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: th,
                        })}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.views_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {post.comments_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {post.likes_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Forum;
