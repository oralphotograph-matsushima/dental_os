import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const prompt = `
You are a dental AI assistant. The user will provide a voice transcription of a command to place annotations on a dental image.
Your job is to parse this natural language command and output a pure JSON array of actions.

Available marker types:
- 'implant': For placing implants (インプラント)
- 'arrow_mesial': For mesial movement arrow (近心移動)
- 'arrow_distal': For distal movement arrow (遠心移動)
- 'rotation': For rotation arrow (回転)
- 'caries': For caries/cavity circle (虫歯, C)
- 'bone_graft': For bone graft/periodontal disease marker (骨造成, 歯周病)

For the 'region' field, use standard dental notation if mentioned:
Upper Right 1-8 -> UR1 to UR8
Upper Left 1-8 -> UL1 to UL8
Lower Right 1-8 -> LR1 to LR8
Lower Left 1-8 -> LL1 to LL8
If no specific tooth is mentioned, just return 'center'.

Input text: "${text}"

Output strictly a JSON array, nothing else. Example:
[
  { "type": "implant", "region": "LR6" },
  { "type": "arrow_mesial", "region": "UL3" }
]
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }, // We will wrap the array in an object to satisfy json_object
    });

    // To use json_object, the prompt must ask for an object. Let's fix the prompt structure slightly in code:
    const finalPrompt = prompt + `\n\nReturn a JSON object with an 'actions' key containing the array: {"actions": [...]}`;
    
    const response2 = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = response2.choices[0].message.content || '{"actions":[]}';
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Annotation parse error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse annotation" }, { status: 500 });
  }
}
