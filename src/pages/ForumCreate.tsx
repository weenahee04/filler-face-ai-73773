import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

interface Category {
  id: string;
  name: string;
}

const postSchema = z.object({
  title: z.string()
    .trim()
    .min(5, { message: "หัวข้อต้องมีอย่างน้อย 5 ตัวอักษร" })
    .max(200, { message: "หัวข้อต้องไม่เกิน 200 ตัวอักษร" }),
  content: z.string()
    .trim()
    .min(10, { message: "เนื้อหาต้องมีอย่างน้อย 10 ตัวอักษร" })
    .max(5000, { message: "เนื้อหาต้องไม่เกิน 5000 ตัวอักษร" }),
  category_id: z.string().min(1, { message: "กรุณาเลือกหมวดหมู่" }),
});

const ForumCreate = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadCategories();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนสร้างโพสต์",
        variant: "destructive",
      });
      navigate("/auth");
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("id, name")
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "กรุณาเลือกรูปภาพที่มีขนาดไม่เกิน 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async () => {
    setErrors({});

    // Validate input
    const result = postSchema.safeParse({
      title: title.trim(),
      content: content.trim(),
      category_id: categoryId,
    });

    if (!result.success) {
      const newErrors: { [key: string]: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }

      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `forum/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("face-images")
          .upload(filePath, selectedImage);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("face-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      // Create post
      const { error: postError } = await supabase
        .from("forum_posts")
        .insert({
          user_id: session.user.id,
          category_id: categoryId,
          title: title.trim(),
          content: content.trim(),
          image_url: imageUrl,
        });

      if (postError) throw postError;

      toast({
        title: "✅ สร้างโพสต์สำเร็จ!",
        description: "โพสต์ของคุณถูกเผยแพร่แล้ว",
      });

      navigate("/forum");
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถสร้างโพสต์ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Header />
      
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <Button
          onClick={() => navigate("/forum")}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับไปฟอรัม
        </Button>

        <Card className="p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">สร้างโพสต์ใหม่</h1>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <Label htmlFor="category">หมวดหมู่ *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category" className={errors.category_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive mt-1">{errors.category_id}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">หัวข้อ *</Label>
              <Input
                id="title"
                placeholder="เขียนหัวข้อที่น่าสนใจ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {title.length}/200 ตัวอักษร
              </p>
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content">เนื้อหา *</Label>
              <Textarea
                id="content"
                placeholder="เขียนเนื้อหาของคุณ..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                maxLength={5000}
                className={errors.content ? "border-destructive" : ""}
              />
              {errors.content && (
                <p className="text-sm text-destructive mt-1">{errors.content}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {content.length}/5000 ตัวอักษร
              </p>
            </div>

            {/* Image Upload */}
            <div>
              <Label htmlFor="image">รูปภาพ (ไม่บังคับ)</Label>
              <Label htmlFor="image-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                  {previewUrl ? (
                    <div className="space-y-3">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-muted-foreground">
                        คลิกเพื่อเลือกรูปใหม่
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">คลิกเพื่อเลือกรูปภาพ</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          รองรับ JPG, PNG (ไม่เกิน 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/forum")}
                disabled={loading}
                className="flex-1"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังสร้าง...
                  </>
                ) : (
                  "เผยแพร่โพสต์"
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForumCreate;
