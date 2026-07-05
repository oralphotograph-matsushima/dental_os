import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { image } = await request.json(); // base64 data URL

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは優秀な歯科助手およびOCRデータ変換AIです。提供された画像は、歯科医院の本日（またはある一日）の「アポイント予定一覧（アポイント帳、予約システム画面、あるいは印刷された予約紙）」です。
この画像に書かれている患者の名前と患者ID（カルテ番号、登録ナンバー）をすべて読み取り、以下のルールに従ってクリーンなJSONオブジェクトとして出力してください。

【抽出・変換の絶対ルール】
1. 予約されている患者の「ID番号（例: C1002, 104, 3051, 88 など）」と「氏名（苗字）」を読み取ってください。
2. 患者IDがどうしても見つからない場合は、名前から推測するか、空文字にしてください。英数字混じりのIDであればそのまま抽出してください。
3. 氏名の表記（漢字・ひらがな等）から、必ず「苗字のみ」を切り出し、かつ「全角カタカナ」に変換してください（例：「山田 太郎」→「ヤマダ」、「佐藤」→「サトウ」、「田中」→「タナカ」、「オザキ」→「オザキ」）。苗字のみにすること、および全角カタカナにすることは個人情報保護および統一したファイル管理のために絶対厳守してください。
4. カタカナ化した苗字と患者IDを結合して「ID_カタカナ苗字」の形式で "name" フィールドに格納してください。（例: IDが "1024"、苗字が "ヤマダ" の場合、"1024_ヤマダ" となります。IDがない場合はカタカナ苗字のみにしてください）。
5. 歯科医師名、歯科衛生士名、チェアー番号（「1番チェアー」など）、時間（「9:30」など）、処置予定（「CR充填」「スケーリング」など）は、絶対に患者名として抽出しないでください。
6. 重複した患者がアポイント表に複数回現れる場合は、1つにまとめてください。

【出力フォーマット】
必ず以下のJSONオブジェクト形式で出力してください：
{
  "patients": [
    { "id": "患者ID", "name": "患者ID_カタカナ苗字" }
  ]
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "このアポイント予定表画像から、本日の患者リストを抽出してJSONで出力してください。"
            },
            {
              type: "image_url",
              image_url: {
                url: image
              }
            }
          ]
        }
      ],
      temperature: 0.1,
    });

    const resultText = response.choices[0].message.content || "{}";
    const result = JSON.parse(resultText);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Parse appointment image error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse appointment image" },
      { status: 500 }
    );
  }
}
