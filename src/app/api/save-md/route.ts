import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: Request) {
  try {
    const { filename, content } = await req.json();

    if (!filename || !content) {
      return NextResponse.json({ error: 'filename and content are required' }, { status: 400 });
    }

    // デスクトップの OralNote_Data/Patients フォルダを基準にする
    const desktopPath = path.join(os.homedir(), 'Desktop');
    
    // ファイル名から患者フォルダ名を抽出 (例: カルテ_1234_山田太郎_260524.md -> 1234_山田太郎)
    let patientFolder = "Unassigned";
    if (filename.startsWith("カルテ_")) {
      const parts = filename.replace(".md", "").split("_");
      if (parts.length >= 3) {
        // カルテ_ID_名前_日付.md
        patientFolder = `${parts[1]}_${parts[2]}`;
      } else if (parts.length === 2) {
        // カルテ_名前.md
        patientFolder = parts[1];
      }
    } else {
      patientFolder = filename.replace(".md", "");
    }

    const patientDir = path.join(desktopPath, 'OralNote_Data', 'Patients', patientFolder);

    // フォルダが存在しない場合は作成
    if (!fs.existsSync(patientDir)) {
      fs.mkdirSync(patientDir, { recursive: true });
    }

    // セキュリティ対策: パストラバーサルを防ぐため、basename のみを使用
    const safeFilename = path.basename(filename);
    const filePath = path.join(patientDir, safeFilename);

    // ファイルに書き込む
    fs.writeFileSync(filePath, content, 'utf8');

    return NextResponse.json({ success: true, filePath });
  } catch (error: any) {
    console.error('Error saving md file:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
