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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header with Back Button */}
      <div className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 font-semibold"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            ย้อนกลับ
          </Button>
          <h2 className="text-white font-bold text-lg">สแกนใบหน้าด้วย AI</h2>
          <Button
            onClick={() => setShowInstructions(!showInstructions)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            title="คำแนะนำ"
          >
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Instructions Panel */}
      {showInstructions && !isLoading && (
        <div className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-sm px-4 py-4 border-b-2 border-white/20">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-white font-bold text-base mb-3 flex items-center gap-2">
              <Info className="w-5 h-5" />
              คำแนะนำในการสแกนใบหน้า
            </h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-white/90">
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>วางใบหน้าให้อยู่ตรงกลางกรอบ</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>อยู่ในที่ที่มีแสงสว่างเพียงพอ</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>มองตรงเข้ากล้องโดยตรง</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>ถอดแว่นตาและหมวก (ถ้ามี)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>ยิ้มเบาๆ หรือหน้าเป็นกลาง</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span>รอให้ระบบตรวจจับอัตโนมัติ</span>
              </div>
            </div>
            <Button
              onClick={() => setShowInstructions(false)}
              size="sm"
              className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
            >
              เข้าใจแล้ว เริ่มสแกน
            </Button>
          </div>
        </div>
      )}

      {/* Camera View */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-[#E91E8C] animate-spin" />
              <div className="absolute inset-0 rounded-full bg-[#E91E8C] opacity-20 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg mb-1">กำลังเตรียมกล้อง</p>
              <p className="text-white/70 text-sm">กรุณารอสักครู่...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="max-w-full max-h-full scale-x-[-1]"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Canvas overlay for detection */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 max-w-full max-h-full scale-x-[-1] mx-auto"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Face detection guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Main oval guide */}
              <div 
                className="w-64 h-80 border-4 rounded-full transition-all duration-300"
                style={{ 
                  borderColor: faceDetected ? "#00FF00" : "#E91E8C",
                  boxShadow: faceDetected 
                    ? "0 0 40px rgba(0, 255, 0, 0.5), inset 0 0 40px rgba(0, 255, 0, 0.2)" 
                    : "0 0 40px rgba(233, 30, 140, 0.5), inset 0 0 40px rgba(233, 30, 140, 0.2)"
                }}
              />
              
              {/* Corner guides */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-88">
                {/* Top left */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white/60 rounded-tl-2xl" />
                {/* Top right */}
                <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white/60 rounded-tr-2xl" />
                {/* Bottom left */}
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white/60 rounded-bl-2xl" />
                {/* Bottom right */}
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white/60 rounded-br-2xl" />
              </div>
            </div>

            {/* Status indicator */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className={`px-6 py-3 rounded-full backdrop-blur-md border-2 transition-all duration-300 ${
                faceDetected 
                  ? "bg-green-500/90 border-green-300" 
                  : "bg-black/70 border-white/30"
              }`}>
                <p className={`text-sm font-bold flex items-center gap-2 ${
                  faceDetected ? "text-white" : "text-white/90"
                }`}>
                  {faceDetected ? (
                    <>
                      <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      <Camera className="w-4 h-4" />
                      ตรวจพบใบหน้า - กำลังถ่ายภาพ...
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3 bg-[#E91E8C] rounded-full animate-pulse" />
                      วางใบหน้าให้อยู่ในกรอบ
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Tips at bottom */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10 max-w-md px-4">
              <div className="bg-black/80 backdrop-blur-md border-2 border-white/20 rounded-2xl px-6 py-4">
                <p className="text-white text-sm text-center leading-relaxed">
                  💡 <span className="font-semibold">เคล็ดลับ:</span> หากระบบไม่ตรวจพบใบหน้า<br/>
                  ให้ลองขยับเข้าใกล้กล้อง หรือเพิ่มแสงสว่าง
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Manual capture button */}
      {!isLoading && (
        <div className="bg-gradient-to-t from-black via-black/95 to-transparent px-4 py-6">
          <div className="max-w-md mx-auto space-y-3">
            <Button
              onClick={capturePhoto}
              size="lg"
              className="w-full bg-gradient-to-r from-[#E91E8C] to-[#F06292] hover:opacity-90 font-bold text-lg h-14 shadow-2xl"
            >
              <Camera className="w-6 h-6 mr-2" />
              ถ่ายภาพด้วยตัวเอง
            </Button>
            <p className="text-white/60 text-xs text-center">
              หรือรอให้ระบบถ่ายภาพอัตโนมัติเมื่อตรวจพบใบหน้า
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
