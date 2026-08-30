import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// 部位の提案だけ。ミラー反転は確定しない。口腔内写真は医院PC完結が正なので、
// この Vision 呼び出しは暫定。確認UI（LayoutConfirm）はエンジン差し替え可能。

// APIRoute handler for image analysis
export async function POST(req: Request) {
  try {
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Prepare content array for OpenAI Vision
    // Prompt: Identify the view of each dental photo
    const content: any[] = [
      {
        type: "text",
        text: `You are an expert dental assistant. I will provide you with several intraoral or facial photographs.
        For each photograph, identify the view from the following categories:
        - "front" (正面観 - Frontal intraoral view showing anterior teeth, closed)
        - "front_half" (正面半開口 - Frontal intraoral, teeth slightly apart)
        - "coupling" (前歯部カップリング／煽り - Anterior coupling / low-angle view of incisors)
        - "right" (右側観 - Right lateral intraoral view)
        - "left" (左側観 - Left lateral intraoral view)
        - "right_overjet" (右側オーバージェット/側方観)
        - "left_overjet" (左側オーバージェット/側方観)
        - "upper" (上顎咬合面観 - Upper occlusal, often via a mirror)
        - "lower" (下顎咬合面観 - Lower occlusal, often via a mirror)
        - "facial" (顔貌)
        - "smile" (スマイル)
        - "other" (その他)
        
        Also judge whether the photo looks like a dental-mirror shot that may need flip correction.
        Do NOT apply the flip. Only flag it. Left/right anatomy must be confirmed by a human.
        
        Output a strictly valid JSON object with a single key "results" which contains an array of objects. Each object must have:
        - "filename": The filename of the image as provided.
        - "view": One of: "front", "front_half", "coupling", "right", "left", "right_overjet", "left_overjet", "upper", "lower", "facial", "smile", "other".
        - "confidence": A number from 0 to 1.
        - "mirrorSuspected": true if this likely needs left-right or up-down flip because it was taken via a mirror. false otherwise.
        - "suggestedFlip": "none" | "H" | "V" | "HV"  (suggestion only; never treat as applied)
        
        Example Output:
        {
          "results": [
            {"filename": "IMG_001.jpg", "view": "front", "confidence": 0.95, "mirrorSuspected": false, "suggestedFlip": "none"},
            {"filename": "IMG_002.jpg", "view": "upper", "confidence": 0.9, "mirrorSuspected": true, "suggestedFlip": "V"}
          ]
        }
        `
      }
    ];

    // Append all images
    for (const img of images) {
      content.push({
        type: "text",
        text: `Filename: ${img.filename}`
      });
      content.push({
        type: "image_url",
        image_url: {
          url: img.base64,
          detail: "low" // Save tokens/cost since we just need to identify the view
        }
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: content,
        }
      ],
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0].message.content || '{"results": []}';
    const parsedData = JSON.parse(resultText);
    
    return NextResponse.json({ results: parsedData.results || [] });

  } catch (error: any) {
    console.error('Error in analyze API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
