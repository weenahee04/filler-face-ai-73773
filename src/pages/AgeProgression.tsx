import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Clock, Download, Share2, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";

const AgeProgression = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ years: number; imageUrl: string }[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResults([]);
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast({
        title: "กรุณาเลือกรูปภาพ",
        description: "อัปโหลดรูปหน้าของคุณก่อนครับ",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProcessing(true);

    try {
      // Upload image to storage
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `age-progression/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('face-images')
        .upload(filePath, selectedImage);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('face-images')
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;
      setUploading(false);

      toast({
        title: "🎨 กำลังสร้างภาพอนาคต...",
        description: "กรุณารอสักครู่ AI กำลังทำงาน",
      });

      // Generate age progressions
      const yearsOptions = [10, 20, 30];
      const generatedResults: { years: number; imageUrl: string }[] = [];

      for (const years of yearsOptions) {
        try {
          const { data: result, error } = await supabase.functions.invoke('age-progression', {
            body: {
              imageUrl,
              yearsForward: years,
            },
          });

          if (error) throw error;

          if (result?.imageUrl) {
            generatedResults.push({
              years,
              imageUrl: result.imageUrl,
            });
          }
        } catch (error: any) {
          console.error(`Error generating +${years} years:`, error);
          toast({
            title: `⚠️ ไม่สามารถสร้างภาพ +${years} ปี`,
            description: error.message || "กรุณาลองใหม่อีกครั้ง",
            variant: "destructive",
          });
        }
      }

      setResults(generatedResults);

      if (generatedResults.length > 0) {
        toast({
          title: "✅ สำเร็จ!",
          description: `สร้างภาพอนาคต ${generatedResults.length} แบบเรียบร้อย`,
        });
      }

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถประมวลผลได้",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleDownload = async (imageUrl: string, years: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `age-progression-${years}-years.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "✅ ดาวน์โหลดสำเร็จ!",
        description: "บันทึกรูปภาพลงเครื่องแล้ว",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดาวน์โหลดได้",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Header />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <Button 
          onClick={() => navigate("/")} 
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับหน้าหลัก
        </Button>

        <div className="text-center mb-6 md:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
            <Clock className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-secondary animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2">AI Age Progression</h1>
          <p className="text-muted-foreground text-sm md:text-lg px-4">
            ดูใบหน้าของคุณในอนาคต 10, 20, 30 ปี
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 md:gap-8 max-w-6xl mx-auto">
          {/* Upload Section */}
          <Card className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">อัปโหลดรูปภาพ</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                    {previewUrl ? (
                      <div className="space-y-4">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="max-h-64 mx-auto rounded-lg"
                        />
                        <p className="text-sm text-muted-foreground">
                          คลิกเพื่อเลือกรูปใหม่
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="font-medium">คลิกเพื่อเลือกรูปภาพ</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            รองรับ JPG, PNG (ขนาดไม่เกิน 5MB)
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
                  disabled={processing}
                />
              </div>

              <div className="bg-accent/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">💡 เคล็ดลับ</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• ใช้รูปหน้าตรง แสงสว่างเพียงพอ</li>
                  <li>• มองตรงกล้อง ไม่เอียงหน้า</li>
                  <li>• ไม่มีสิ่งกีดขวางใบหน้า</li>
                  <li>• ความละเอียดสูงจะได้ผลดีกว่า</li>
                </ul>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={!selectedImage || uploading || processing}
                className="w-full h-12 text-base"
                size="lg"
              >
                {uploading || processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {uploading ? "กำลังอัปโหลด..." : "AI กำลังสร้างภาพ..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    สร้างภาพอนาคต
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Results Section */}
          <Card className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">ผลลัพธ์</h2>
            
            {results.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground">
                  อัปโหลดรูปและกดสร้างภาพ<br />เพื่อดูใบหน้าในอนาคต
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {results.map((result) => (
                  <div key={result.years} className="space-y-2 md:space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base md:text-lg">
                        +{result.years} ปี
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(result.imageUrl, result.years)}
                        className="h-8"
                      >
                        <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        <span className="hidden sm:inline ml-1">ดาวน์โหลด</span>
                      </Button>
                    </div>
                    <img 
                      src={result.imageUrl} 
                      alt={`Age +${result.years} years`}
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Info Section */}
        <Card className="max-w-6xl mx-auto mt-8 p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <h3 className="font-bold text-lg mb-3">🎯 AI Age Progression คืออะไร?</h3>
          <p className="text-muted-foreground mb-4">
            เทคโนโลยี AI ที่ช่วยคาดการณ์และสร้างภาพใบหน้าของคุณในอนาคต 
            โดยใช้ข้อมูลการเปลี่ยนแปลงของใบหน้าตามธรรมชาติ เช่น ริ้วรอย 
            ผิวหย่อนคล้อย และการเปลี่ยนแปลงโครงสร้างใบหน้า
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-background/50 p-4 rounded-lg">
              <p className="font-semibold mb-2">✅ ประโยชน์</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ช่วยตัดสินใจทำศัลยกรรม</li>
                <li>• เห็นผลระยะยาว</li>
                <li>• วางแผนดูแลผิวล่วงหน้า</li>
              </ul>
            </div>
            <div className="bg-background/50 p-4 rounded-lg">
              <p className="font-semibold mb-2">⚠️ ข้อควรระวัง</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• เป็นการคาดการณ์โดยประมาณ</li>
                <li>• ขึ้นกับปัจจัยหลายอย่าง</li>
                <li>• ใช้เป็นข้อมูลประกอบเท่านั้น</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AgeProgression;