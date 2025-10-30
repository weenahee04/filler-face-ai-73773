import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Sparkles, Calendar, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) {
        toast({
          title: "ไม่พบ ID",
          description: "ไม่พบข้อมูลโปรไฟล์",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      try {
        const { data: profile, error } = await (supabase as any)
          .from("face_analyses")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (!profile) {
          toast({
            title: "ไม่พบข้อมูล",
            description: "ไม่พบผลการวิเคราะห์นี้",
            variant: "destructive"
          });
          navigate("/");
          return;
        }

        setData(profile);
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดข้อมูลได้",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#FFF0F5] to-[#FFE4F0] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#E91E8C] mx-auto mb-4" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const analysis = data.analysis_result;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#FFF0F5] to-[#FFE4F0] water-ripple-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 px-3"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-lg md:text-xl font-bold tracking-wide">
                โปรไฟล์การวิเคราะห์ใบหน้า
              </h1>
              <p className="text-xs md:text-sm text-white/90 mt-0.5">
                ผลการวิเคราะห์จาก AI
              </p>
            </div>
            <div className="w-8" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Card */}
        <Card className="border-2 border-[#E91E8C]/20 glass-card shadow-card overflow-hidden mb-6">
          {/* Image Section */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#FFF0F5] to-[#FFE4F0]">
            <img
              src={data.image_url}
              alt="Face Analysis"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E91E8C]" />
                <span className="text-xs font-medium text-gray-700">
                  {new Date(data.created_at).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Analysis Details */}
          <div className="p-4 space-y-4">
            {/* Beauty Score */}
            {analysis?.beautyScore && (
              <Card className="border-2 border-[#E91E8C]/20 bg-gradient-to-br from-[#FFF0F5] to-[#FFE4F0] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-[#E91E8C]" />
                  <h3 className="text-base font-bold text-[#C2185B]">คะแนนความงาม</h3>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-[#E91E8C]">
                    {analysis.beautyScore.overall}
                  </span>
                  <span className="text-sm text-gray-600">/ 100</span>
                </div>
                <p className="text-xs text-gray-700 mb-1">
                  {analysis.beautyScore.percentile}
                </p>
                <p className="text-xs text-gray-600">
                  {analysis.beautyScore.explanation}
                </p>
              </Card>
            )}

            {/* Age & Face Shape */}
            <div className="grid grid-cols-2 gap-3">
              {analysis?.estimatedAge && (
                <Card className="border border-[#E91E8C]/20 bg-white p-3">
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">อายุโดยประมาณ</h4>
                  <p className="text-base font-bold text-[#C2185B]">
                    {analysis.estimatedAge.range}
                  </p>
                </Card>
              )}
              {analysis?.faceShape && (
                <Card className="border border-[#E91E8C]/20 bg-white p-3">
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">รูปหน้า</h4>
                  <p className="text-base font-bold text-[#C2185B]">
                    {analysis.faceShape.split(" ")[0]}
                  </p>
                </Card>
              )}
            </div>

            {/* Current Features */}
            {analysis?.currentFeatures && (
              <Card className="border border-[#E91E8C]/20 bg-white p-4">
                <h3 className="text-sm font-bold text-[#C2185B] mb-2">
                  ลักษณะใบหน้าปัจจุบัน
                </h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {analysis.currentFeatures}
                </p>
              </Card>
            )}

            {/* Recommendations */}
            {analysis?.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#C2185B] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E91E8C]" />
                  คำแนะนำจาก AI
                </h3>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec: any, idx: number) => (
                    <Card
                      key={idx}
                      className="border border-[#E91E8C]/20 bg-white p-3"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                          ${rec.priority === 'สูง' ? 'bg-red-100 text-red-600' : 
                            rec.priority === 'กลาง' ? 'bg-yellow-100 text-yellow-600' : 
                            'bg-green-100 text-green-600'}
                        `}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-[#C2185B] mb-1">
                            {rec.area}
                          </h4>
                          <p className="text-xs text-gray-700 mb-2">
                            {rec.benefit}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
                            <div>
                              <span className="font-semibold">ปริมาณ:</span> {rec.amount}
                            </div>
                            <div>
                              <span className="font-semibold">แบรนด์:</span> {rec.brand}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-[#E91E8C]/20 text-center">
              <p className="text-[10px] text-gray-500">
                ผลการวิเคราะห์นี้เป็นเพียงคำแนะนำเบื้องต้น<br/>
                ควรปรึกษาแพทย์ผู้เชี่ยวชาญก่อนตัดสินใจ
              </p>
            </div>
          </div>
        </Card>

        {/* Action Button */}
        <div className="text-center">
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] hover:opacity-90 h-12 px-6"
          >
            ทดลองวิเคราะห์ใบหน้าของคุณ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
