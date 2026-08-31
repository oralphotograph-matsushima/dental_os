import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/appVersion';

export async function GET() {
  return NextResponse.json({
    latestVersion: APP_VERSION,
    downloadUrl: "https://drive.google.com/drive/folders/1Y9FkzWJG28WG65s7SHqQDw2W48VYrSbf?usp=sharing",
    releaseNotes: `Wireless Connect ${APP_VERSION}\n・患者番号だけでフォルダを特定。空フォルダは作らない\n・カルテと口腔内写真を同じ患者フォルダへ。Obsidian は wikilink\n・配置確認 5/7/9、透過 PNG を患者フォルダへ保存\n・スライドタブは口腔内9枚を最上段、PNG のみ`,
    isMandatory: false
  });
}
