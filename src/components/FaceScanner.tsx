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

    let lastVideoTime = -1;
    let consecutiveDetections = 0;

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
        consecutiveDetections++;
        setFaceDetected(true);

        // Draw detection boxes
        detections.detections.forEach((detection) => {
          const bbox = detection.boundingBox;
          if (bbox) {
            // Draw bounding box
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 3;
            ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);

            // Draw keypoints
            detection.keypoints?.forEach((keypoint) => {
              ctx.fillStyle = "#00FF00";
              ctx.beginPath();
              ctx.arc(keypoint.x, keypoint.y, 3, 0, 2 * Math.PI);
              ctx.fill();
            });
          }
        });

        // Auto capture after 3 consecutive detections (about 1 second)
        if (consecutiveDetections >= 3) {
          capturePhoto();
          return;
        }
      } else {
        consecutiveDetections = 0;
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* Fixed Compact Header */}
      <div className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] px-3 py-2.5 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 font-semibold h-8 px-2 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="text-sm">กลับ</span>
          </Button>
          <h2 className="text-white font-bold text-sm flex-1 text-center truncate">สแกนใบหน้า AI</h2>
          <Button
            onClick={() => setShowInstructions(!showInstructions)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 w-8 p-0 flex-shrink-0"
            title="คำแนะนำ"
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Compact Instructions */}
      {showInstructions && !isLoading && (
        <div className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 px-3 py-2.5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold text-xs flex items-center gap-1">
              <Info className="w-3 h-3" />
              คำแนะนำ
            </h3>
            <Button
              onClick={() => setShowInstructions(false)}
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white h-5 text-[10px] px-1.5"
            >
              ซ่อน
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-white/90">
            <div className="flex items-center gap-1">
              <span className="text-green-400">✓</span>
              <span>วางหน้าตรงกลาง</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-400">✓</span>
              <span>แสงสว่างพอ</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-400">✓</span>
              <span>มองตรงกล้อง</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-400">✓</span>
              <span>ถอดแว่นหมวก</span>
            </div>
          </div>
        </div>
      )}

      {/* Camera View - ใช้พื้นที่ส่วนที่เหลือทั้งหมด */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-[#E91E8C] animate-spin" />
              <div className="absolute inset-0 rounded-full bg-[#E91E8C] opacity-20 animate-ping" />
            </div>
            <div className="text-center px-4">
              <p className="text-white font-bold text-base mb-0.5">กำลังเตรียมกล้อง</p>
              <p className="text-white/60 text-xs">กรุณารอสักครู่...</p>
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

            {/* Face guide - ปรับขนาดตามหน้าจอ */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Main oval - responsive size */}
              <div 
                className="border-[3px] rounded-full transition-all duration-300"
                style={{ 
                  width: 'min(240px, 70vw)',
                  height: 'min(300px, 50vh)',
                  borderColor: faceDetected ? "#00FF00" : "#E91E8C",
                  boxShadow: faceDetected 
                    ? "0 0 30px rgba(0, 255, 0, 0.4)" 
                    : "0 0 30px rgba(233, 30, 140, 0.4)"
                }}
              />
            </div>

            {/* Status - ติดด้านบน */}
            <div className="absolute top-3 left-0 right-0 flex justify-center px-3 z-10">
              <div className={`px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300 ${
                faceDetected 
                  ? "bg-green-500/90 border-green-400" 
                  : "bg-black/70 border-white/30"
              }`}>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  {faceDetected ? (
                    <>
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <Camera className="w-3.5 h-3.5" />
                      <span>พบใบหน้า - กำลังถ่าย...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-[#E91E8C] rounded-full animate-pulse" />
                      <span>วางใบหน้าในกรอบ</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Tips - ติดด้านล่าง ไม่ทับปุ่ม */}
            {!faceDetected && (
              <div className="absolute bottom-24 left-0 right-0 px-4 z-10">
                <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 max-w-sm mx-auto">
                  <p className="text-white/90 text-[11px] text-center leading-relaxed">
                    💡 <span className="font-semibold">เคล็ดลับ:</span> หากไม่พบใบหน้า ให้ขยับเข้าใกล้กล้อง
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Button Bar - ติดด้านล่างเสมอ */}
      {!isLoading && (
        <div className="bg-gradient-to-t from-black via-black/98 to-black/90 px-4 py-4 flex-shrink-0 border-t border-white/5">
          <div className="max-w-sm mx-auto space-y-2">
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#F06292] hover:opacity-90 font-bold text-base h-12 shadow-xl"
            >
              <Camera className="w-5 h-5 mr-2" />
              ถ่ายภาพด้วยตัวเอง
            </Button>
            <p className="text-white/50 text-[10px] text-center leading-tight">
              หรือรอให้ระบบถ่ายอัตโนมัติ
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
