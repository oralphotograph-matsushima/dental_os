import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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
        - "front" (正面観 - Frontal intraoral view showing anterior teeth)
        - "right" (右側観 - Right lateral intraoral view)
        - "left" (左側観 - Left lateral intraoral view)
        - "right_overjet" (右側オーバージェット/側方観 - Right overjet/lateral view showing anterior overbite from the right side)
        - "left_overjet" (左側オーバージェット/側方観 - Left overjet/lateral view showing anterior overbite from the left side)
        - "upper" (上顎咬合面観 - Upper/Maxillary occlusal view, typically taken with a mirror)
        - "lower" (下顎咬合面観 - Lower/Mandibular occlusal view, typically taken with a mirror)
        - "facial" (顔貌 - Extraoral facial view, resting profile or frontal)
        - "smile" (スマイル - Extraoral facial view, smiling showing teeth)
        - "other" (その他 - X-rays, documents, or unidentifiable)
        
        Output a strictly valid JSON object with a single key "results" which contains an array of objects. Each object must have:
        - "filename": The filename of the image as provided.
        - "view": The identified category (one of: "front", "right", "left", "right_overjet", "left_overjet", "upper", "lower", "facial", "smile", "other").
        - "confidence": A number from 0 to 1 indicating your confidence.
        
        Example Output:
        {
          "results": [
            {"filename": "IMG_001.jpg", "view": "front", "confidence": 0.95},
            {"filename": "IMG_002.jpg", "view": "smile", "confidence": 0.92}
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
