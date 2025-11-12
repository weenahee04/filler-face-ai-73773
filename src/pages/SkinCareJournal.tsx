import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Calendar, Camera, X, Plus, Trash2, Edit2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface JournalEntry {
  id: string;
  journal_date: string;
  products_used: string[];
  skin_conditions: string[];
  notes: string;
  mood: string;
  image_url: string | null;
  created_at: string;
}

const SKIN_CONDITIONS = [
  { value: "acne", label: "สิว", color: "bg-red-500" },
  { value: "dry", label: "ผิวแห้ง", color: "bg-yellow-500" },
  { value: "oily", label: "ผิวมัน", color: "bg-green-500" },
  { value: "sensitive", label: "ผิวแพ้ง่าย", color: "bg-orange-500" },
  { value: "redness", label: "ผิวแดง", color: "bg-red-400" },
  { value: "clear", label: "ผิวสะอาด", color: "bg-blue-500" },
];

const MOODS = [
  { value: "great", label: "ดีมาก", emoji: "😊" },
  { value: "good", label: "ดี", emoji: "🙂" },
  { value: "okay", label: "ปานกลาง", emoji: "😐" },
  { value: "bad", label: "แย่", emoji: "😔" },
];

const SkinCareJournal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  
  // Form states
  const [journalDate, setJournalDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [productsInput, setProductsInput] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนใช้งานสมุดบันทึก",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setIsAuthenticated(true);
    loadEntries();
  };

  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("skin_care_journal")
        .select("*")
        .order("journal_date", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error("Error loading journal entries:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("face-images")
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("face-images")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSaveEntry = async () => {
    if (!journalDate) {
      toast({
        title: "กรุณาเลือกวันที่",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let imageUrl = editingEntry?.image_url || null;
      if (uploadedImage) {
        imageUrl = await uploadImage(uploadedImage);
      }

      const products = productsInput
        .split(",")
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const entryData = {
        user_id: user.id,
        journal_date: journalDate,
        products_used: products,
        skin_conditions: selectedConditions,
        notes,
        mood,
        image_url: imageUrl,
      };

      if (editingEntry) {
        const { error } = await supabase
          .from("skin_care_journal")
          .update(entryData)
          .eq("id", editingEntry.id);

        if (error) throw error;

        toast({
          title: "✅ แก้ไขบันทึกสำเร็จ",
        });
      } else {
        const { error } = await supabase
          .from("skin_care_journal")
          .insert(entryData);

        if (error) throw error;

        toast({
          title: "✅ บันทึกสำเร็จ",
        });
      }

      resetForm();
      setShowAddDialog(false);
      setEditingEntry(null);
      loadEntries();
    } catch (error: any) {
      console.error("Error saving entry:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกได้",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบบันทึกนี้?")) return;

    try {
      const { error } = await supabase
        .from("skin_care_journal")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "✅ ลบบันทึกสำเร็จ",
      });

      loadEntries();
    } catch (error: any) {
      console.error("Error deleting entry:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบบันทึกได้",
        variant: "destructive",
      });
    }
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setJournalDate(entry.journal_date);
    setProductsInput(entry.products_used.join(", "));
    setSelectedConditions(entry.skin_conditions);
    setNotes(entry.notes || "");
    setMood(entry.mood || "");
    setImagePreview(entry.image_url || "");
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setJournalDate(format(new Date(), "yyyy-MM-dd"));
    setProductsInput("");
    setSelectedConditions([]);
    setNotes("");
    setMood("");
    setUploadedImage(null);
    setImagePreview("");
  };

  const toggleCondition = (condition: string) => {
    setSelectedConditions(prev =>
      prev.includes(condition)
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen mint-gradient-bg">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">สมุดบันทึกการดูแลผิว</h1>
                <p className="text-muted-foreground">บันทึกการดูแลผิวประจำวันของคุณ</p>
              </div>
            </div>
            
            <Dialog open={showAddDialog} onOpenChange={(open) => {
              setShowAddDialog(open);
              if (!open) {
                setEditingEntry(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary-hover">
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มบันทึกใหม่
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingEntry ? "แก้ไขบันทึก" : "เพิ่มบันทึกใหม่"}
                  </DialogTitle>
                  <DialogDescription>
                    บันทึกผลิตภัณฑ์และอาการผิวหน้าของคุณวันนี้
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="journal-date">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      วันที่
                    </Label>
                    <Input
                      id="journal-date"
                      type="date"
                      value={journalDate}
                      onChange={(e) => setJournalDate(e.target.value)}
                      max={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>

                  {/* Products */}
                  <div className="space-y-2">
                    <Label htmlFor="products">ผลิตภัณฑ์ที่ใช้ (คั่นด้วย , )</Label>
                    <Input
                      id="products"
                      placeholder="เซรั่ม, ครีมกันแดด, มอยส์เจอไรเซอร์"
                      value={productsInput}
                      onChange={(e) => setProductsInput(e.target.value)}
                    />
                  </div>

                  {/* Skin Conditions */}
                  <div className="space-y-2">
                    <Label>อาการผิวหน้า</Label>
                    <div className="flex flex-wrap gap-2">
                      {SKIN_CONDITIONS.map(condition => (
                        <Badge
                          key={condition.value}
                          variant={selectedConditions.includes(condition.value) ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${
                            selectedConditions.includes(condition.value) 
                              ? `${condition.color} text-white` 
                              : "hover:bg-accent"
                          }`}
                          onClick={() => toggleCondition(condition.value)}
                        >
                          {condition.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Mood */}
                  <div className="space-y-2">
                    <Label>อารมณ์วันนี้</Label>
                    <div className="flex gap-2">
                      {MOODS.map(m => (
                        <Button
                          key={m.value}
                          type="button"
                          variant={mood === m.value ? "default" : "outline"}
                          onClick={() => setMood(m.value)}
                          className="flex-1"
                        >
                          <span className="text-2xl mr-2">{m.emoji}</span>
                          {m.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">บันทึกเพิ่มเติม</Label>
                    <Textarea
                      id="notes"
                      placeholder="เขียนบันทึกเกี่ยวกับผิวหน้าวันนี้..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="image">รูปภาพ</Label>
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setUploadedImage(null);
                            setImagePreview("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="image" className="cursor-pointer">
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                          <Camera className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            คลิกเพื่ออัพโหลดรูปภาพ
                          </p>
                        </div>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setEditingEntry(null);
                      resetForm();
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={handleSaveEntry}
                    disabled={saving}
                    className="bg-primary hover:bg-primary-hover"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Entries List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">กำลังโหลด...</p>
          </div>
        ) : entries.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">ยังไม่มีบันทึก</h3>
              <p className="text-muted-foreground mb-4">
                เริ่มบันทึกการดูแลผิวของคุณวันนี้
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มบันทึกแรก
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="glass-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {format(new Date(entry.journal_date), "d MMMM yyyy", { locale: th })}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {entry.mood && (
                          <span className="text-2xl mr-2">
                            {MOODS.find(m => m.value === entry.mood)?.emoji}
                          </span>
                        )}
                        {format(new Date(entry.created_at), "เวลา HH:mm น.", { locale: th })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditEntry(entry)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteEntry(entry.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {entry.image_url && (
                    <img
                      src={entry.image_url}
                      alt="Journal entry"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  )}

                  {entry.products_used.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                        ผลิตภัณฑ์ที่ใช้
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.products_used.map((product, idx) => (
                          <Badge key={idx} variant="secondary">
                            {product}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.skin_conditions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                        อาการผิวหน้า
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.skin_conditions.map((condition, idx) => {
                          const conditionData = SKIN_CONDITIONS.find(c => c.value === condition);
                          return (
                            <Badge
                              key={idx}
                              className={`${conditionData?.color} text-white`}
                            >
                              {conditionData?.label || condition}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {entry.notes && (
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">
                        บันทึก
                      </h4>
                      <p className="text-foreground whitespace-pre-wrap">
                        {entry.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkinCareJournal;
