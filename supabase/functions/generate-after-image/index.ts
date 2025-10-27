import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, analysis } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating after image from:', imageUrl);

    // Build prompt from analysis
    let enhancementPrompt = 'แก้ไขภาพนี้เพื่อแสดงผลหลังเติมฟิลเลอร์ โดย';
    
    if (analysis?.recommendations && Array.isArray(analysis.recommendations)) {
      analysis.recommendations.forEach((rec: any, index: number) => {
        enhancementPrompt += `\n${index + 1}. ${rec.area}: ${rec.benefit}`;
      });
    }
    
    enhancementPrompt += `\n\nทำให้ใบหน้าดูกระชับขึ้น สดใสขึ้น มีมิติมากขึ้น แต่ยังคงความเป็นธรรมชาติ ไม่เกินจริง`;

    console.log('Enhancement prompt:', enhancementPrompt);

    // Generate a new image based on the analysis using Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `สร้างภาพใบหน้าของผู้หญิงเอเชียที่มีลักษณะตามที่อธิบาย: ${enhancementPrompt}

โปรดสร้างภาพที่:
- แสดงผลลัพธ์หลังการฉีดฟิลเลอร์ที่ดูเป็นธรรมชาติ
- ใบหน้ากระชับ สดใส มีมิติ
- ริมฝีปากอิ่มกลม สมดุล
- ใต้ตาเรียบเนียน ไม่หมองคล้ำ
- ดูอ่อนเยาว์แต่ไม่เกินจริง
- ภาพถ่ายคุณภาพสูง แสงสว่างนุ่มนวล`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'เกินขอบเขตการใช้งาน กรุณาลองใหม่ภายหลัง' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'จำเป็นต้องเติมเครดิต กรุณาติดต่อผู้ดูแลระบบ' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`Failed to generate after image: ${errorText}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the generated image
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated in response');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: generatedImage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-after-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างภาพ' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});