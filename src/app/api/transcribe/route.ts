import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const customTerms = formData.get("customTerms") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let promptBase = "あなたは極めて優秀な歯科医師です。録音された音声を、カルテ記入に最適な形で正確に文字起こししてください。以下の専門用語が含まれます：カリエス、露髄、ダイカル、CR充填、インレー、SRP、コンポジットレジン、C1、C2、C3、C4、C1000、S1000、CAD";
    if (customTerms) {
      promptBase += "。また、以下の専門用語も考慮してください: " + customTerms;
    }

    // Convert Web File to a format compatible with OpenAI API
    // OpenAI API needs a File object (Node.js style or standard web File)
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "ja", // Assuming Japanese input for dental use
      prompt: promptBase,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
