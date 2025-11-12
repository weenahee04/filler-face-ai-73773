/**
 * Browser compatibility checker for face scanning features
 */

export interface CompatibilityResult {
  isCompatible: boolean;
  missingFeatures: string[];
  browserInfo: string;
}

/**
 * Check if the browser supports all required features for face scanning
 */
export const checkBrowserCompatibility = (): CompatibilityResult => {
  const missingFeatures: string[] = [];
  
  // Check for MediaDevices API (camera access)
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    missingFeatures.push("Camera access (MediaDevices API)");
  }
  
  // Check for WebGL support (required for MediaPipe)
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  if (!gl) {
    missingFeatures.push("WebGL graphics acceleration");
  }
  
  // Check for WebAssembly support (required for MediaPipe)
  if (typeof WebAssembly === 'undefined') {
    missingFeatures.push("WebAssembly");
  }
  
  // Get browser info
  const userAgent = navigator.userAgent;
  let browserInfo = "Unknown browser";
  
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browserInfo = "Google Chrome";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browserInfo = "Safari";
  } else if (userAgent.includes("Firefox")) {
    browserInfo = "Mozilla Firefox";
  } else if (userAgent.includes("Edg")) {
    browserInfo = "Microsoft Edge";
  } else if (userAgent.includes("OPR") || userAgent.includes("Opera")) {
    browserInfo = "Opera";
  }
  
  return {
    isCompatible: missingFeatures.length === 0,
    missingFeatures,
    browserInfo
  };
};

/**
 * Get recommended browsers list
 */
export const getRecommendedBrowsers = (): string[] => {
  return [
    "Google Chrome (เวอร์ชัน 90 ขึ้นไป)",
    "Microsoft Edge (เวอร์ชัน 90 ขึ้นไป)",
    "Safari (เวอร์ชัน 14 ขึ้นไป)",
    "Firefox (เวอร์ชัน 88 ขึ้นไป)"
  ];
};

/**
 * Check if running on mobile device
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};
