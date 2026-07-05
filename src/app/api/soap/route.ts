import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DENTAL_SOAP_PROMPT = `あなたは「クラッセ歯科」および「セントレース歯科」のカルテ記入を担当する、極めて優秀な歯科医師です。録音された音声データから、患者ごとのやり取りを正確に区別し、Obsidianにそのまま保存できる完璧なMarkdownフォーマットで出力してください。

【厳守する基本ルール】
1. 音声の冒頭や内容で「治療計画」というキーワードが発せられた場合は、【治療計画モード】として以下の構成で出力してください。
   - 現在の状態：
   - 問題点：
   - 治療すべき内容：
   - 今後の予定：
   
2. それ以外（通常時）は、【カルテモード】として以下の構成で出力してください。
   - 治療内容：実際に行った処置の内容（例：ダイカルを置いてCR充填した など）
   - S：患者の主観的症状、主訴。「主訴なし」などの場合は「特になし」とのみ記載。
   - O：ドクターの客観的評価、視診、検査結果（例：カリエスが深く歯髄に近接している等）。
   - N）：次回以降の治療計画や予定（例：1ヶ月後問題なければCADインレー印象など）。
   ※ A(Assessment)とP(Plan)は記載せず、必ず上記の「治療内容」「S」「O」「N）」のフォーマットを使用してください。

3. 出力のフォーマットに関する絶対ルール：
   - 見出しのマークダウン（#）や、項目間の空行（改行スペース）は一切入れず、極力詰めて出力してください。
   - カルテモードの例：
治療内容：〜〜〜
S：〜〜〜
O：〜〜〜
N）：〜〜〜

4. 歯式の表記：右上「┘」、左上「└」、右下「┐」、左下「┌」を数字に付ける。例：右上5と右上6なら 65┘と表記する。
5. AIとしての挨拶や解説は一切不要。
6. 文字起こし特有のミス（「主祖」→「主訴」、「初見」→「所見」、「加封」→「充填/封鎖」、「臨床」→「印象」など）は歯科の専門知識で修正。また「キャド」は「CAD」と表記。

【出力フォーマット】
以下のJSON構造で出力してください。
{
  "patientId": "患者ID（例：C1000、S1000など。音声から推測。不明なら空文字）",
  "patientNameKana": "患者の苗字カタカナ（例：オザキ、オオサキ。不明なら空文字）",
  "markdown": "カルテ（または治療計画）の本文。見出し（# など）は書かず、いきなり項目名から書き始めること。末尾にタグを入れること。"
}

__TAG_RULES_PLACEHOLDER__

以下の音声をカルテ化してください（本日の日付YYMMDDは、指示がなくても今日の日付を使用）：

`;

export async function POST(request: Request) {
  try {
    const { text, customTerms, outputLength, patientName, tagKeywords } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "").substring(2);

    const keywords = (tagKeywords && Array.isArray(tagKeywords))
      ? tagKeywords
      : ["写真撮影", "動画撮影", "矯正", "インプラント"];

    const tagRules = `**タグのルール（※Obsidianの[[リンク]]機能は一切使用せず、すべてハッシュタグにしてください）:**
1. 患者名、患者ID、疾患名、処置名、部位などのハッシュタグは一切出力「しないで」ください。
2. 入力された音声テキスト内に、以下のキーワードリストのいずれかが明確に含まれている場合のみ、そのキーワードをそのままハッシュタグ（例：#動画撮影）としてMarkdown本文の最後の行に半角スペース区切りで出力してください。それ以外のハッシュタグは一切出力しないでください。
キーワードリスト：[ ${keywords.map(k => `「${k}」`).join(', ')} ]`;

    let systemContent = DENTAL_SOAP_PROMPT.replace('__TAG_RULES_PLACEHOLDER__', tagRules) + `\n【本日の日付】: ${dateStr}`;
    
    if (patientName && patientName !== "不明") {
      systemContent += `\n\n【対象の患者情報】: ${patientName}\nこの音声テキストは、現在診療中の患者「${patientName}」に関するものです。音声の中に患者名が明示されていなくても、この患者の治療記録としてカルテを生成してください。出力結果のJSONの "patientId" や "patientNameKana" フィールドには、可能であればこの提供された患者情報を分析・パースして設定してください。`;
    }

    // 出力長に応じた指示の追加
    if (outputLength === "long") {
      systemContent += "\n\n【出力の長さに関する指示】: 入力された音声のディテールや熱量（細かい説明、雑談に近い補足、詳細な状態説明など）を一切カットせず、すべてカルテ上の適切な項目（OやSなど）に詳細に盛り込んでください。要約しすぎないことが極めて重要です。";
    } else {
      systemContent += "\n\n【出力の長さに関する指示】: 冗長な表現は省き、要点のみを極力コンパクトにまとめて要約して出力してください。";
    }

    if (customTerms) {
      systemContent += `\n\n【クリニック固有の専門用語・略語リスト】\n以下の用語・略語を優先して使用・解釈してください：\n${customTerms}\n`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Upgraded to gpt-4o for maximum intelligence and strict rule following
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemContent
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
    let finalPatientInfo = patientName || "";
    if (!finalPatientInfo || finalPatientInfo === "不明") {
      const pid = result.patientId || "不明ID";
      const pname = result.patientNameKana || "不明カナ";
      finalPatientInfo = `${pid}_${pname}`;
    }
    
    let soapText = result.markdown || "";

    return NextResponse.json({ soap: soapText, patientInfo: finalPatientInfo });
  } catch (error: any) {
    console.error("SOAP generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate SOAP" },
      { status: 500 }
    );
  }
}
