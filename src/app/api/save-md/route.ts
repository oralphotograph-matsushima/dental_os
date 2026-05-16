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

    // デスクトップの OralNote_Data/Records フォルダを基準にする
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const recordsDir = path.join(desktopPath, 'OralNote_Data', 'Records');

    // フォルダが存在しない場合は作成
    if (!fs.existsSync(recordsDir)) {
      fs.mkdirSync(recordsDir, { recursive: true });
    }

    // セキュリティ対策: パストラバーサルを防ぐため、basename のみを使用
    const safeFilename = path.basename(filename);
    const filePath = path.join(recordsDir, safeFilename);

    // ファイルに書き込む
    fs.writeFileSync(filePath, content, 'utf8');

    return NextResponse.json({ success: true, filePath });
  } catch (error: any) {
    console.error('Error saving md file:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
