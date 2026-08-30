import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/appVersion';

export async function GET() {
  return NextResponse.json({
    latestVersion: APP_VERSION,
    downloadUrl: "https://drive.google.com/drive/folders/1Y9FkzWJG28WG65s7SHqQDw2W48VYrSbf?usp=sharing",
    releaseNotes: `Wireless Connect ${APP_VERSION}\n・OralNote から Wireless Connect へ名称・保存パスを完全移行\n・未振り分け写真は Unassigned ではなく Patients 直下に置き、EXIF と当日アポで患者フォルダへ振り分け\n・カルテ履歴が旧 OralNote_Data を見て空になる不具合を修正`,
    isMandatory: false
  });
}
