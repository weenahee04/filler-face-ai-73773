import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Share2, Loader2, Sparkles, CheckCircle2, ExternalLink, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { Header } from "@/components/Header";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const resultContentRef = useRef<HTMLDivElement>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  const { analysis, imageUrl } = location.state || {};

  useEffect(() => {
    // If no analysis data, redirect to home
    if (!analysis || !imageUrl) {
      navigate("/");
    }
  }, [analysis, imageUrl, navigate]);

  const handleDownload = async () => {
    if (!resultContentRef.current) return;

    try {
      setGeneratingImage(true);
      toast({
        title: "🎨 กำลังสร้างรูปภาพ...",
        description: "กรุณารอสักครู่",
      });

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture the result content
      const canvas = await html2canvas(resultContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: resultContentRef.current.scrollWidth,
        windowHeight: resultContentRef.current.scrollHeight,
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `pola-ai-result-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast({
            title: "✅ ดาวน์โหลดสำเร็จ!",
            description: "รูปภาพถูกบันทึกลงในเครื่องของคุณแล้ว",
          });
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างรูปภาพได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleShare = async () => {
    if (!resultContentRef.current) return;

    try {
      setGeneratingImage(true);
      toast({
        title: "🎨 กำลังสร้างรูปภาพ...",
        description: "กรุณารอสักครู่",
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(resultContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: resultContentRef.current.scrollWidth,
        windowHeight: resultContentRef.current.scrollHeight,
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'pola-ai-result.png', { type: 'image/png' });

          if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'ผลการวิเคราะห์ใบหน้า - Pola AI',
                text: 'ดูผลการวิเคราะห์ใบหน้าของฉันจาก Pola AI',
              });

              toast({
                title: "✅ แชร์สำเร็จ!",
                description: "ส่งผลการวิเคราะห์แล้ว",
              });
            } catch (error) {
              if (error instanceof Error && error.name !== 'AbortError') {
                toast({
                  title: "ℹ️ ยกเลิกการแชร์",
                  description: "คุณสามารถลองแชร์ใหม่ได้ตลอดเวลา",
                });
              }
            }
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pola-ai-result-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
              title: "✅ ดาวน์โหลดสำเร็จ!",
              description: "คุณสามารถนำรูปภาพไปแชร์ได้เลย",
            });
          }
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ไม่สามารถแชร์ได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  if (!analysis || !imageUrl) {
    return null;
  }

  return (
    <div className="min-h-screen hero-section">
      <Header />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Back Button */}
        <Button 
          onClick={() => navigate("/")} 
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับหน้าหลัก
        </Button>

        {/* Main Content for Screenshot */}
        <div ref={resultContentRef}>
          {/* Uploaded Image */}
          {imageUrl && (
            <div className="mb-6">
              <img 
                src={imageUrl} 
                alt="Analyzed face" 
                className="w-full max-w-md mx-auto rounded-2xl shadow-lg"
              />
            </div>
          )}

          {/* Analysis Results */}
          <Card className="glass-card shadow-card overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                ผลการวิเคราะห์ใบหน้า
              </h2>
            </div>

            <div className="p-4">
              <div className="space-y-4">
                {/* Error State */}
                {analysis.parseError && (
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                    <p className="text-yellow-800 font-semibold">⚠️ ระบบไม่สามารถประมวลผลได้สมบูรณ์</p>
                    <p className="text-sm text-yellow-700 mt-2">กรุณาลองอัปโหลดภาพใหม่ที่ชัดเจนขึ้น</p>
                  </div>
                )}

                {/* Face Shape */}
                {analysis.faceShape && (
                  <div className="p-4 bg-accent rounded-xl border border-border">
                    <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      รูปหน้า
                    </h3>
                    <p className="text-sm text-muted-foreground">{analysis.faceShape}</p>
                  </div>
                )}

                {/* Estimated Age */}
                {analysis.estimatedAge && (
                  <div className="p-6 bg-primary rounded-2xl shadow-elegant">
                    <div className="text-center mb-4">
                      <h3 className="text-white font-bold text-lg mb-2 flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        อายุใบหน้า
                      </h3>
                      <div className="relative inline-flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/40">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-white">{analysis.estimatedAge.exact}</div>
                            <div className="text-sm text-white/90 font-medium">ปี</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <p className="text-white font-semibold text-center mb-2">
                        ช่วงอายุ: {analysis.estimatedAge.range}
                      </p>
                      <p className="text-white/90 text-sm text-center">
                        {analysis.estimatedAge.explanation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Beauty Score */}
                {analysis.beautyScore && (
                  <div className="p-6 bg-primary rounded-2xl shadow-elegant">
                    <div className="text-center mb-4">
                      <h3 className="text-white font-bold text-lg mb-2 flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        คะแนนความงามใบหน้า
                      </h3>
                      <div className="relative inline-flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/40">
                          <div className="text-center">
                            <div className="text-5xl font-bold text-white">{analysis.beautyScore.overall}</div>
                            <div className="text-sm text-white/90 font-medium">/ 100</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <p className="text-white font-semibold text-center mb-2">
                        {analysis.beautyScore.percentile}
                      </p>
                      <p className="text-white/90 text-sm text-center">
                        {analysis.beautyScore.explanation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Current Features */}
                {analysis.currentFeatures && (
                  <div className="p-4 bg-accent rounded-xl border border-border">
                    <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      ลักษณะปัจจุบัน
                    </h3>
                    <p className="text-sm text-muted-foreground">{analysis.currentFeatures}</p>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-bold text-foreground mb-3 text-lg">
                      💉 คำแนะนำการเติมฟิลเลอร์
                    </h3>
                    <div className="space-y-3">
                      {analysis.recommendations.map((rec: any, index: number) => (
                        <div 
                          key={index} 
                          className="p-4 bg-background rounded-xl border-2 border-border hover:border-primary/40 
                                     transition-all shadow-sm hover:shadow-soft"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-foreground text-base">{rec.area}</h4>
                            <span 
                              className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                rec.priority === 'สูง' 
                                  ? 'bg-primary text-white' 
                                  : rec.priority === 'กลาง' 
                                  ? 'bg-secondary text-secondary-foreground' 
                                  : 'bg-accent text-accent-foreground'
                              }`}
                            >
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{rec.benefit}</p>
                          <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                            <span className="text-muted-foreground">ปริมาณ: <strong>{rec.amount}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {analysis.additionalNotes && (
                  <div className="p-4 bg-accent rounded-xl border border-border">
                    <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      คำแนะนำเพิ่มเติม
                    </h3>
                    <p className="text-sm text-muted-foreground">{analysis.additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
        
        {/* Action Buttons - Outside screenshot area */}
        <div className="mt-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border-2 border-primary/20">
          <div className="text-center mb-4">
            <h3 className="text-foreground font-bold text-xl mb-2 flex items-center justify-center gap-2">
              <Share2 className="w-6 h-6 text-primary" />
              แชร์และดาวน์โหลดผลลัพธ์
            </h3>
            <p className="text-muted-foreground text-sm">
              บันทึกหรือแชร์ผลการวิเคราะห์ของคุณ
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={handleDownload} 
              disabled={generatingImage} 
              className="bg-primary hover:bg-primary-hover text-white font-bold h-14 text-base shadow-elegant hover:shadow-glow transition-all hover:scale-105 active:scale-95"
            >
              {generatingImage ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  กำลังสร้างรูป...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  ดาวน์โหลดรูปผล
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleShare} 
              disabled={generatingImage} 
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold h-14 text-base shadow-soft transition-all hover:scale-105 active:scale-95"
            >
              {generatingImage ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  กำลังสร้างรูป...
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 mr-2" />
                  แชร์ผลลัพธ์
                </>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-background/50 rounded-lg p-3">
              <span className="text-primary mt-0.5">📱</span>
              <p>
                <strong className="text-foreground">Instagram Story:</strong> ดาวน์โหลดรูป → เปิด Instagram → เพิ่ม Story → เลือกรูป
              </p>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-background/50 rounded-lg p-3">
              <span className="text-primary mt-0.5">💬</span>
              <p>
                <strong className="text-foreground">Line/Facebook:</strong> กดปุ่มแชร์เพื่อแชร์ผ่านแอปต่างๆ ได้ทันที
              </p>
            </div>
          </div>
        </div>

        {/* Singderm Brand Promotion Section */}
        <Card className="mt-6 glass-card shadow-elegant overflow-hidden">
          <div className="bg-primary px-4 py-4">
            <div className="text-center">
              <h2 className="text-white font-bold text-2xl mb-1">
                ✨ Singderm Thailand ✨
              </h2>
              <p className="text-white/90 text-sm font-medium">ฟิลเลอร์พรีเมียม อันดับ 1 จากจีน</p>
              <div className="mt-2 inline-block bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full">
                <p className="text-white text-xs font-semibold">เลขที่ อย. 68-2-1-2-0002371</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="text-center p-3 bg-accent rounded-xl border border-border">
                <div className="text-2xl mb-1">🏆</div>
                <p className="text-xs font-semibold text-foreground">มาตรฐานสากล</p>
              </div>
              
              <div className="text-center p-3 bg-accent rounded-xl border border-border">
                <div className="text-2xl mb-1">CN</div>
                <p className="text-xs font-semibold text-foreground">Made in China</p>
              </div>
              
              <div className="text-center p-3 bg-accent rounded-xl border border-border">
                <div className="text-2xl mb-1">💎</div>
                <p className="text-xs font-semibold text-foreground">คุณภาพพรีเมียม</p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <a 
                href="https://singdermthailand.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary 
                         text-white font-bold rounded-full hover:bg-primary-hover transition-all shadow-elegant 
                         hover:scale-105 active:scale-95"
              >
                <span>เรียนรู้เพิ่มเติมเกี่ยวกับ Singderm</span>
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Result;
