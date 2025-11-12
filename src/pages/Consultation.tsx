import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send, Image as ImageIcon, Loader2, LogOut, Home } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string;
  created_at: string;
}

const Consultation = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await createOrLoadConversation(session.user.id);
  };

  const createOrLoadConversation = async (userId: string) => {
    try {
      // Check for existing conversation
      const { data: existingConversations, error: fetchError } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let convId: string;

      if (existingConversations && existingConversations.length > 0) {
        convId = existingConversations[0].id;
      } else {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert({ user_id: userId, title: "การปรึกษาใหม่" })
          .select()
          .single();

        if (createError) throw createError;
        convId = newConv.id;
      }

      setConversationId(convId);
      await loadMessages(convId);
    } catch (error: any) {
      console.error("Error loading conversation:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดบทสนทนาได้",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error: any) {
      console.error("Error loading messages:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('face-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('face-images')
        .getPublicUrl(filePath);

      // Add user message with image
      const userMsg = {
        conversation_id: conversationId,
        role: "user" as const,
        content: "ผมส่งรูปมาให้ดูครับ กรุณาวิเคราะห์และให้คำแนะนำหน่อยครับ",
        image_url: data.publicUrl,
      };

      const { data: savedMsg, error: saveError } = await supabase
        .from("messages")
        .insert(userMsg)
        .select()
        .single();

      if (saveError) throw saveError;

      setMessages(prev => [...prev, savedMsg as Message]);
      await sendToAI([...messages, savedMsg as Message]);

    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปโหลดรูปภาพได้",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const sendToAI = async (currentMessages: Message[]) => {
    if (!conversationId) return;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('ai-consultation', {
        body: {
          messages: currentMessages.map(m => ({
            role: m.role,
            content: m.content,
            image_url: m.image_url,
          })),
          conversationId,
        },
      });

      if (error) throw error;

      // Save AI response
      const aiMsg = {
        conversation_id: conversationId,
        role: "assistant" as const,
        content: data.response,
      };

      const { data: savedAiMsg, error: saveError } = await supabase
        .from("messages")
        .insert(aiMsg)
        .select()
        .single();

      if (saveError) throw saveError;

      setMessages(prev => [...prev, savedAiMsg as Message]);

    } catch (error: any) {
      console.error("Error calling AI:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถส่งข้อความได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId || loading) return;

    const userMsg = {
      conversation_id: conversationId,
      role: "user" as const,
      content: input.trim(),
    };

    try {
      const { data: savedMsg, error } = await supabase
        .from("messages")
        .insert(userMsg)
        .select()
        .single();

      if (error) throw error;

      const newMessages = [...messages, savedMsg as Message];
      setMessages(newMessages);
      setInput("");

      await sendToAI(newMessages);

    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความได้",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold truncate">ปรึกษาศัลยกรรม AI</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">ถามคำถามเกี่ยวกับศัลยกรรมได้ทุกเรื่อง</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="h-8 md:h-9">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">หน้าแรก</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8 md:h-9">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">ออกจากระบบ</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-2 md:p-4">
        <div className="container mx-auto max-w-3xl space-y-3 md:space-y-4">
          {messages.length === 0 && (
            <Card className="p-4 md:p-8 text-center">
              <MessageCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 text-primary opacity-50" />
              <h2 className="text-base md:text-lg font-semibold mb-2">ยินดีต้อนรับสู่การปรึกษาศัลยกรรม AI</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                คุณสามารถถามคำถามหรือส่งรูปใบหน้าเพื่อรับคำปรึกษา
              </p>
              <div className="text-xs md:text-sm text-muted-foreground text-left max-w-md mx-auto space-y-1 md:space-y-2">
                <p>• วิเคราะห์ใบหน้าและแนะนำศัลยกรรมที่เหมาะสม</p>
                <p>• อธิบายหัตถการต่างๆ เช่น ฟิลเลอร์ โบท็อกซ์</p>
                <p>• แนะนำการดูแลและผลิตภัณฑ์</p>
              </div>
            </Card>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 md:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Avatar className="h-7 w-7 md:h-8 md:w-8 shrink-0">
                <AvatarFallback className={msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </AvatarFallback>
              </Avatar>
              <Card className={`max-w-[85%] md:max-w-[80%] p-2.5 md:p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                {msg.image_url && (
                  <img
                    src={msg.image_url}
                    alt="Uploaded"
                    className="rounded-lg mb-2 max-w-full"
                  />
                )}
                <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed">{msg.content}</p>
              </Card>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-secondary">AI</AvatarFallback>
              </Avatar>
              <Card className="p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card">
        <div className="container mx-auto max-w-3xl p-3 md:p-4">
          <div className="flex gap-1.5 md:gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploading}
              className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />}
            </Button>
            <Input
              placeholder="พิมพ์ข้อความ..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={loading}
              className="flex-1 h-9 md:h-10 text-sm md:text-base"
            />
            <Button 
              onClick={handleSend} 
              disabled={loading || !input.trim()}
              className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0"
              size="icon"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" /> : <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultation;