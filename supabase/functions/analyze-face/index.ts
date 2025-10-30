import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== analyze-face function called ===');
  console.log('Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...');
    const { imageUrl } = await req.json();
    console.log('Received imageUrl:', imageUrl);
    
    if (!imageUrl) {
      console.error('No imageUrl provided');
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Starting face analysis with AI...');

    // Download image from storage and convert to base64
    console.log('Downloading image from storage...');
    let imageBase64: string;
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      
      // Convert to base64 in chunks to avoid call stack size exceeded
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);
      imageBase64 = `data:image/jpeg;base64,${base64}`;
      console.log('Image converted to base64, length:', imageBase64.length);
    } catch (downloadError) {
      console.error('Error downloading image:', downloadError);
      throw new Error('ไม่สามารถดาวน์โหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    }

    // Analyze face using Gemini Vision model
    console.log('Calling AI gateway...');
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
            content: `You are a professional facial analysis expert specializing in Chinese filler injections with over 15 years of experience. Analyze the image with exceptional detail and provide comprehensive recommendations in Thai language.

IMPORTANT: Only recommend Chinese filler brands and specify the exact brand names in your recommendations.

CRITICAL INSTRUCTIONS:
1. You MUST include a beautyScore object with overall score (0-100), percentile text, and explanation
2. Calculate the beauty score based on Thai beauty standards considering: facial symmetry, skin condition, proportions, harmony, and youthfulness
3. The percentile should indicate how the person ranks compared to average Thai population (e.g., 75 means better than 75% of Thai people)

CRITICAL: You MUST respond with ONLY valid JSON in this exact structure, nothing else:
{
  "faceShape": "รูปหน้า (กลม/รี/เหลี่ยม/หัวใจ/ยาว/เพชร) พร้อมคำอธิบายลักษณะเฉพาะ",
  "estimatedAge": {
    "range": "25-30 ปี",
    "exact": 27,
    "explanation": "อายุใบหน้าประเมินจากสภาพผิว ริ้วรอย ความยืดหยุ่นของผิว และความสมบูรณ์ของใบหน้า"
  },
  "beautyScore": {
    "overall": 75,
    "percentile": "คุณอยู่ในระดับ 75% เมื่อเทียบกับค่าเฉลี่ยของคนไทย หมายความว่าใบหน้าของคุณสวยงามกว่า 75% ของคนไทยทั่วไป",
    "explanation": "คะแนนนี้คำนวณจากความสมมาตรของใบหน้า สภาพผิว สัดส่วนของใบหน้า ความกลมกลืน และความอ่อนเยาว์ โดยเทียบกับมาตรฐานความงามของคนไทย"
  },
  "detailedAnalysis": {
    "skinCondition": "วิเคราะห์สภาพผิว เช่น ความชุ่มชื้น ริ้วรอย รูขุมขน จุดด่างดำ",
    "facialProportions": "วิเคราะห์สัดส่วนใบหน้า เช่น ความสมดุลระหว่างส่วนต่างๆ",
    "agingConcerns": "จุดที่แสดงอาการชรา เช่น ริ้วรอย หย่อนคล้อย ร่องลึก",
    "volumeLoss": "บริเวณที่เกิดการสูญเสียวอลลุ่ม",
    "skinProblems": "ปัญหาผิวหน้า เช่น สิว ฝ้า กระ รอยดำ",
    "skinTone": "วิเคราะห์โทนสีผิวและความสม่ำเสมอ",
    "facialSymmetry": "ความสมมาตรใบหน้าเป็นเปอร์เซ็นต์ (0-100%)",
    "skinHealth": "สุขภาพผิว - ความชุ่มชื้น ความยืดหยุ่น ความกระจ่างใส",
    "featureAnalysis": {
      "eyes": "วิเคราะห์รูปร่างและลักษณะดวงตา",
      "nose": "วิเคราะห์รูปร่างและลักษณะจมูก",
      "lips": "วิเคราะห์รูปร่างและลักษณะริมฝีปาก"
    }
  },
  "currentFeatures": "คำอธิบายลักษณะใบหน้าปัจจุบันโดยละเอียด 4-6 ประโยค วิเคราะห์ทุกส่วนของใบหน้าอย่างครบถ้วน",
  "recommendations": [
    {
      "area": "ชื่อบริเวณที่ต้องปรับปรุง (เช่น ร่องแก้มลึก, คางสั้น, หน้าผากแบน, โคนจมูก, ริมฝีปากบาง, ใต้ตาหมองคล้ำ, แนวกราม)",
      "amount": "ปริมาณที่แนะนำ (เช่น 0.5-1 cc, 1-2 cc)",
      "brand": "แบรนด์ฟิลเลอร์จีนที่แนะนำ (เช่น Singderm, Aquamid, Princess, Hyaluronic Acid)",
      "technique": "เทคนิคการฉีดที่เหมาะสม และประเภทของฟิลเลอร์",
      "benefit": "ผลลัพธ์ที่คาดหวังและการเปลี่ยนแปลงที่จะเห็นได้ชัดเจน อธิบายอย่างละเอียด",
      "duration": "ระยะเวลาที่ผลจะคงอยู่",
      "priority": "สูง หรือ กลาง หรือ ต่ำ",
      "reasoning": "เหตุผลว่าทำไมควรทำในลำดับความสำคัญนี้"
    }
  ],
  "treatmentPlan": {
    "immediate": "ขั้นตอนที่ควรทำในระยะแรก (3-6 เดือนแรก)",
    "followUp": "ขั้นตอนที่ควรติดตามในระยะถัดไป (6-12 เดือน)",
    "maintenance": "แผนการบำรุงรักษาระยะยาว"
  },
  "additionalNotes": "คำแนะนำเพิ่มเติมที่สำคัญ เช่น ข้อควรระวัง การดูแลหลังทำ และการปรับแผนการรักษาตามผลลัพธ์"
}

Analysis Guidelines:
- Provide 4-7 comprehensive recommendations prioritized by clinical importance
- Analyze ALL aspects: facial symmetry, volume loss, aging signs, proportions, skin problems, skin tone, skin health
- Estimate facial age based on: skin condition, wrinkles, elasticity, volume loss, and overall youthfulness
- Provide age range (e.g., "25-30 ปี") and exact estimate (e.g., 27)
- Give a beauty score from 0-100 comparing to average Thai facial standards
- The beauty score should consider: facial symmetry, skin condition, proportions, harmony, and youthfulness
- Explain the percentile ranking (e.g., 75% means better than 75% of Thai population)
- Analyze skin problems in detail: acne, melasma, dark spots, blemishes
- Evaluate skin tone uniformity and overall complexion
- Measure facial symmetry as a percentage (0-100%)
- Assess skin health: moisture, elasticity, radiance
- Analyze individual features: eye shape, nose shape, lip shape
- Consider the overall facial harmony and natural beauty enhancement
- MUST specify Chinese filler brands (e.g., Singderm, Aquamid, Princess, Hyaluronic Acid, etc.)
- Specify exact injection techniques and filler types when relevant
- Explain the reasoning behind each recommendation
- Address immediate concerns vs long-term maintenance

Rules:
- Respond ONLY with valid JSON, no markdown, no code blocks, no explanations
- Use Thai language for all text values
- priority must be exactly: "สูง" or "กลาง" or "ต่ำ"
- MUST include "brand" field with Chinese filler brand name for each recommendation
- MUST include "estimatedAge" object with "range" (string), "exact" (number), and "explanation" (string)
- MUST include "beautyScore" object with "overall" (number 0-100), "percentile" (string), and "explanation" (string)
- Do NOT include any cost or price information
- Be thorough and professional in your analysis`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'กรุณาวิเคราะห์ใบหน้าในภาพนี้อย่างละเอียดและครบถ้วน วิเคราะห์ทุกมิติของใบหน้า รวมถึงสัดส่วน ความสมมาตร ริ้วรอย และจุดที่ควรปรับปรุง จากนั้นให้คำแนะนำการเติมฟิลเลอร์แบบเป็นระบบและมืออาชีพ พร้อมแผนการรักษาที่ชัดเจน ตอบเป็น JSON เท่านั้น'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    console.log('AI gateway response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error - Status:', response.status);
      console.error('AI gateway error - Response:', errorText);
      
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
      
      throw new Error(`Failed to analyze image: ${response.status} - ${errorText}`);
    }

    console.log('Parsing AI response...');
    const data = await response.json();
    console.log('AI response data:', JSON.stringify(data).substring(0, 200));
    const analysisText = data.choices?.[0]?.message?.content;
    console.log('Analysis text length:', analysisText?.length || 0);
    
    if (!analysisText) {
      throw new Error('No analysis result received');
    }

    console.log('Raw AI response:', analysisText);

    // Parse JSON from the response with multiple strategies
    let analysisResult;
    try {
      // Strategy 1: Direct JSON parse
      analysisResult = JSON.parse(analysisText);
      console.log('Successfully parsed JSON directly');
    } catch (parseError) {
      console.log('Direct parse failed, trying to extract JSON from markdown...');
      
      try {
        // Strategy 2: Extract JSON from markdown code blocks
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         analysisText.match(/```\s*([\s\S]*?)\s*```/) ||
                         analysisText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const jsonText = jsonMatch[1] || jsonMatch[0];
          analysisResult = JSON.parse(jsonText);
          console.log('Successfully extracted and parsed JSON from markdown');
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (extractError) {
        console.error('Failed to parse JSON:', extractError);
        console.error('Raw response was:', analysisText);
        
        // Strategy 3: Return structured error with raw text
        analysisResult = {
          faceShape: "ไม่สามารถวิเคราะห์ได้",
          currentFeatures: "ระบบไม่สามารถประมวลผลภาพได้ในขณะนี้",
          recommendations: [
            {
              area: "ทั่วไป",
              amount: "-",
              benefit: "กรุณาลองอัปโหลดภาพใหม่ที่ชัดเจนขึ้น",
              priority: "กลาง",
              estimatedCost: 0
            }
          ],
          totalEstimatedCost: 0,
          additionalNotes: "เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่อีกครั้ง",
          rawAnalysis: analysisText,
          parseError: true
        };
      }
    }

    // Validate the structure
    if (!analysisResult.recommendations || !Array.isArray(analysisResult.recommendations)) {
      console.warn('Invalid recommendations structure, using raw text');
      analysisResult = {
        rawAnalysis: analysisText,
        error: 'Invalid response structure',
        faceShape: "ไม่ระบุ",
        recommendations: []
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisResult 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-face function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการวิเคราะห์' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});