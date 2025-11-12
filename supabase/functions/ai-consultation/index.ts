import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get auth user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);
    console.log('Processing messages for conversation:', conversationId);

    // System prompt for cosmetic surgery consultation
    const systemPrompt = `คุณเป็นที่ปรึกษาด้านศัลยกรรมความงามและการดูแลใบหน้าที่มีความเชี่ยวชาญ คุณสามารถ:

1. ให้คำปรึกษาเกี่ยวกับศัลยกรรมและหัตถการต่างๆ เช่น:
   - ฟิลเลอร์ (Filler) - จมูก แก้ม คาง ริมฝีปาก
   - โบท็อกซ์ (Botox) - ลดริ้วรอย กรามทื่อ
   - ไฮฟู (HIFU) - ยกกระชับใบหน้า
   - เลเซอร์ - รักษาสิว รอยดำ รอยแผลเป็น
   - ผ่าตัดตา คิ้ว จมูก แก้ม
   - ปรับรูปหน้า V-Shape

2. วิเคราะห์ภาพใบหน้าและให้คำแนะนำที่เหมาะสม
3. อธิบายขั้นตอน ข้อดี-ข้อเสีย และการดูแลหลังทำหัตถการ
4. แนะนำผลิตภัณฑ์และการดูแลผิว
5. ให้คำปรึกษาเรื่องความปลอดภัยและสถานพยาบาล

**สำคัญ:**
- ตอบเป็นภาษาไทยเสมอ ใช้น้ำเสียงเป็นมิตร เข้าใจง่าย
- อธิบายอย่างละเอียดแต่กระชับ
- แนะนำให้ปรึกษาแพทย์เฉพาะทางก่อนตัดสินใจทำหัตถการ
- ระบุราคาโดยประมาณถ้าสามารถ
- เตือนถึงความเสี่ยงและผลข้างเคียงที่อาจเกิดขึ้น`;

    // Prepare messages with system prompt
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => {
        if (msg.image_url) {
          return {
            role: msg.role,
            content: [
              { type: 'text', text: msg.content },
              { type: 'image_url', image_url: { url: msg.image_url } }
            ]
          };
        }
        return { role: msg.role, content: msg.content };
      })
    ];

    console.log('Calling Lovable AI with', aiMessages.length, 'messages');

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response received, length:', aiResponse.length);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-consultation function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});