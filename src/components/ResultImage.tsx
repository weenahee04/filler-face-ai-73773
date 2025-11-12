import { forwardRef } from "react";
import { Sparkles } from "lucide-react";

interface ResultImageProps {
  analysis: any;
  imageUrl: string;
}

export const ResultImage = forwardRef<HTMLDivElement, ResultImageProps>(
  ({ analysis, imageUrl }, ref) => {
  return (
    <div
      ref={ref}
      className="w-[1080px] bg-gradient-to-br from-[#E91E8C] via-[#F06292] to-[#E91E8C] p-8 flex flex-col"
      style={{ fontFamily: 'system-ui, sans-serif', minHeight: '1920px' }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-white text-5xl font-bold mb-3 flex items-center justify-center gap-3">
          <Sparkles className="w-10 h-10" />
          ผลการวิเคราะห์ใบหน้า AI
        </h1>
        <div className="text-white/90 text-3xl font-bold">
          Pola <span className="text-white">AI</span>
        </div>
      </div>

      {/* Image */}
      <div className="bg-white rounded-2xl overflow-hidden mb-6 shadow-2xl">
        <img
          src={imageUrl}
          alt="Face"
          className="w-full h-[500px] object-cover"
        />
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Age */}
        {analysis.estimatedAge && (
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 text-center border-4 border-white/40">
            <div className="text-white/90 text-2xl font-semibold mb-2">อายุใบหน้า</div>
            <div className="text-white text-6xl font-bold">{analysis.estimatedAge.exact}</div>
            <div className="text-white/90 text-xl mt-1">ปี</div>
          </div>
        )}

        {/* Beauty Score */}
        {analysis.beautyScore && (
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 text-center border-4 border-white/40">
            <div className="text-white/90 text-2xl font-semibold mb-2">คะแนนความงาม</div>
            <div className="text-white text-6xl font-bold">{analysis.beautyScore.overall}</div>
            <div className="text-white/90 text-xl mt-1">/ 100</div>
          </div>
        )}
      </div>

      {/* Face Shape */}
      {analysis.faceShape && (
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-5 mb-4 border-4 border-white/40">
          <div className="text-white text-2xl font-bold mb-2">รูปหน้า</div>
          <div className="text-white/95 text-lg leading-relaxed">{analysis.faceShape}</div>
        </div>
      )}

      {/* Current Features */}
      {analysis.currentFeatures && (
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-5 mb-4 border-4 border-white/40">
          <div className="text-white text-2xl font-bold mb-2">ลักษณะปัจจุบัน</div>
          <div className="text-white/95 text-lg leading-relaxed">{analysis.currentFeatures}</div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-5 mb-4 border-4 border-white/40">
          <div className="text-white text-2xl font-bold mb-3 flex items-center justify-between">
            <span>คำแนะนำจาก AI</span>
            <span className="text-3xl">{analysis.recommendations.length} จุด</span>
          </div>
          <div className="space-y-3">
            {analysis.recommendations.map((rec: any, index: number) => (
              <div key={index} className="bg-white/10 rounded-xl p-4 border-2 border-white/30">
                <div className="flex items-start gap-3">
                  <div className="bg-white text-[#E91E8C] rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-xl mb-2">{rec.area}</div>
                    <div className="text-white/90 text-base leading-relaxed mb-2">{rec.suggestion}</div>
                    {rec.details && (
                      <div className="text-white/80 text-sm">{rec.details}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto text-center pt-6">
        <div className="text-white text-4xl font-bold mb-2">
          ✨ Pola <span className="text-white">AI</span> ✨
        </div>
        <div className="text-white/90 text-xl">Powered by Singderm Thailand</div>
        <div className="text-white/80 text-base mt-2">AI Face Analysis Technology</div>
      </div>
    </div>
  );
  }
);

ResultImage.displayName = "ResultImage";
