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
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl parameter' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing skin with image:', imageUrl);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `คุณเป็นผู้เชี่ยวชาญด้านผิวหนังและความงาม วิเคราะห์ภาพผิวหน้าอย่างละเอียดและให้คำแนะนำแบบมืออาชีพ

ให้วิเคราะห์และตอบกลับในรูปแบบ JSON ที่มีโครงสร้างดังนี้:
{
  "overall_score": <คะแนนสุขภาพผิวโดยรวม 0-100>,
  "skin_type": "<ระบุประเภทผิว: ผิวมัน, ผิวแห้ง, ผิวผสม, ผิวธรรมดา>",
  "issues": [
    {
      "name": "<ชื่อปัญหา เช่น สิว, รอยดำ, ริ้วรอย, รูขุมขนกว้าง>",
      "severity": "<ระดับความรุนแรง: เล็กน้อย, ปานกลาง, มาก>",
      "location": "<ตำแหน่งที่พบปัญหา>",
      "description": "<คำอธิบายปัญหาโดยละเอียด>"
    }
  ],
  "recommendations": {
    "treatments": [
      "<คำแนะนำการรักษา 1>",
      "<คำแนะนำการรักษา 2>"
    ],
    "products": [
      {
        "type": "<ประเภทผลิตภัณฑ์ เช่น เซรั่ม, ครีม>",
        "ingredient": "<ส่วนผสมหลักที่แนะนำ>",
        "benefit": "<ประโยชน์>"
      }
    ],
    "procedures": [
      {
        "name": "<ชื่อหัตถการ>",
        "description": "<คำอธิบาย>",
        "suitable_for": "<เหมาะสำหรับปัญหาใด>"
      }
    ]
  },
  "lifestyle_tips": [
    "<คำแนะนำการดูแลผิว 1>",
    "<คำแนะนำการดูแลผิว 2>"
  ],
  "prevention": [
    "<วิธีป้องกันปัญหาผิว 1>",
    "<วิธีป้องกันปัญหาผิว 2>"
  ]
}

วิเคราะห์อย่างละเอียดและให้คำแนะนำที่เป็นประโยชน์ เขียนทั้งหมดเป็นภาษาไทย`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'กรุณาวิเคราะห์ผิวหน้าในรูปภาพนี้อย่างละเอียด และให้คำแนะนำการดูแลและรักษา'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('⏱️ เกินขอบเขตการใช้งาน\n\nกรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
      }
      if (response.status === 402) {
        throw new Error('💳 เครดิต Lovable AI หมดแล้ว\n\nกรุณาไปที่ Settings → Workspace → Usage เพื่อเติมเครดิต');
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from AI');
    }

    console.log('AI Response:', content);

    // Parse JSON from content
    let analysis;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw content:', content);
      throw new Error('Failed to parse analysis result. Please try again.');
    }

    return new Response(
      JSON.stringify({ analysis }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in skin-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
