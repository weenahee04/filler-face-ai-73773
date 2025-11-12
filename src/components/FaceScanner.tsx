import { useEffect, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, ArrowLeft, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FaceScannerProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export const FaceScanner = ({ onCapture, onClose }: FaceScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const detectionIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Initialize MediaPipe Face Detector
  useEffect(() => {
    const initializeFaceDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5
        });
        
        setFaceDetector(detector);
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing face detector:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดระบบตรวจจับใบหน้าได้",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };

    initializeFaceDetector();

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [toast]);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsDetecting(true);
          };
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        toast({
          title: "ไม่สามารถเปิดกล้องได้",
          description: "กรุณาอนุญาตให้เข้าถึงกล้องในการตั้งค่าเบราว์เซอร์",
          variant: "destructive"
        });
      }
    };

    if (!isLoading && faceDetector) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLoading, faceDetector, toast]);

  // Face detection loop
  useEffect(() => {
    if (!isDetecting || !faceDetector || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get primary color from CSS variable
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim();
    const primaryHSL = `hsl(${primaryColor})`;

    let lastVideoTime = -1;

    const detectFaces = () => {
      if (video.currentTime === lastVideoTime) {
        requestAnimationFrame(detectFaces);
        return;
      }
      lastVideoTime = video.currentTime;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Detect faces
      const detections = faceDetector.detectForVideo(video, Date.now());

      if (detections.detections.length > 0) {
        setFaceDetected(true);

        // Draw detection boxes
        detections.detections.forEach((detection) => {
          const bbox = detection.boundingBox;
          if (bbox) {
            // Draw bounding box with primary color
            ctx.strokeStyle = primaryHSL;
            ctx.lineWidth = 3;
            ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);

            // Draw keypoints
            detection.keypoints?.forEach((keypoint) => {
              ctx.fillStyle = primaryHSL;
              ctx.beginPath();
              ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
              ctx.fill();
            });
          }
        });
      } else {
        setFaceDetected(false);
      }

      requestAnimationFrame(detectFaces);
    };

    detectFaces();
  }, [isDetecting, faceDetector]);

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    const ctx = captureCanvas.getContext("2d");
    if (ctx) {
      // Mirror the image
      ctx.scale(-1, 1);
      ctx.drawImage(video, -captureCanvas.width, 0, captureCanvas.width, captureCanvas.height);

      const imageData = captureCanvas.toDataURL("image/jpeg", 0.85);
      onCapture(imageData);
      handleClose();
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsDetecting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-accent/20 z-50 flex flex-col overflow-hidden">
      {/* Modern Header with Glass Effect */}
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
              <Camera className="w-5 h-5 text-primary animate-pulse" />
              <span>สแกนใบหน้า AI</span>
            </h2>
            <p className="text-muted-foreground text-xs mt-0.5">วิเคราะห์ใบหน้าด้วยปัญญาประดิษฐ์</p>
          </div>
          
          <Button
            onClick={() => setShowInstructions(!showInstructions)}
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-accent h-9 w-9 p-0 flex-shrink-0 rounded-full transition-all hover:scale-105"
            title="คำแนะนำ"
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Modern Instructions Card */}
      {showInstructions && !isLoading && (
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 py-4 border-b border-border/50 flex-shrink-0 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground font-bold text-sm flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                คำแนะนำการใช้งาน
              </h3>
              <Button
                onClick={() => setShowInstructions(false)}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-7 text-xs px-2 rounded-full"
              >
                ซ่อน
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: "📸", text: "วางหน้าตรงกลาง" },
                { icon: "💡", text: "แสงสว่างพอเพียง" },
                { icon: "👀", text: "มองตรงกล้อง" },
                { icon: "👓", text: "ถอดแว่นและหมวก" }
              ].map((tip, index) => (
                <div 
                  key={index}
                  className="glass-card p-3 rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tip.icon}</span>
                    <span className="text-xs text-foreground font-medium">{tip.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Camera View with Modern Frame */}
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
              <p className="text-foreground font-bold text-lg mb-1">กำลังเตรียมกล้อง</p>
              <p className="text-muted-foreground text-sm">กรุณารอสักครู่...</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Video - เต็มพื้นที่ */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Canvas overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full scale-x-[-1]"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Modern Face Guide with Animated Border */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Animated Corner Indicators */}
              <div 
                className="relative transition-all duration-500 ease-out"
                style={{ 
                  width: 'min(280px, 75vw)',
                  height: 'min(350px, 55vh)',
                }}
              >
                {/* Main Frame */}
                <div 
                  className="absolute inset-0 rounded-[50%] transition-all duration-300"
                  style={{ 
                    border: `3px solid ${faceDetected ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)'}`,
                    boxShadow: faceDetected 
                      ? "0 0 40px hsl(var(--primary) / 0.6), inset 0 0 40px hsl(var(--primary) / 0.2)" 
                      : "0 0 30px hsl(var(--primary) / 0.3)"
                  }}
                />
                
                {/* Scanning Line Animation */}
                {!faceDetected && (
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"
                    style={{ top: '50%' }}
                  />
                )}
                
                {/* Corner Markers */}
                {[
                  'top-0 left-0',
                  'top-0 right-0',
                  'bottom-0 left-0',
                  'bottom-0 right-0'
                ].map((position, index) => (
                  <div 
                    key={index}
                    className={`absolute ${position} w-12 h-12 transition-all duration-300`}
                    style={{
                      borderColor: faceDetected ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)',
                      ...(index === 0 && { borderTop: '3px solid', borderLeft: '3px solid', borderTopLeftRadius: '50%' }),
                      ...(index === 1 && { borderTop: '3px solid', borderRight: '3px solid', borderTopRightRadius: '50%' }),
                      ...(index === 2 && { borderBottom: '3px solid', borderLeft: '3px solid', borderBottomLeftRadius: '50%' }),
                      ...(index === 3 && { borderBottom: '3px solid', borderRight: '3px solid', borderBottomRightRadius: '50%' })
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Modern Status Badge */}
            <div className="absolute top-4 left-0 right-0 flex justify-center px-4 z-10 animate-fade-in">
              <div className={`glass-card px-5 py-3 rounded-2xl border-2 transition-all duration-300 shadow-elegant ${
                faceDetected 
                  ? "border-primary bg-primary/10 scale-105" 
                  : "border-border bg-background/90"
              }`}>
                <div className="flex items-center gap-3">
                  {faceDetected ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                        <Camera className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">พบใบหน้าแล้ว!</p>
                        <p className="text-xs text-muted-foreground">พร้อมถ่ายภาพ</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">กำลังค้นหา...</p>
                        <p className="text-xs text-muted-foreground">วางใบหน้าในกรอบ</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Helpful Tips */}
            {!faceDetected && (
              <div className="absolute bottom-28 left-0 right-0 px-4 z-10 animate-fade-in">
                <div className="glass-card border border-border/50 rounded-2xl px-4 py-3 max-w-md mx-auto shadow-card">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-lg">💡</span>
                    </div>
                    <div>
                      <p className="text-foreground text-xs font-semibold mb-1">เคล็ดลับ</p>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        หากไม่พบใบหน้า ให้ขยับเข้าใกล้กล้องหรือเพิ่มแสงสว่าง
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modern Bottom Action Bar */}
      {!isLoading && (
        <div className="bg-background/95 backdrop-blur-xl px-4 py-5 flex-shrink-0 border-t border-border/50 shadow-elegant">
          <div className="max-w-md mx-auto space-y-3">
            <Button
              onClick={capturePhoto}
              disabled={!faceDetected}
              size="lg"
              className={`w-full font-bold text-base h-14 rounded-2xl shadow-elegant transition-all duration-300 ${
                faceDetected 
                  ? 'bg-primary hover:bg-primary-hover scale-105 hover:scale-110' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                faceDetected ? 'bg-primary-foreground/20' : 'bg-background'
              }`}>
                <Camera className="w-5 h-5" />
              </div>
              <span>{faceDetected ? 'ถ่ายภาพตอนนี้' : 'รอการตรวจจับใบหน้า'}</span>
            </Button>
            
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-all ${
                faceDetected ? 'bg-primary animate-pulse' : 'bg-muted'
              }`} />
              <p className="text-muted-foreground text-xs">
                {faceDetected ? 'พร้อมถ่ายภาพ' : 'กดปุ่มเมื่อพบใบหน้าในกรอบ'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
