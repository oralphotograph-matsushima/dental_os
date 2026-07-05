import { NextResponse } from 'next/server';

export async function GET() {
  // ここに最新のバージョン情報を記載します。
  // クラウド（Vercel）側が持つ情報であり、各クリニックのローカルアプリが起動時にこの値をチェックします。
  return NextResponse.json({
    latestVersion: "1.2.0", // 最新のアプリバージョン
    downloadUrl: "https://drive.google.com/drive/folders/1Y9FkzWJG28WG65s7SHqQDw2W48VYrSbf?usp=sharing", // 先ほどのGoogle Drive配布フォルダ
    releaseNotes: "技工指示書の複数画像添付＆レイアウト強化アップデート（v1.2.0）。\n・シェード写真を最大4枚まで同時に添付・プレビューできるようになりました。\n・画像添付エリアのレイアウトを改善し、手書き指示書を左側、シェード写真を右側のグリッドに整理しました。\n・5枚以上の大量の写真を送信する場合に、Google Drive等の外部共有リンクを利用するよう促す注意書きを追加しました。",
    isMandatory: false // 強制アップデートにする場合はtrue（将来用）
  });
}
