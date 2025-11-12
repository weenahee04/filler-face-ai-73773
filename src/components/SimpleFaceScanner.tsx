import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, ArrowLeft, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleFaceScannerProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export const SimpleFaceScanner = ({ onCapture, onClose }: SimpleFaceScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const { toast } = useToast();

  // Start camera
  useEffect(() => {
    let mounted = true;
    
    const startCamera = async () => {
      console.log('Starting camera...');
      setIsLoading(true);
      
      try {
        // Stop existing stream if any
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        console.log('Requesting camera access with facing mode:', facingMode);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('Camera access granted');
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, starting playback');
            videoRef.current?.play();
            setIsLoading(false);
          };
        }

        toast({
          title: "✓ เปิดกล้องสำเร็จ",
          description: "วางใบหน้าในกรอบและกดถ่ายภาพ"
        });
      } catch (error) {
        console.error("Error accessing camera:", error);
        
        if (!mounted) return;

        let errorMessage = "กรุณาอนุญาตให้เข้าถึงกล้องในการตั้งค่าเบราว์เซอร์";
        
        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            errorMessage = "คุณไม่อนุญาตให้เข้าถึงกล้อง กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์";
          } else if (error.name === "NotFoundError") {
            errorMessage = "ไม่พบกล้องในอุปกรณ์ของคุณ";
          } else if (error.name === "NotReadableError") {
            errorMessage = "กล้องกำลังถูกใช้งานโดยแอปอื่น";
          }
        }
        
        toast({
          title: "ไม่สามารถเปิดกล้องได้",
          description: errorMessage,
          variant: "destructive",
          duration: 10000
        });
        
        setIsLoading(false);
        
        // Close after showing error
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        console.log('Cleaning up camera stream');
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, toast, onClose]);

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    const ctx = captureCanvas.getContext("2d");
    if (ctx) {
      // Mirror the image if using front camera
      if (facingMode === "user") {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -captureCanvas.width, 0, captureCanvas.width, captureCanvas.height);
      } else {
        ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
      }

      const imageData = captureCanvas.toDataURL("image/jpeg", 0.9);
      
      toast({
        title: "✓ ถ่ายภาพสำเร็จ",
        description: "กำลังประมวลผล..."
      });
      
      onCapture(imageData);
      handleClose();
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-accent/20 z-50 flex flex-col overflow-hidden">
      {/* Modern Header */}
      <div className="bg-background/80 backdrop-blur-xl px-4 py-3 flex-shrink-0 shadow-elegant border-b border-border/50">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-accent font-semibold h-9 px-3 flex-shrink-0 rounded-full transition-all hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span className="text-sm">กลับ</span>
          </Button>
          
          <div className="flex-1 text-center">
            <h2 className="text-foreground font-bold text-base md:text-lg flex items-center justify-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <span>ถ่ายภาพใบหน้า</span>
            </h2>
            <p className="text-muted-foreground text-xs mt-0.5">วางใบหน้าในกรอบและกดถ่าย</p>
          </div>
          
          <Button
            onClick={switchCamera}
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-accent h-9 w-9 p-0 flex-shrink-0 rounded-full transition-all hover:scale-105"
            title="สลับกล้อง"
            disabled={isLoading}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-gradient-to-br from-muted/50 to-background overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-8 h-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center px-4 glass-card py-4 px-6 rounded-2xl border border-border/50 animate-fade-in">
              <p className="text-foreground font-bold text-lg mb-1">กำลังเปิดกล้อง</p>
              <p className="text-muted-foreground text-sm">กรุณารอสักครู่...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />

            {/* Face Guide Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="relative transition-all duration-500"
                style={{ 
                  width: 'min(280px, 75vw)',
                  height: 'min(350px, 55vh)',
                }}
              >
                {/* Main Frame */}
                <div 
                  className="absolute inset-0 rounded-[50%] border-4 border-primary shadow-glow"
                  style={{ 
                    boxShadow: "0 0 40px hsl(var(--primary) / 0.4)"
                  }}
                />
                
                {/* Corner Markers */}
                {[
                  'top-0 left-0 border-t-4 border-l-4 rounded-tl-[50%]',
                  'top-0 right-0 border-t-4 border-r-4 rounded-tr-[50%]',
                  'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[50%]',
                  'bottom-0 right-0 border-b-4 border-r-4 rounded-br-[50%]'
                ].map((classes, index) => (
                  <div 
                    key={index}
                    className={`absolute ${classes} w-12 h-12 border-primary`}
                  />
                ))}
              </div>
            </div>

            {/* Instruction Badge */}
            <div className="absolute top-4 left-0 right-0 flex justify-center px-4 z-10 animate-fade-in">
              <div className="glass-card px-5 py-3 rounded-2xl border-2 border-primary/50 bg-background/90 shadow-elegant">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">วางใบหน้าในกรอบ</p>
                    <p className="text-xs text-muted-foreground">จัดให้ตรงกลางและกดถ่าย</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="absolute bottom-28 left-0 right-0 px-4 z-10 animate-fade-in">
              <div className="glass-card border border-border/50 rounded-2xl px-4 py-3 max-w-md mx-auto shadow-card">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">💡</span>
                  </div>
                  <div>
                    <p className="text-foreground text-xs font-semibold mb-1">เคล็ดลับ</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      หาที่มีแสงสว่างดี มองตรงกล้อง และถอดแว่นหรือหมวก
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Action Bar */}
      {!isLoading && (
        <div className="bg-background/95 backdrop-blur-xl px-4 py-5 flex-shrink-0 border-t border-border/50 shadow-elegant">
          <div className="max-w-md mx-auto">
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-full bg-primary hover:bg-primary-hover font-bold text-base h-14 rounded-2xl shadow-elegant transition-all duration-300 hover:scale-105"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-primary-foreground/20">
                <Camera className="w-5 h-5" />
              </div>
              <span>ถ่ายภาพ</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
