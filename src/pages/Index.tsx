import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Loader2, Sparkles, CheckCircle2, ExternalLink, Download, Share2, Info, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import html2canvas from "html2canvas";
import { ResultImage } from "@/components/ResultImage";
import { FaceScanner } from "@/components/FaceScanner";
import { Header } from "@/components/Header";
import { checkBrowserCompatibility, getRecommendedBrowsers, isMobileDevice } from "@/lib/browser-compatibility";
import { AlertCircle } from "lucide-react";
const Index = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<string>('');
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);
  const resultImageRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const optimizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions (max width 800px)
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height = height * MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          // Create canvas and resize
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Cannot get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Create optimized file
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            console.log('Image optimization:');
            console.log('Original size:', (file.size / 1024).toFixed(2), 'KB');
            console.log('Optimized size:', (optimizedFile.size / 1024).toFixed(2), 'KB');
            console.log('Reduction:', ((1 - optimizedFile.size / file.size) * 100).toFixed(1), '%');
            resolve(optimizedFile);
          }, 'image/jpeg', 0.85 // Quality 85%
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      toast({
        title: "⚙️ กำลังเตรียมรูปภาพ...",
        description: "กำลัง optimize รูปภาพ"
      });

      // Optimize image before upload
      const optimizedFile = await optimizeImage(file);
      setUploadedFile(optimizedFile);
      const imageUrl = URL.createObjectURL(optimizedFile);
      setUploadedImageUrl(imageUrl);
      toast({
        title: "✅ อัพโหลดสำเร็จ",
        description: "รูปภาพถูก optimize แล้ว พร้อมทำการวิเคราะห์"
      });

      // Auto show consent if not accepted
      if (!consentAccepted) {
        setShowConsent(true);
      }
    } catch (error) {
      console.error('Error optimizing image:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถประมวลผลรูปภาพได้",
        variant: "destructive"
      });
    }
  };
  const performAnalysis = async () => {
    if (!uploadedFile) {
      toast({
        title: "กรุณาอัพโหลดรูปภาพก่อน",
        variant: "destructive"
      });
      return;
    }
    console.log('Starting analysis from uploaded file...');
    setAnalyzing(true);
    try {
      console.log('Uploading image to storage...', uploadedFile.name);
      const fileName = `${Date.now()}-${uploadedFile.name}`;
      const {
        data,
        error
      } = await supabase.storage.from('face-images').upload(fileName, uploadedFile);
      if (error) throw error;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('face-images').getPublicUrl(fileName);
      console.log('Image uploaded successfully:', publicUrl);
      console.log('Calling analyze-face edge function...');
      const response = await supabase.functions.invoke('analyze-face', {
        body: {
          imageUrl: publicUrl
        }
      });
      console.log('Edge function response:', response);
      if (response.error) {
        console.error('Edge function error:', response.error);
        throw new Error(response.error.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
      }
      if (response.data?.error) {
        console.error('Application error:', response.data.error);
        const errorMsg = response.data.error;
        // Check for specific error types
        if (errorMsg.includes('402') || errorMsg.includes('เติมเครดิต')) {
          throw new Error('💳 เครดิต Lovable AI หมดแล้ว\n\nกรุณาไปที่ Settings → Workspace → Usage เพื่อเติมเครดิต');
        }
        if (errorMsg.includes('429') || errorMsg.includes('ขอบเขตการใช้งาน')) {
          throw new Error('⏱️ เกินขอบเขตการใช้งาน\n\nกรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
        }
        throw new Error(errorMsg);
      }
      if (!response.data?.analysis) {
        throw new Error('ไม่ได้รับผลการวิเคราะห์จากเซิร์ฟเวอร์');
      }
      console.log('Analysis result:', response.data);
      setAnalysis(response.data.analysis);

      // Save analysis to database
      try {
        const { data: savedAnalysis, error: saveError } = await (supabase as any)
          .from('face_analyses')
          .insert({
            image_url: publicUrl,
            analysis_result: response.data.analysis,
            customer_id: '00000000-0000-0000-0000-000000000000' // Default customer ID for anonymous
          })
          .select()
          .single();

        if (saveError) {
          console.error('Error saving analysis:', saveError);
        } else if (savedAnalysis) {
          setAnalysisId(savedAnalysis.id);
          console.log('Analysis saved with ID:', savedAnalysis.id);
        }
      } catch (saveErr) {
        console.error('Failed to save analysis:', saveErr);
      }

      toast({
        title: "✨ วิเคราะห์สำเร็จ",
        description: "ได้รับผลการวิเคราะห์จาก AI แล้ว"
      });
    } catch (error: any) {
      console.error('Analysis error details:', error);
      const errorMessage = error.message || "ไม่สามารถวิเคราะห์ภาพได้ กรุณาลองใหม่อีกครั้ง";
      toast({
        title: errorMessage.includes('เครดิต') ? "💳 เครดิต AI หมด" : "เกิดข้อผิดพลาด",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
    } finally {
      setAnalyzing(false);
    }
  };
  const handleFaceCapture = async (imageData: string) => {
    try {
      // Convert base64 to File
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();
      const file = new File([blob], `face-scan-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      // Optimize the captured image
      toast({
        title: "⚙️ กำลังเตรียมรูปภาพ...",
        description: "กำลัง optimize รูปภาพ"
      });
      const optimizedFile = await optimizeImage(file);
      setUploadedFile(optimizedFile);
      setUploadedImageUrl(imageData);
      toast({
        title: "✅ ถ่ายภาพสำเร็จ",
        description: "พร้อมทำการวิเคราะห์"
      });

      // Auto show consent if not accepted
      if (!consentAccepted) {
        setShowConsent(true);
      }
    } catch (error) {
      console.error('Error processing captured image:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถประมวลผลรูปภาพได้",
        variant: "destructive"
      });
    }
  };
  const resetAll = () => {
    setUploadedFile(null);
    setUploadedImageUrl('');
    setAnalysis(null);
    setAnalysisId('');
    setShowFaceScanner(false);
  };
  const handleConsentAccept = () => {
    setConsentAccepted(true);
    setShowConsent(false);
    // Start analysis after consent
    if (uploadedFile) {
      performAnalysis();
    }
  };
  const generateResultImage = async () => {
    if (!resultImageRef.current || !analysis) return;
    setGeneratingImage(true);
    try {
      // Wait a bit for the component to fully render
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(resultImageRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      return canvas;
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างรูปภาพได้",
        variant: "destructive"
      });
      return null;
    } finally {
      setGeneratingImage(false);
    }
  };
  const handleDownload = () => {
    if (!analysisId) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบข้อมูลการวิเคราะห์",
        variant: "destructive"
      });
      return;
    }
    setShowShareDialog(true);
  };

  const handleShare = () => {
    if (!analysisId) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบข้อมูลการวิเคราะห์",
        variant: "destructive"
      });
      return;
    }
    setShowShareDialog(true);
  };

  const copyProfileLink = () => {
    const profileUrl = `${window.location.origin}/profile/${analysisId}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "✅ คัดลอกลิงก์แล้ว",
      description: "สามารถนำไปแชร์ได้เลย"
    });
  };

  const openProfile = () => {
    navigate(`/profile/${analysisId}`);
  };

  const handleOpenFaceScanner = () => {
    const compatibility = checkBrowserCompatibility();
    
    if (!compatibility.isCompatible) {
      console.log('Browser compatibility check failed:', compatibility);
      setShowCompatibilityWarning(true);
      
      toast({
        title: "⚠️ เบราว์เซอร์ไม่รองรับการสแกนใบหน้า",
        description: `ฟีเจอร์บางอย่างไม่พร้อมใช้งาน: ${compatibility.missingFeatures.join(", ")}`,
        variant: "destructive",
        duration: 8000
      });
      
      return;
    }
    
    console.log('Browser compatibility check passed:', compatibility);
    setShowFaceScanner(true);
  };
  return <div className="min-h-screen mint-gradient-bg">
      <Header />
      
      {/* Face Scanner */}
      {showFaceScanner && <FaceScanner onCapture={handleFaceCapture} onClose={() => setShowFaceScanner(false)} />}

      {/* Consent Dialog */}
      <Dialog open={showConsent} onOpenChange={setShowConsent}>
        <DialogContent className="sm:max-w-[500px] glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              เงื่อนไขการใช้งาน
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground space-y-4 pt-4">
              <div className="p-4 bg-accent rounded-xl border border-border">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  การประเมินเบื้องต้น
                </h4>
                <p className="text-sm text-muted-foreground">
                  ผลการวิเคราะห์จาก AI เป็นเพียงการประเมินเบื้องต้นเท่านั้น 
                  ควรปรึกษาแพทย์ผู้เชี่ยวชาญก่อนตัดสินใจทำหัตถการจริง
                </p>
              </div>
              
              <div className="p-4 bg-accent rounded-xl border border-border">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  ความเป็นส่วนตัว
                </h4>
                <p className="text-sm text-muted-foreground">
                  บริษัทจะไม่เก็บบันทึกหรือจัดเก็บข้อมูลรูปภาพของท่านไว้ในระบบ 
                  รูปภาพจะถูกใช้เพื่อการวิเคราะห์ชั่วคราวเท่านั้น
                </p>
              </div>

              <p className="text-sm text-muted-foreground italic pt-2">
                การกดปุ่ม "ยอมรับและดำเนินการต่อ" ถือว่าท่านได้อ่านและยอมรับเงื่อนไขข้างต้นแล้ว
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConsent(false)} className="w-full sm:w-auto">
              ยกเลิก
            </Button>
            <Button onClick={handleConsentAccept} className="w-full sm:w-auto bg-primary hover:bg-primary-hover font-semibold">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              ยอมรับและดำเนินการต่อ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compatibility Warning Dialog */}
      <Dialog open={showCompatibilityWarning} onOpenChange={setShowCompatibilityWarning}>
        <DialogContent className="sm:max-w-[500px] glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-destructive" />
              เบราว์เซอร์ไม่รองรับการสแกนใบหน้า
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground space-y-4 pt-4">
              <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                <p className="text-sm text-foreground font-semibold mb-2">
                  📱 {isMobileDevice() ? "อุปกรณ์มือถือของคุณ" : "เบราว์เซอร์ของคุณ"}ไม่รองรับฟีเจอร์บางอย่างที่จำเป็น
                </p>
                <p className="text-xs text-muted-foreground">
                  กรุณาลองใช้เบราว์เซอร์ที่แนะนำด้านล่าง หรือใช้วิธีอัพโหลดรูปภาพแทน
                </p>
              </div>
              
              <div className="p-4 bg-accent rounded-xl border border-border">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  เบราว์เซอร์ที่แนะนำ
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {getRecommendedBrowsers().map((browser, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>{browser}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <p className="text-sm font-semibold text-foreground mb-1">
                  💡 ทางเลือกอื่น
                </p>
                <p className="text-xs text-muted-foreground">
                  คุณสามารถใช้ฟีเจอร์ <span className="font-semibold text-foreground">"อัพโหลดรูปภาพ"</span> ได้ทันที โดยไม่ต้องเปลี่ยนเบราว์เซอร์
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setShowCompatibilityWarning(false)}
              className="w-full sm:w-auto bg-primary hover:bg-primary-hover font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              เข้าใจแล้ว
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Link Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-[500px] glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Share2 className="w-6 h-6 text-primary" />
              แชร์ผลการวิเคราะห์
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground pt-4">
              <div className="space-y-4">
                <div className="p-4 bg-accent rounded-xl border border-border">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    ลิงก์โปรไฟล์การวิเคราะห์ของคุณ
                  </p>
                  <div className="bg-background rounded-lg p-3 mb-3 border border-border">
                    <p className="text-xs text-muted-foreground break-all font-mono">
                      {`${window.location.origin}/profile/${analysisId}`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    คัดลอกลิงก์นี้เพื่อแชร์ผลการวิเคราะห์กับผู้อื่น หรือบันทึกไว้ดูภายหลัง
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowShareDialog(false)}
              className="w-full sm:w-auto"
            >
              ปิด
            </Button>
            <Button
              onClick={copyProfileLink}
              className="w-full sm:w-auto bg-primary hover:bg-primary-hover font-semibold"
            >
              <Share2 className="w-4 h-4 mr-2" />
              คัดลอกลิงก์
            </Button>
            <Button
              onClick={openProfile}
              className="w-full sm:w-auto bg-primary hover:bg-primary-hover font-semibold"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              เปิดดู
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-6 max-w-6xl pt-24">
        {/* Info Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full shadow-soft border border-border">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              AI วิเคราะห์ใบหน้าอัจฉริยะ
            </span>
          </div>
        </div>

        {/* How to Use Card */}
        <Card className="mb-6 glass-card shadow-card overflow-hidden cursor-pointer hover:shadow-elegant transition-all hover:scale-[1.02]" onClick={() => navigate("/how-to-use")}>
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">วิธีการใช้งาน</h3>
                <p className="text-white/90 text-xs">คู่มือใช้งานแบบละเอียด</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </Card>

        {/* Feature Selection (only show when no image uploaded) */}
        {!uploadedImageUrl && !analysis && <div className="mb-6 p-6 glass-card rounded-2xl shadow-card">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground mb-2">เริ่มต้นวิเคราะห์ใบหน้า</h3>
              <p className="text-sm text-muted-foreground">เลือกวิธีการที่คุณต้องการ</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Face Scan Option */}
              <div className="group border-2 border-primary/30 rounded-2xl p-6 text-center 
                         hover:border-primary hover:bg-accent transition-all cursor-pointer 
                         hover:scale-105 active:scale-95" onClick={handleOpenFaceScanner}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary 
                              flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-foreground font-bold text-lg mb-2">
                  สแกนใบหน้าด้วย AI
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  AI ตรวจจับและถ่ายภาพอัตโนมัติ
                </p>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>✓ ตรวจจับใบหน้า Real-time</span>
                  <span>✓ ถ่ายภาพอัตโนมัติ</span>
                  <span>✓ ได้ภาพคุณภาพสูง</span>
                </div>
              </div>

              {/* Upload Option */}
              <label htmlFor="file-upload-choice" className="cursor-pointer">
                <div className="group border-2 border-secondary/50 rounded-2xl p-6 text-center 
                             hover:border-secondary hover:bg-accent transition-all 
                             hover:scale-105 active:scale-95 h-full">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary 
                                flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-secondary-foreground" />
                  </div>
                  <h4 className="text-foreground font-bold text-lg mb-2">
                    อัพโหลดรูปภาพ
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    เลือกรูปจากแกลเลอรี
                  </p>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span>✓ ใช้รูปที่มีอยู่แล้ว</span>
                    <span>✓ รองรับทุกรูปแบบ</span>
                    <span>✓ เลือกรูปที่ชอบ</span>
                  </div>
                </div>
                <input id="file-upload-choice" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>}

        {/* Image Preview & Analysis Section (only show when image is uploaded) */}
        {uploadedImageUrl && <Card className="mb-6 glass-card shadow-card overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                รูปภาพของคุณ
              </h2>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-border group">
                  <img src={uploadedImageUrl} alt="Uploaded Face" className="w-full h-auto" />
                  {!analysis && <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <p className="text-white text-sm font-medium">รูปภาพพร้อมวิเคราะห์</p>
                    </div>}
                </div>

                {/* Action Buttons */}
                {!analysis && <div className="grid grid-cols-2 gap-3">
                    <Button onClick={performAnalysis} disabled={analyzing} size="lg" className="bg-primary hover:bg-primary-hover font-semibold">
                      {analyzing ? <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          วิเคราะห์...
                        </> : <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          วิเคราะห์ใบหน้า
                        </>}
                    </Button>
                    
                    <Button onClick={resetAll} variant="outline" size="lg" className="font-semibold">
                      เริ่มใหม่
                    </Button>
                  </div>}
              </div>
            </div>
          </Card>}

        {/* Analyzing Status */}
        {analyzing && <Card className="glass-card shadow-card overflow-hidden mb-6">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังประมวลผล
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-bold text-lg mb-1">AI กำลังวิเคราะห์ใบหน้า</p>
                  <p className="text-muted-foreground text-sm">กรุณารอสักครู่...</p>
                </div>
                <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-primary animate-pulse" style={{
                width: '70%'
              }} />
                </div>
              </div>
            </div>
          </Card>}

        {/* Reset Button (show after analysis) */}
        {analysis && <div className="flex justify-center mb-6">
            <Button onClick={resetAll} size="lg" className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold shadow-lg">
              <Upload className="w-5 h-5 mr-2" />
              วิเคราะห์รูปใหม่
            </Button>
          </div>}

        {/* Analysis Results */}
        {analysis && <Card className="glass-card shadow-card overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                ผลการวิเคราะห์ใบหน้า
              </h2>
            </div>

            <div className="p-4">
              {analysis && <div className="space-y-4">
                  {/* Error State */}
                  {analysis.parseError && <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                      <p className="text-yellow-800 font-semibold">⚠️ ระบบไม่สามารถประมวลผลได้สมบูรณ์</p>
                      <p className="text-sm text-yellow-700 mt-2">กรุณาลองอัปโหลดภาพใหม่ที่ชัดเจนขึ้น</p>
                    </div>}

                  {/* Face Shape */}
                  {analysis.faceShape && <div className="p-4 bg-accent rounded-xl border border-border">
                      <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        รูปหน้า
                      </h3>
                      <p className="text-sm text-muted-foreground">{analysis.faceShape}</p>
                    </div>}

                  {/* Estimated Age */}
                  {analysis.estimatedAge && <div className="p-6 bg-primary rounded-2xl shadow-elegant">
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
                    </div>}

                  {/* Beauty Score */}
                  {analysis.beautyScore && <div className="p-6 bg-primary rounded-2xl shadow-elegant">
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
                    </div>}

                  {/* Current Features */}
                  {analysis.currentFeatures && <div className="p-4 bg-accent rounded-xl border border-border">
                      <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        ลักษณะปัจจุบัน
                      </h3>
                      <p className="text-sm text-muted-foreground">{analysis.currentFeatures}</p>
                    </div>}

                  {/* Recommendations */}
                  {analysis.recommendations && analysis.recommendations.length > 0 && <div>
                      <h3 className="font-bold text-foreground mb-3 text-lg">
                        💉 คำแนะนำการเติมฟิลเลอร์
                      </h3>
                      <div className="space-y-3">
                        {analysis.recommendations.map((rec: any, index: number) => <div key={index} className="p-4 bg-background rounded-xl border-2 border-border hover:border-primary/40 
                                     transition-all shadow-sm hover:shadow-soft">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-foreground text-base">{rec.area}</h4>
                              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${rec.priority === 'สูง' ? 'bg-primary text-white' : rec.priority === 'กลาง' ? 'bg-secondary text-secondary-foreground' : 'bg-accent text-accent-foreground'}`}>
                                {rec.priority}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{rec.benefit}</p>
                            <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                              <span className="text-muted-foreground">ปริมาณ: <strong>{rec.amount}</strong></span>
                            </div>
                          </div>)}
                      </div>
                    </div>}


                  {/* Additional Notes */}
                  {analysis.additionalNotes && <div className="p-4 bg-accent rounded-xl border border-border">
                      <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        คำแนะนำเพิ่มเติม
                      </h3>
                      <p className="text-sm text-muted-foreground">{analysis.additionalNotes}</p>
                    </div>}

                  {/* Raw Analysis (fallback) */}
                  {analysis.rawAnalysis && !analysis.recommendations && <div className="p-4 bg-accent rounded-xl border border-border">
                      <h3 className="font-bold text-foreground mb-2">ผลการวิเคราะห์</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.rawAnalysis}</p>
                    </div>}

                  {/* Share Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button onClick={handleDownload} disabled={generatingImage} className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold h-12">
                      {generatingImage ? <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          กำลังสร้างรูป...
                        </> : <>
                          <Download className="w-5 h-5 mr-2" />
                          ดาวน์โหลดรูปผล
                        </>}
                    </Button>
                    
                    <Button onClick={handleShare} disabled={generatingImage} className="flex-1 bg-primary hover:bg-primary-hover font-semibold h-12">
                      {generatingImage ? <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          กำลังสร้างรูป...
                        </> : <>
                          <Share2 className="w-5 h-5 mr-2" />
                          แชร์ผลลัพธ์
                        </>}
                    </Button>
                  </div>

                  {/* Info Text */}
                  <div className="mt-4 p-4 bg-accent rounded-xl border border-border">
                    <p className="text-sm text-muted-foreground text-center">
                      💡 <strong>วิธีแชร์ใน Instagram Story:</strong> กดดาวน์โหลดรูป → เปิด Instagram → เพิ่ม Story → เลือกรูปที่ดาวน์โหลด
                    </p>
                  </div>
                </div>}
            </div>
          </Card>}

        {/* Singderm Brand Promotion Section */}
        <Card className="mt-6 glass-card shadow-elegant overflow-hidden">

        {/* Hidden Result Image for Generation */}
        <div className="fixed -left-[9999px] -top-[9999px]">
          {analysis && uploadedImageUrl && <ResultImage key={`result-${Date.now()}`} ref={resultImageRef} analysis={analysis} imageUrl={uploadedImageUrl} />}
        </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

            {/* Official Importer */}
            <div className="bg-accent border-2 border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">นำเข้าโดย Pola Group จำกัด</h3>
                  <p className="text-sm text-muted-foreground">ผู้นำเข้าเพียงรายเดียวในประเทศไทย รับประกันของแท้ 100%</p>
                </div>
              </div>
            </div>

            {/* Product Lines */}
            <div>
              <h3 className="font-bold text-foreground text-xl mb-4 text-center">
                ผลิตภัณฑ์ที่แนะนำ
              </h3>
              
              <div className="space-y-4">
                {/* Hyaluronic Acid Dermal Filler */}
                <div className="p-4 bg-background rounded-xl border-2 border-border hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">💧</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-2">Hyaluronic Acid Dermal Filler</h4>
                      <p className="text-sm text-muted-foreground mb-2">ฟิลเลอร์กรดไฮยาลูรอนิก ใช้สำหรับการเติมเต็มให้แก่ผิวบนใบหน้า</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>ช่วยแก้ไขร่องลึก ปรับรูปหน้าให้มีมิติ</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>คืนความอ่อนเยาว์ ความสดใส เป็นธรรมชาติ</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Collagen Stimulating Filler */}
                <div className="p-4 bg-background rounded-xl border-2 border-border hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-2">Collagen Stimulating Filler</h4>
                      <p className="text-sm text-muted-foreground mb-2">ฟิลเลอร์ช่วยเติมเต็มผิว พร้อมกระตุ้นการสร้างคอลลาเจนใหม่</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>เพิ่มความยืดหยุ่น ความกระชับ</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>ช่วยให้ผิวดูเรียบเนียน ลดเลือนริ้วรอยได้อย่างยาวนาน</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Skin Booster */}
                <div className="p-4 bg-background rounded-xl border-2 border-border hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">✨</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-2">Skin Booster</h4>
                      <p className="text-sm text-muted-foreground mb-2">สกินบูสเตอร์ ใช้ในการบำรุง เติมเต็มความชุ่มชื้นสู่ผิวจากภายใน</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>พร้อมช่วยฟื้นฟูสภาพผิวให้สดใส</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>ช่วยให้ผิวดูสุขภาพดี อิ่มฟู อ่อนเยาว์มากยิ่งขึ้น</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Package Sizes */}
            <div>
              
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1ml */}
                

                {/* 2ml */}
                

                {/* 10ml */}
                
              </div>
            </div>

            {/* Why Choose Singderm */}
            <div className="bg-primary rounded-xl p-5 text-white">
              <h3 className="font-bold text-xl mb-4 text-center">ทำไมต้องเลือก Singderm?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">✓</span>
                  <p className="text-sm">ผลิตภัณฑ์มาตรฐานสากลจากจีน</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">✓</span>
                  <p className="text-sm">ผ่านการรับรองจาก อย. ไทย</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">✓</span>
                  <p className="text-sm">นำเข้าโดยเพียงรายเดียว</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">✓</span>
                  <p className="text-sm">ผลลัพธ์เป็นธรรมชาติ </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">✓</span>
                  <p className="text-sm">มีขนาดบรรจุให้เลือกตามความต้องการ</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">✓</span>
                  <p className="text-sm">เทคโนโลยีล้ำสมัยจากเกาหลี</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <a href="https://singdermthailand.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-primary 
                         text-white font-bold rounded-full hover:bg-primary-hover transition-all shadow-elegant 
                         hover:scale-105 active:scale-95">
                <span>เรียนรู้เพิ่มเติมเกี่ยวกับ Singderm</span>
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>;
};
export default Index;