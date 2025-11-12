import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Heart, MessageSquare, Eye, Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { z } from "zod";

interface Post {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  views_count: number;
  created_at: string;
  user_id: string;
  forum_categories: { name: string };
  profiles: { full_name: string | null } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string | null } | null;
}

const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "กรุณาเขียนความคิดเห็น" })
    .max(1000, { message: "ความคิดเห็นต้องไม่เกิน 1000 ตัวอักษร" }),
});

const ForumPost = () => {
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    if (id) {
      loadPost();
      loadComments();
      loadLikes();
      incrementViews();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from("forum_posts")
        .select(`
          *,
          forum_categories(name),
          profiles(full_name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (error: any) {
      console.error("Error loading post:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดโพสต์ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from("forum_comments")
        .select(`
          *,
          profiles(full_name)
        `)
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Error loading comments:", error);
    }
  };

  const loadLikes = async () => {
    try {
      const { count, error } = await supabase
        .from("forum_likes")
        .select("id", { count: "exact", head: true })
        .eq("post_id", id);

      if (error) throw error;
      setLikesCount(count || 0);

      if (user) {
        const { data } = await supabase
          .from("forum_likes")
          .select("id")
          .eq("post_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        setIsLiked(!!data);
      }
    } catch (error: any) {
      console.error("Error loading likes:", error);
    }
  };

  const incrementViews = async () => {
    try {
      const { data: currentPost } = await supabase
        .from("forum_posts")
        .select("views_count")
        .eq("id", id)
        .single();

      if (currentPost) {
        await supabase
          .from("forum_posts")
          .update({ views_count: currentPost.views_count + 1 })
          .eq("id", id);
      }
    } catch (error) {
      console.error("Error incrementing views:", error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนกดถูกใจ",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from("forum_likes")
          .delete()
          .eq("post_id", id)
          .eq("user_id", user.id);

        setLikesCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        await supabase
          .from("forum_likes")
          .insert({
            post_id: id,
            user_id: user.id,
          });

        setLikesCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error: any) {
      console.error("Error toggling like:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถกดถูกใจได้",
        variant: "destructive",
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนแสดงความคิดเห็น",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setError("");

    const result = commentSchema.safeParse({ content: newComment.trim() });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("forum_comments")
        .insert({
          post_id: id,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      toast({
        title: "✅ แสดงความคิดเห็นสำเร็จ",
      });

      setNewComment("");
      loadComments();
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแสดงความคิดเห็นได้",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">ไม่พบโพสต์</h3>
            <p className="text-muted-foreground mb-4">โพสต์นี้อาจถูกลบหรือไม่มีอยู่จริง</p>
            <Button onClick={() => navigate("/forum")}>กลับไปฟอรัม</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Header />
      
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <Button
          onClick={() => navigate("/forum")}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับไปฟอรัม
        </Button>

        {/* Post Content */}
        <Card className="p-4 md:p-6 mb-6">
          <Badge variant="secondary" className="mb-3">
            {post.forum_categories.name}
          </Badge>

          <h1 className="text-2xl md:text-3xl font-bold mb-4">{post.title}</h1>

          <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary/10">
                  {(post.profiles?.full_name || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span>{post.profiles?.full_name || "ไม่ระบุชื่อ"}</span>
            </div>
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: th,
              })}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.views_count} ครั้ง
            </span>
          </div>

          {post.image_url && (
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full rounded-lg mb-4 max-h-96 object-cover"
            />
          )}

          <p className="text-base whitespace-pre-wrap mb-6">{post.content}</p>

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              variant={isLiked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
              className="gap-2"
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              {likesCount} ถูกใจ
            </Button>

            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              {comments.length} ความคิดเห็น
            </div>
          </div>
        </Card>

        {/* Comments Section */}
        <Card className="p-4 md:p-6">
          <h2 className="text-xl font-bold mb-4">ความคิดเห็น ({comments.length})</h2>

          {/* Comment Form */}
          <div className="mb-6">
            <Textarea
              placeholder={user ? "แสดงความคิดเห็น..." : "กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!user || submitting}
              rows={3}
              maxLength={1000}
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {newComment.length}/1000 ตัวอักษร
              </p>
              <Button
                onClick={handleSubmitComment}
                disabled={!user || !newComment.trim() || submitting}
                size="sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    ส่งความคิดเห็น
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border-l-2 border-primary/20 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs bg-primary/10">
                        {(comment.profiles?.full_name || "U").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {comment.profiles?.full_name || "ไม่ระบุชื่อ"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: th,
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForumPost;
