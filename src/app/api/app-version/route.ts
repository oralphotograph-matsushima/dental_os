import { NextResponse } from 'next/server';

export async function GET() {
  // ここに最新のバージョン情報を記載します。
  // クラウド（Vercel）側が持つ情報であり、各クリニックのローカルアプリが起動時にこの値をチェックします。
  return NextResponse.json({
    latestVersion: "0.1.4", // 最新のアプリバージョン
    downloadUrl: "https://drive.google.com/drive/folders/1Y9FkzWJG28WG65s7SHqQDw2W48VYrSbf?usp=sharing", // 先ほどのGoogle Drive配布フォルダ
    releaseNotes: "画像転送（Wireless Connect）機能と、無料お試し機能を最適化しました。",
    isMandatory: false // 強制アップデートにする場合はtrue（将来用）
  });
}
