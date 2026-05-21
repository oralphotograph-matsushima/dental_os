import { NextResponse } from 'next/server';

export async function GET() {
  // ここに最新のバージョン情報を記載します。
  // クラウド（Vercel）側が持つ情報であり、各クリニックのローカルアプリが起動時にこの値をチェックします。
  return NextResponse.json({
    latestVersion: "1.1.1", // 最新のアプリバージョン
    downloadUrl: "https://drive.google.com/drive/folders/1Y9FkzWJG28WG65s7SHqQDw2W48VYrSbf?usp=sharing", // 先ほどのGoogle Drive配布フォルダ
    releaseNotes: "アプリ版のインストーラー安定性向上アップデート（v1.1.1）。\n・Windowsインストーラーを管理者権限不要のワンクリック形式に変更し、インストール/アンインストール時の権限エラーを解消しました。\n・自動アップデート機能の動作信頼性を高めました。",
    isMandatory: false // 強制アップデートにする場合はtrue（将来用）
  });
}
