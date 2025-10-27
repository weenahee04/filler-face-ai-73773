import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  ArrowRight,
  Home,
  FileImage,
  Zap,
  Eye,
  ThumbsUp,
  Info,
} from "lucide-react";

const HowToUse = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      title: "อัปโหลดรูปภาพ",
      description: "เลือกรูปภาพใบหน้าที่ชัดเจน ถ่ายจากด้านหน้า แสงสว่างเพียงพอ",
      icon: Upload,
      color: "from-[#E91E8C] to-[#F06292]",
      tips: [
        "ถ่ายรูปใบหน้าตรง ไม่เอียง",
        "แสงสว่างชัดเจน ไม่มืดเกินไป",
        "ไม่สวมแว่นตา หรือสิ่งกีดขวางใบหน้า",
        "ผมไม่ปิดใบหน้า ควรเห็นหน้าผากและขอบหน้าชัดเจน",
      ],
      warning: "หลีกเลี่ยงรูปที่มีแสงแฟลชตรง เพราะจะทำให้การวิเคราะห์ไม่แม่นยำ",
    },
    {
      number: 2,
      title: "ยอมรับเงื่อนไข",
      description: "อ่านและยอมรับเงื่อนไขการใช้งาน เพื่อความเป็นส่วนตัวและความปลอดภัย",
      icon: CheckCircle2,
      color: "from-[#F06292] to-[#EC407A]",
      tips: [
        "ผลการวิเคราะห์เป็นเพียงการประเมินเบื้องต้น",
        "ควรปรึกษาแพทย์ผู้เชี่ยวชาญก่อนตัดสินใจ",
        "รูปภาพจะไม่ถูกจัดเก็บในระบบ",
        "ข้อมูลส่วนตัวของคุณปลอดภัย",
      ],
      warning: "กรุณาอ่านเงื่อนไขให้ครบถ้วนก่อนกดยอมรับ",
    },
    {
      number: 3,
      title: "AI วิเคราะห์ใบหน้า",
      description: "ระบบ AI จะวิเคราะห์ใบหน้าและหาจุดที่เหมาะสมสำหรับการฉีดฟิลเลอร์",
      icon: Sparkles,
      color: "from-[#EC407A] to-[#E91E8C]",
      tips: [
        "การวิเคราะห์ใช้เวลาประมาณ 10-30 วินาที",
        "AI จะวิเคราะห์สัดส่วนใบหน้า",
        "ระบุจุดที่ควรเติมฟิลเลอร์",
        "แนะนำปริมาณและประโยชน์",
      ],
      warning: "ห้ามปิดหน้าต่างระหว่างที่ AI กำลังวิเคราะห์",
    },
    {
      number: 4,
      title: "ดูผลการวิเคราะห์",
      description: "ตรวจสอบผลการวิเคราะห์พร้อมคำแนะนำโดยละเอียด",
      icon: Eye,
      color: "from-[#E91E8C] to-[#C2185B]",
      tips: [
        "อ่านคำแนะนำในแต่ละจุดอย่างละเอียด",
        "ดูปริมาณ (cc) ที่แนะนำ",
        "เข้าใจประโยชน์ที่จะได้รับ",
        "จดบันทึกข้อมูลสำคัญไว้",
      ],
      warning: "ปริมาณที่แนะนำอาจแตกต่างไปตามดุลยพินิจของแพทย์",
    },
    {
      number: 5,
      title: "บันทึกและแชร์",
      description: "ดาวน์โหลดผลการวิเคราะห์หรือแชร์ใน Social Media",
      icon: Download,
      color: "from-[#C2185B] to-[#AD1457]",
      tips: [
        "กดดาวน์โหลดเพื่อบันทึกรูปลงในเครื่อง",
        "กดแชร์เพื่อแชร์ผ่าน Instagram Story",
        "นำผลไปปรึกษาแพทย์ได้เลย",
        "เก็บไว้เป็นข้อมูลอ้างอิง",
      ],
      warning: "อย่าลืมนำผลไปปรึกษาแพทย์ก่อนตัดสินใจทำจริง",
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: "รวดเร็ว",
      description: "ผลออกภายใน 30 วินาที",
    },
    {
      icon: Sparkles,
      title: "แม่นยำ",
      description: "วิเคราะห์ด้วย AI ล้ำสมัย",
    },
    {
      icon: ThumbsUp,
      title: "ง่ายดาย",
      description: "ใช้งานง่าย ไม่ซับซ้อน",
    },
    {
      icon: CheckCircle2,
      title: "ปลอดภัย",
      description: "ไม่เก็บข้อมูลส่วนตัว",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#FFF0F5] to-[#FFE4F0] water-ripple-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold tracking-wide">
              วิธีการใช้งาน
            </h1>
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <Home className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm md:text-base text-white/90 mt-1">
            คู่มือการใช้งานแบบละเอียด
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Intro Section */}
        <Card className="mb-8 border-2 border-[#E91E8C]/20 glass-card shadow-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#E91E8C] to-[#F06292] flex items-center justify-center flex-shrink-0">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#C2185B] mb-2">
                ยินดีต้อนรับสู่ระบบวิเคราะห์ใบหน้าด้วย AI
              </h2>
              <p className="text-gray-700 leading-relaxed">
                ระบบของเราใช้ AI ล้ำสมัยในการวิเคราะห์ใบหน้าและแนะนำจุดที่เหมาะสมสำหรับการฉีดฟิลเลอร์ 
                ทำให้คุณได้รับคำแนะนำเบื้องต้นก่อนไปพบแพทย์ผู้เชี่ยวชาญ
              </p>
            </div>
          </div>
        </Card>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className="p-4 text-center border-2 border-[#E91E8C]/20 glass-card hover:shadow-elegant transition-all"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-[#E91E8C] to-[#F06292] flex items-center justify-center">
                <benefit.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-[#C2185B] mb-1">{benefit.title}</h3>
              <p className="text-sm text-gray-600">{benefit.description}</p>
            </Card>
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-8 mb-12">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="border-2 border-[#E91E8C]/20 glass-card shadow-card overflow-hidden"
            >
              {/* Step Header */}
              <div className={`bg-gradient-to-r ${step.color} px-6 py-4`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white/80 text-sm font-medium mb-1">
                      ขั้นตอนที่ {step.number}
                    </div>
                    <h3 className="text-white font-bold text-xl">{step.title}</h3>
                  </div>
                </div>
              </div>

              {/* Step Content */}
              <div className="p-6 space-y-4">
                <p className="text-gray-700 text-lg leading-relaxed">
                  {step.description}
                </p>

                {/* Tips */}
                <div className="bg-gradient-to-r from-[#FFF0F5] to-[#FFE4F0] rounded-xl p-4 border border-[#E91E8C]/20">
                  <h4 className="font-bold text-[#C2185B] mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5" />
                    เคล็ดลับ
                  </h4>
                  <ul className="space-y-2">
                    {step.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-start gap-2 text-gray-700">
                        <ArrowRight className="w-4 h-4 text-[#E91E8C] mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Warning */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-800 mb-1">ข้อควรระวัง</h4>
                      <p className="text-sm text-amber-700">{step.warning}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Important Note */}
        <Card className="mb-8 border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">
                ข้อควรทราบสำคัญ
              </h3>
              <ul className="space-y-2 text-amber-800">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>ผลการวิเคราะห์จาก AI เป็นเพียงการประเมินเบื้องต้นเท่านั้น</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>ควรปรึกษาแพทย์ผู้เชี่ยวชาญเพื่อรับคำแนะนำที่เหมาะสมกับคุณโดยตรง</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>การทำหัตถการฉีดฟิลเลอร์ต้องทำโดยแพทย์ผู้มีใบอนุญาตเท่านั้น</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>ปริมาณและตำแหน่งที่แนะนำอาจแตกต่างไปตามดุลยพินิจของแพทย์</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] hover:opacity-90 font-semibold h-12 px-8 text-base shadow-soft"
          >
            <Camera className="w-5 h-5 mr-2" />
            เริ่มวิเคราะห์ใบหน้า
          </Button>
          <Button
            variant="outline"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="border-2 border-[#E91E8C]/30 text-[#C2185B] hover:bg-[#FFF0F5] font-semibold h-12 px-8"
          >
            กลับด้านบน
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-[#E91E8C] to-[#F06292] text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            © 2024 Singderm AI Face Analysis. All rights reserved.
          </p>
          <p className="text-xs text-white/80 mt-2">
            ผลการวิเคราะห์เป็นเพียงการประเมินเบื้องต้น ควรปรึกษาแพทย์ผู้เชี่ยวชาญ
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HowToUse;
