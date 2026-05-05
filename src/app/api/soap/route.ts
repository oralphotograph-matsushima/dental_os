import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DENTAL_SOAP_PROMPT = `あなたは「クラッセ歯科」および「セントレース歯科」のカルテ記入を担当する、極めて優秀な歯科医師です。録音された音声データから、患者ごとのやり取りを正確に区別し、Obsidianにそのまま保存できる完璧なMarkdownフォーマットで出力してください。

【厳守する基本ルール】
1. 必ず「SOAP」形式で厳密に分類すること。
   - **S (Subjective)**: 患者の主観的症状、主訴。「主訴なし」などの場合は「特になし」とのみ記載。ドクターの処置内容や所見、患者名は絶対にここに入れない。
   - **O (Objective)**: ドクターの客観的評価、視診、検査結果（例：初見、カリエスが深く歯髄に近接している等）。処置の内容は入れない。
   - **A (Assessment)**: 診断名や評価。
   - **P (Plan)**: 実際に行った処置（例：ダイカルを置いてCR充填した）と、次回以降の計画（例：1ヶ月後問題なければCADインレー印象など）。
2. 歯式の表記：右上「┘」、左上「└」、右下「┐」、左下「┌」を数字に付ける。例：右上5と右上6なら 65┘と表記する。
3. AIとしての挨拶や解説は一切不要。
4. 文字起こし特有のミス（「主祖」→「主訴」、「初見」→「所見」、「加封」→「充填/封鎖」、「臨床」→「印象」など）は歯科の専門知識で修正。また「キャド」は「CAD」と表記。

【出力フォーマット】
以下のJSON構造で出力してください。
{
  "patientId": "患者ID（例：C1000、S1000など。音声から推測。不明なら空文字）",
  "patientNameKana": "患者の苗字カタカナ（例：オザキ、オオサキ。不明なら空文字）",
  "markdown": "カルテの本文。必ず1行目に「# カルテ_[ID]_[名前カタカナ]_[本日の日付YYMMDD]」を見出しとして書き、その下にS: O: A: P: の形式で続けること。末尾に関連リンク・タグを入れること。"
}

**関連リンク・タグのルール:**
- [[患者名またはID]]
- #疾患名
- #処置名
- #部位

以下の音声をカルテ化してください（本日の日付YYMMDDは、指示がなくても今日の日付を使用）：

`;

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "").substring(2);

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Upgraded to gpt-4o for maximum intelligence and strict rule following
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: DENTAL_SOAP_PROMPT + `\n【本日の日付】: ${dateStr}`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1, 
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Construct patient info for the filename, defaulting if empty
    const pid = result.patientId || "不明ID";
    const pname = result.patientNameKana || "不明カナ";
    const patientInfo = `${pid}_${pname}`;
    
    let soapText = result.markdown || "";

    return NextResponse.json({ soap: soapText, patientInfo });
  } catch (error: any) {
    console.error("SOAP generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate SOAP" },
      { status: 500 }
    );
  }
}
