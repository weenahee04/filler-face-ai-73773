import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Sparkles, ArrowLeft, Loader2, AlertCircle, CheckCircle2, TrendingUp, Award } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SkinIssue {
  name: string;
  severity: string;
  location: string;
  description: string;
}

interface ProductRecommendation {
  type: string;
  ingredient: string;
  benefit: string;
}

interface ProcedureRecommendation {
  name: string;
  description: string;
  suitable_for: string;
}

interface SkinAnalysis {
  overall_score: number;
  skin_type: string;
  issues: SkinIssue[];
  recommendations: {
    treatments: string[];
    products: ProductRecommendation[];
    procedures: ProcedureRecommendation[];
  };
  lifestyle_tips: string[];
  prevention: string[];
}

const SkinAnalysis = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
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
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      toast({
        title: "กรุณาเลือกรูปภาพ",
        description: "อัปโหลดรูปผิวหน้าของคุณก่อนครับ",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);

    try {
      // Upload image to storage
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `skin-analysis/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('face-images')
        .upload(filePath, selectedImage);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('face-images')
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;

      toast({
        title: "🔬 กำลังวิเคราะห์ผิวหน้า...",
        description: "AI กำลังตรวจสอบผิวของคุณอย่างละเอียด",
      });

      // Call analysis function
      const { data: result, error } = await supabase.functions.invoke('skin-analysis', {
        body: { imageUrl },
      });

      if (error) throw error;

      if (result?.analysis) {
        setAnalysis(result.analysis);
        toast({
          title: "✅ วิเคราะห์สำเร็จ!",
          description: "ผลการวิเคราะห์ผิวของคุณพร้อมแล้ว",
        });
      } else {
        throw new Error('ไม่ได้รับผลการวิเคราะห์');
      }

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถวิเคราะห์ได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'เล็กน้อย': return 'bg-green-500';
      case 'ปานกลาง': return 'bg-yellow-500';
      case 'มาก': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBadgeVariant = (severity: string): "default" | "secondary" | "destructive" => {
    switch (severity.toLowerCase()) {
      case 'เล็กน้อย': return 'default';
      case 'ปานกลาง': return 'secondary';
      case 'มาก': return 'destructive';
      default: return 'default';
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
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-secondary animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2">AI Skin Analysis</h1>
          <p className="text-muted-foreground text-sm md:text-lg px-4">
            วิเคราะห์ผิวหน้าด้วย AI และรับคำแนะนำการดูแลแบบเฉพาะบุคคล
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 md:gap-8 max-w-6xl mx-auto">
          {/* Upload Section */}
          <Card className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">อัปโหลดรูปผิวหน้า</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="skin-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 md:p-8 text-center hover:border-primary transition-colors">
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
                        <Upload className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm md:text-base">คลิกเพื่อเลือกรูปภาพ</p>
                          <p className="text-xs md:text-sm text-muted-foreground mt-1">
                            รองรับ JPG, PNG (ขนาดไม่เกิน 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Label>
                <input
                  id="skin-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={analyzing}
                />
              </div>

              <div className="bg-accent/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-sm md:text-base">📸 เคล็ดลับถ่ายภาพ</h3>
                <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
                  <li>• ถ่ายในที่แสงสว่างธรรมชาติ</li>
                  <li>• หน้าตรง ไม่เอียง</li>
                  <li>• ไม่แต่งหน้า หรือแต่งหน้าบาง</li>
                  <li>• ผิวสะอาด ไม่มีครีมทา</li>
                </ul>
              </div>

              <Button 
                onClick={handleAnalyze}
                disabled={!selectedImage || analyzing}
                className="w-full h-11 md:h-12 text-sm md:text-base"
                size="lg"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    กำลังวิเคราะห์...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    วิเคราะห์ผิวหน้า
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Results Section */}
          <Card className="p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">ผลการวิเคราะห์</h2>
            
            {!analysis ? (
              <div className="text-center py-8 md:py-12">
                <AlertCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-sm md:text-base text-muted-foreground">
                  อัปโหลดรูปและกดวิเคราะห์<br />เพื่อดูผลการตรวจสุขภาพผิว
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      คะแนนสุขภาพผิวโดยรวม
                    </h3>
                    <span className="text-2xl font-bold text-primary">{analysis.overall_score}/100</span>
                  </div>
                  <Progress value={analysis.overall_score} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    ประเภทผิว: <span className="font-semibold text-foreground">{analysis.skin_type}</span>
                  </p>
                </div>

                {/* Issues */}
                {analysis.issues && analysis.issues.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      ปัญหาผิวที่พบ ({analysis.issues.length})
                    </h3>
                    <div className="space-y-3">
                      {analysis.issues.map((issue, idx) => (
                        <Card key={idx} className="p-3 bg-accent/50">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-sm">{issue.name}</h4>
                            <Badge variant={getSeverityBadgeVariant(issue.severity)}>
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            <strong>ตำแหน่ง:</strong> {issue.location}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {issue.description}
                          </p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Tabs */}
                <Tabs defaultValue="treatments" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="treatments" className="text-xs">การรักษา</TabsTrigger>
                    <TabsTrigger value="products" className="text-xs">ผลิตภัณฑ์</TabsTrigger>
                    <TabsTrigger value="procedures" className="text-xs">หัตถการ</TabsTrigger>
                  </TabsList>

                  <TabsContent value="treatments" className="space-y-2">
                    {analysis.recommendations.treatments.map((treatment, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-accent/30 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{treatment}</p>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="products" className="space-y-3">
                    {analysis.recommendations.products.map((product, idx) => (
                      <Card key={idx} className="p-3 bg-accent/30">
                        <h4 className="font-semibold text-sm mb-1">{product.type}</h4>
                        <p className="text-xs text-muted-foreground mb-1">
                          <strong>ส่วนผสม:</strong> {product.ingredient}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>ประโยชน์:</strong> {product.benefit}
                        </p>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="procedures" className="space-y-3">
                    {analysis.recommendations.procedures.map((proc, idx) => (
                      <Card key={idx} className="p-3 bg-accent/30">
                        <h4 className="font-semibold text-sm mb-1">{proc.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{proc.description}</p>
                        <Badge variant="outline" className="text-xs">
                          เหมาะสำหรับ: {proc.suitable_for}
                        </Badge>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>

                {/* Lifestyle Tips */}
                {analysis.lifestyle_tips && analysis.lifestyle_tips.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      คำแนะนำการดูแล
                    </h3>
                    <div className="space-y-2">
                      {analysis.lifestyle_tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-accent/30 rounded">
                          <span className="text-primary font-bold text-sm">{idx + 1}.</span>
                          <p className="text-sm">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Info Section */}
        <Card className="max-w-6xl mx-auto mt-8 p-4 md:p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <h3 className="font-bold text-base md:text-lg mb-3">🔬 AI Skin Analysis ทำงานอย่างไร?</h3>
          <p className="text-sm md:text-base text-muted-foreground mb-4">
            ระบบใช้ AI ขั้นสูงวิเคราะห์ภาพผิวหน้าของคุณ ตรวจจับปัญหาต่างๆ เช่น สิว รอยดำ ริ้วรอย 
            รูขุมขนกว้าง และให้คำแนะนำการดูแลที่เหมาะสมกับสภาพผิวของคุณโดยเฉพาะ
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-background/50 p-3 md:p-4 rounded-lg">
              <p className="font-semibold mb-2 text-sm md:text-base">✅ ความแม่นยำสูง</p>
              <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
                <li>• วิเคราะห์ด้วย AI ที่ผ่านการเทรน</li>
                <li>• ตรวจจับปัญหาหลากหลายประเภท</li>
                <li>• คำแนะนำเฉพาะบุคคล</li>
              </ul>
            </div>
            <div className="bg-background/50 p-3 md:p-4 rounded-lg">
              <p className="font-semibold mb-2 text-sm md:text-base">⚠️ ข้อควรทราบ</p>
              <ul className="text-xs md:text-sm text-muted-foreground space-y-1">
                <li>• ผลเป็นเพียงการประเมินเบื้องต้น</li>
                <li>• ควรปรึกษาแพทย์ผู้เชี่ยวชาญ</li>
                <li>• ใช้เป็นข้อมูลประกอบการตัดสินใจ</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SkinAnalysis;
