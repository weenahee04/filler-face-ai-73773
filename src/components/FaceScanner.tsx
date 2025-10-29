import { useEffect, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
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
      {/* Header */}
      <div className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] px-4 py-3 flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">สแกนใบหน้าด้วย AI</h2>
        <Button
          onClick={handleClose}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#E91E8C] animate-spin" />
            <p className="text-white">กำลังเตรียมกล้อง...</p>
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

            {/* Face detection guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-80 border-4 rounded-full opacity-30"
                style={{ borderColor: faceDetected ? "#00FF00" : "#E91E8C" }}
              />
            </div>

            {/* Status indicator */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
              <p className={`text-sm font-semibold ${faceDetected ? "text-green-400" : "text-white"}`}>
                {faceDetected ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    ✓ ตรวจพบใบหน้า - กำลังถ่ายภาพ...
                  </span>
                ) : (
                  "วางใบหน้าให้อยู่ในกรอบ"
                )}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Manual capture button */}
      {!isLoading && (
        <div className="bg-black/90 px-4 py-4 flex justify-center">
          <Button
            onClick={capturePhoto}
            size="lg"
            className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] hover:opacity-90 font-semibold"
          >
            <Camera className="w-5 h-5 mr-2" />
            ถ่ายภาพ
          </Button>
        </div>
      )}
    </div>
  );
};
