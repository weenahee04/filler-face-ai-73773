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
const Index = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const resultImageRef = useRef<HTMLDivElement>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const optimizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions (max width 800px)
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
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
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              // Create optimized file
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              console.log('Image optimization:');
              console.log('Original size:', (file.size / 1024).toFixed(2), 'KB');
              console.log('Optimized size:', (optimizedFile.size / 1024).toFixed(2), 'KB');
              console.log('Reduction:', ((1 - optimizedFile.size / file.size) * 100).toFixed(1), '%');
              
              resolve(optimizedFile);
            },
            'image/jpeg',
            0.85 // Quality 85%
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
      const { data, error } = await supabase.storage
        .from('face-images')
        .upload(fileName, uploadedFile);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('face-images')
        .getPublicUrl(fileName);
      
      console.log('Image uploaded successfully:', publicUrl);
      
      console.log('Calling analyze-face edge function...');
      const response = await supabase.functions.invoke('analyze-face', {
        body: { imageUrl: publicUrl }
      });
      
      console.log('Edge function response:', response);

      if (response.error) {
        console.error('Edge function error:', response.error);
        const errorMessage = response.error.message || '';

        if (errorMessage.includes('402') || errorMessage.includes('non-2xx')) {
          throw new Error('💳 เครดิต Lovable AI หมดแล้ว\n\nกรุณาไปที่ Settings → Workspace → Usage เพื่อเติมเครดิต');
        }
        throw new Error(response.error.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
      }

      if (response.data?.error) {
        console.error('Application error:', response.data.error);
        throw new Error(response.data.error);
      }
      
      if (!response.data?.analysis) {
        throw new Error('ไม่ได้รับผลการวิเคราะห์จากเซิร์ฟเวอร์');
      }
      
      console.log('Analysis result:', response.data);
      setAnalysis(response.data.analysis);
      
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
      const file = new File([blob], `face-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
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
  const handleDownload = async () => {
    const canvas = await generateResultImage();
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `singderm-analysis-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: "✅ ดาวน์โหลดสำเร็จ",
        description: "บันทึกรูปแล้ว สามารถแชร์ใน Instagram Story ได้"
      });
    });
  };
  const handleShare = async () => {
    const canvas = await generateResultImage();
    if (!canvas) return;
    canvas.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], 'singderm-analysis.png', {
        type: 'image/png'
      });
      if (navigator.share && navigator.canShare({
        files: [file]
      })) {
        try {
          await navigator.share({
            files: [file],
            title: 'ผลการวิเคราะห์ใบหน้า AI - Singderm',
            text: 'ดูผลการวิเคราะห์ใบหน้าของฉัน!'
          });
          toast({
            title: "✅ แชร์สำเร็จ",
            description: "แชร์ผลการวิเคราะห์แล้ว"
          });
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('Error sharing:', error);
            toast({
              title: "เกิดข้อผิดพลาด",
              description: "ไม่สามารถแชร์ได้ กรุณาลองดาวน์โหลดแทน",
              variant: "destructive"
            });
          }
        }
      } else {
        toast({
          title: "ไม่รองรับการแชร์",
          description: "กรุณาดาวน์โหลดรูปและแชร์ใน Instagram แทน"
        });
      }
    });
  };
  return <div className="min-h-screen bg-gradient-to-br from-white via-[#FFF0F5] to-[#FFE4F0] water-ripple-bg">
      {/* Face Scanner */}
      {showFaceScanner && (
        <FaceScanner
          onCapture={handleFaceCapture}
          onClose={() => setShowFaceScanner(false)}
        />
      )}

      {/* Consent Dialog */}
      <Dialog open={showConsent} onOpenChange={setShowConsent}>
        <DialogContent className="sm:max-w-[500px] border-2 border-[#E91E8C]/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#C2185B] flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#E91E8C]" />
              เงื่อนไขการใช้งาน
            </DialogTitle>
            <DialogDescription className="text-base text-gray-700 space-y-4 pt-4">
              <div className="p-4 bg-gradient-to-r from-[#FFF0F5] to-[#FFE4F0] rounded-xl border border-[#E91E8C]/20">
                <h4 className="font-bold text-[#C2185B] mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  การประเมินเบื้องต้น
                </h4>
                <p className="text-sm text-gray-700">
                  ผลการวิเคราะห์จาก AI เป็นเพียงการประเมินเบื้องต้นเท่านั้น 
                  ควรปรึกษาแพทย์ผู้เชี่ยวชาญก่อนตัดสินใจทำหัตถการจริง
                </p>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-[#FFF0F5] to-[#FFE4F0] rounded-xl border border-[#E91E8C]/20">
                <h4 className="font-bold text-[#C2185B] mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  ความเป็นส่วนตัว
                </h4>
                <p className="text-sm text-gray-700">
                  บริษัทจะไม่เก็บบันทึกหรือจัดเก็บข้อมูลรูปภาพของท่านไว้ในระบบ 
                  รูปภาพจะถูกใช้เพื่อการวิเคราะห์ชั่วคราวเท่านั้น
                </p>
              </div>

              <p className="text-sm text-gray-600 italic pt-2">
                การกดปุ่ม "ยอมรับและดำเนินการต่อ" ถือว่าท่านได้อ่านและยอมรับเงื่อนไขข้างต้นแล้ว
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowConsent(false)} className="w-full sm:w-auto border-2 border-gray-300">
              ยกเลิก
            </Button>
            <Button onClick={handleConsentAccept} className="w-full sm:w-auto bg-gradient-to-r from-[#E91E8C] to-[#F06292] hover:opacity-90 font-semibold">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              ยอมรับและดำเนินการต่อ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <h1 className="text-lg md:text-xl font-bold tracking-wide">
                วิเคราะห์ใบหน้าด้วย AI
              </h1>
              <p className="text-xs md:text-sm text-white/90 mt-0.5">
                AI วิเคราะห์ใบหน้าและแนะนำฟิลเลอร์
              </p>
            </div>
            <Button onClick={() => navigate("/how-to-use")} variant="ghost" className="text-white hover:bg-white/20 flex-shrink-0" title="วิธีการใช้งาน">
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Info Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-soft border border-[#E91E8C]/20">
            <Sparkles className="w-4 h-4 text-[#E91E8C]" />
            <span className="text-sm font-medium text-[#C2185B]">
              AI วิเคราะห์ใบหน้าอัจฉริยะ
            </span>
          </div>
        </div>

        {/* How to Use Card */}
        <Card className="mb-6 border-2 border-[#E91E8C]/20 glass-card shadow-card overflow-hidden cursor-pointer hover:shadow-elegant transition-all hover:scale-[1.02]" onClick={() => navigate("/how-to-use")}>
          <div className="bg-gradient-to-r from-[#F06292] to-[#EC407A] px-4 py-3 flex items-center justify-between">
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
        {!uploadedImageUrl && !analysis && (
          <div className="mb-6 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-[#E91E8C]/20 shadow-card">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-[#C2185B] mb-2">เริ่มต้นวิเคราะห์ใบหน้า</h3>
              <p className="text-sm text-gray-600">เลือกวิธีการที่คุณต้องการ</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Face Scan Option */}
              <div 
                className="group border-2 border-[#E91E8C]/30 rounded-2xl p-6 text-center 
                         hover:border-[#E91E8C] hover:bg-[#FFF0F5]/50 transition-all cursor-pointer 
                         hover:scale-105 active:scale-95"
                onClick={() => setShowFaceScanner(true)}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#F06292] 
                              flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-[#C2185B] font-bold text-lg mb-2">
                  สแกนใบหน้าด้วย AI
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  AI ตรวจจับและถ่ายภาพอัตโนมัติ
                </p>
                <div className="flex flex-col gap-1 text-xs text-gray-500">
                  <span>✓ ตรวจจับใบหน้า Real-time</span>
                  <span>✓ ถ่ายภาพอัตโนมัติ</span>
                  <span>✓ ได้ภาพคุณภาพสูง</span>
                </div>
              </div>

              {/* Upload Option */}
              <label htmlFor="file-upload-choice" className="cursor-pointer">
                <div className="group border-2 border-purple-300 rounded-2xl p-6 text-center 
                             hover:border-purple-500 hover:bg-purple-50 transition-all 
                             hover:scale-105 active:scale-95 h-full">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                                flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-purple-700 font-bold text-lg mb-2">
                    อัพโหลดรูปภาพ
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    เลือกรูปจากแกลเลอรี
                  </p>
                  <div className="flex flex-col gap-1 text-xs text-gray-500">
                    <span>✓ ใช้รูปที่มีอยู่แล้ว</span>
                    <span>✓ รองรับทุกรูปแบบ</span>
                    <span>✓ เลือกรูปที่ชอบ</span>
                  </div>
                </div>
                <input
                  id="file-upload-choice"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Image Preview & Analysis Section (only show when image is uploaded) */}
        {uploadedImageUrl && (
          <Card className="mb-6 border-2 border-[#E91E8C]/20 glass-card shadow-card overflow-hidden">
            <div className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] px-4 py-3">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                รูปภาพของคุณ
              </h2>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#E91E8C]/30 group">
                  <img src={uploadedImageUrl} alt="Uploaded Face" className="w-full h-auto" />
                  {!analysis && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <p className="text-white text-sm font-medium">รูปภาพพร้อมวิเคราะห์</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!analysis && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={performAnalysis}
                      disabled={analyzing}
                      size="lg"
                      className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] hover:opacity-90 font-semibold"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          วิเคราะห์...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          วิเคราะห์ใบหน้า
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={resetAll}
                      variant="outline"
                      size="lg"
                      className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                    >
                      เริ่มใหม่
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Analyzing Status */}
        {analyzing && (
          <Card className="border-2 border-[#E91E8C]/20 glass-card shadow-card overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังประมวลผล
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#F06292] flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#F06292] opacity-20 animate-ping" />
                </div>
                <div className="text-center">
                  <p className="text-[#C2185B] font-bold text-lg mb-1">AI กำลังวิเคราะห์ใบหน้า</p>
                  <p className="text-gray-600 text-sm">กรุณารอสักครู่...</p>
                </div>
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#E91E8C] to-[#F06292] animate-pulse" style={{ width: '70%' }} />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Reset Button (show after analysis) */}
        {analysis && (
          <div className="flex justify-center mb-6">
            <Button 
              onClick={resetAll} 
              size="lg"
              className="bg-gradient-to-r from-gray-600 to-gray-700 hover:opacity-90 text-white font-semibold shadow-lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              วิเคราะห์รูปใหม่
            </Button>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && <Card className="border-2 border-[#E91E8C]/20 glass-card shadow-card overflow-hidden">
            <div className="bg-gradient-to-r from-[#E91E8C] via-[#F06292] to-[#E91E8C] px-4 py-3">
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
                  {analysis.faceShape && <div className="p-4 bg-gradient-to-r from-[#FFF0F5] to-[#FFE4F0] rounded-xl border border-[#E91E8C]/20">
                      <h3 className="font-bold text-[#C2185B] mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#E91E8C] rounded-full"></span>
                        รูปหน้า
                      </h3>
                      <p className="text-sm text-gray-700">{analysis.faceShape}</p>
                    </div>}

                  {/* Estimated Age */}
                  {analysis.estimatedAge && <div className="p-6 bg-gradient-to-br from-[#9C27B0] to-[#BA68C8] rounded-2xl shadow-elegant">
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
                  {analysis.beautyScore && <div className="p-6 bg-gradient-to-br from-[#E91E8C] to-[#F06292] rounded-2xl shadow-elegant">
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
                  {analysis.currentFeatures && <div className="p-4 bg-gradient-to-r from-[#FFF0F5] to-[#FFE4F0] rounded-xl border border-[#E91E8C]/20">
                      <h3 className="font-bold text-[#C2185B] mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#E91E8C] rounded-full"></span>
                        ลักษณะปัจจุบัน
                      </h3>
                      <p className="text-sm text-gray-700">{analysis.currentFeatures}</p>
                    </div>}

                  {/* Recommendations */}
                  {analysis.recommendations && analysis.recommendations.length > 0 && <div>
                      <h3 className="font-bold text-[#C2185B] mb-3 text-lg">
                        💉 คำแนะนำการเติมฟิลเลอร์
                      </h3>
                      <div className="space-y-3">
                        {analysis.recommendations.map((rec: any, index: number) => <div key={index} className="p-4 bg-white rounded-xl border-2 border-[#E91E8C]/20 hover:border-[#E91E8C]/40 
                                     transition-all shadow-sm hover:shadow-soft">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-[#C2185B] text-base">{rec.area}</h4>
                              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${rec.priority === 'สูง' ? 'bg-[#E91E8C] text-white' : rec.priority === 'กลาง' ? 'bg-[#F06292] text-white' : 'bg-[#FFE4F0] text-[#C2185B]'}`}>
                                {rec.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{rec.benefit}</p>
                            <div className="flex justify-between items-center text-sm pt-2 border-t border-[#E91E8C]/10">
                              <span className="text-gray-600">ปริมาณ: <strong>{rec.amount}</strong></span>
                            </div>
                          </div>)}
                      </div>
                    </div>}


                  {/* Additional Notes */}
                  {analysis.additionalNotes && <div className="p-4 bg-gradient-to-r from-[#FFF0F5] to-[#FFE4F0] rounded-xl border border-[#E91E8C]/20">
                      <h3 className="font-bold text-[#C2185B] mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#E91E8C] rounded-full"></span>
                        คำแนะนำเพิ่มเติม
                      </h3>
                      <p className="text-sm text-gray-700">{analysis.additionalNotes}</p>
                    </div>}

                  {/* Raw Analysis (fallback) */}
                  {analysis.rawAnalysis && !analysis.recommendations && <div className="p-4 bg-gradient-to-r from-[#FFF0F5] to-[#FFE4F0] rounded-xl border border-[#E91E8C]/20">
                      <h3 className="font-bold text-[#C2185B] mb-2">ผลการวิเคราะห์</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.rawAnalysis}</p>
                    </div>}

                  {/* Share Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button onClick={handleDownload} disabled={generatingImage} className="flex-1 bg-gradient-to-r from-[#9C27B0] to-[#BA68C8] hover:opacity-90 font-semibold h-12">
                      {generatingImage ? <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          กำลังสร้างรูป...
                        </> : <>
                          <Download className="w-5 h-5 mr-2" />
                          ดาวน์โหลดรูปผล
                        </>}
                    </Button>
                    
                    <Button onClick={handleShare} disabled={generatingImage} className="flex-1 bg-gradient-to-r from-[#E91E8C] to-[#F06292] hover:opacity-90 font-semibold h-12">
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
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-gray-700 text-center">
                      💡 <strong>วิธีแชร์ใน Instagram Story:</strong> กดดาวน์โหลดรูป → เปิด Instagram → เพิ่ม Story → เลือกรูปที่ดาวน์โหลด
                    </p>
                  </div>
                </div>}
            </div>
          </Card>}

        {/* Singderm Brand Promotion Section */}
        <Card className="mt-6 border-2 border-[#E91E8C]/30 glass-card shadow-elegant overflow-hidden">

        {/* Hidden Result Image for Generation */}
        <div className="fixed -left-[9999px] -top-[9999px]">
          {analysis && uploadedImageUrl && <ResultImage key={`result-${Date.now()}`} ref={resultImageRef} analysis={analysis} imageUrl={uploadedImageUrl} />}
        </div>
          <div className="bg-gradient-to-r from-[#E91E8C] via-[#F06292] to-[#E91E8C] px-4 py-4">
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
              <div className="text-center p-3 bg-gradient-to-br from-[#FFF0F5] to-[#FFE4F0] rounded-xl border border-[#E91E8C]/20">
                <div className="text-2xl mb-1">🏆</div>
                <p className="text-xs font-semibold text-[#C2185B]">มาตรฐานสากล</p>
              </div>
              
              <div className="text-center p-3 bg-gradient-to-br from-[#FFF0F5] to-[#FFE4F0] rounded-xl border border-[#E91E8C]/20">
                <div className="text-2xl mb-1">CN</div>
                <p className="text-xs font-semibold text-[#C2185B]">Made in China</p>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-[#FFF0F5] to-[#FFE4F0] rounded-xl border border-[#E91E8C]/20">
                <div className="text-2xl mb-1">💎</div>
                <p className="text-xs font-semibold text-[#C2185B]">คุณภาพพรีเมียม</p>
              </div>
            </div>

            {/* Official Importer */}
            <div className="bg-gradient-to-r from-[#E91E8C]/10 to-[#F06292]/10 border-2 border-[#E91E8C]/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#F06292] flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#C2185B] mb-1">นำเข้าโดย Pola Group จำกัด</h3>
                  <p className="text-sm text-gray-700">ผู้นำเข้าเพียงรายเดียวในประเทศไทย รับประกันของแท้ 100%</p>
                </div>
              </div>
            </div>

            {/* Product Lines */}
            <div>
              <h3 className="font-bold text-[#C2185B] text-xl mb-4 text-center">
                ผลิตภัณฑ์ที่แนะนำ
              </h3>
              
              <div className="space-y-4">
                {/* Hyaluronic Acid Dermal Filler */}
                <div className="p-4 bg-white rounded-xl border-2 border-[#E91E8C]/20 hover:border-[#E91E8C]/40 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#F06292] flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">💧</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#C2185B] mb-2">Hyaluronic Acid Dermal Filler</h4>
                      <p className="text-sm text-gray-700 mb-2">ฟิลเลอร์กรดไฮยาลูรอนิก ใช้สำหรับการเติมเต็มให้แก่ผิวบนใบหน้า</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-[#E91E8C] mt-0.5">•</span>
                          <span>ช่วยแก้ไขร่องลึก ปรับรูปหน้าให้มีมิติ</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#E91E8C] mt-0.5">•</span>
                          <span>คืนความอ่อนเยาว์ ความสดใส เป็นธรรมชาติ</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Collagen Stimulating Filler */}
                <div className="p-4 bg-white rounded-xl border-2 border-[#E91E8C]/20 hover:border-[#E91E8C]/40 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F06292] to-[#E91E8C] flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#C2185B] mb-2">Collagen Stimulating Filler</h4>
                      <p className="text-sm text-gray-700 mb-2">ฟิลเลอร์ช่วยเติมเต็มผิว พร้อมกระตุ้นการสร้างคอลลาเจนใหม่</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-[#E91E8C] mt-0.5">•</span>
                          <span>เพิ่มความยืดหยุ่น ความกระชับ</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#E91E8C] mt-0.5">•</span>
                          <span>ช่วยให้ผิวดูเรียบเนียน ลดเลือนริ้วรอยได้อย่างยาวนาน</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Skin Booster */}
                <div className="p-4 bg-white rounded-xl border-2 border-[#E91E8C]/20 hover:border-[#E91E8C]/40 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#F06292] flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">✨</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#C2185B] mb-2">Skin Booster</h4>
                      <p className="text-sm text-gray-700 mb-2">สกินบูสเตอร์ ใช้ในการบำรุง เติมเต็มความชุ่มชื้นสู่ผิวจากภายใน</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-[#E91E8C] mt-0.5">•</span>
                          <span>พร้อมช่วยฟื้นฟูสภาพผิวให้สดใส</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#E91E8C] mt-0.5">•</span>
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
            <div className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] rounded-xl p-5 text-white">
              <h3 className="font-bold text-xl mb-4 text-center">ทำไมต้องเลือก Singderm?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">✓</span>
                  <p className="text-sm">ผลิตภัณฑ์มาตรฐานสากลจากเกาหลี</p>
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
                  <p className="text-sm">ผลลัพธ์เป็นธรรมชาติ </p>
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
              <a href="https://singdermthailand.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#E91E8C] to-[#F06292] 
                         text-white font-bold rounded-full hover:opacity-90 transition-all shadow-elegant 
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