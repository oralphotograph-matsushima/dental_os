import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    
    // 1. clinic.json からカスタムパスを取得する
    const homedir = os.homedir();
    const settingsFilePath = path.join(homedir, 'Desktop', 'OralNote_Data', 'Settings', 'clinic.json');
    let vaultPath = '';
    
    if (fs.existsSync(settingsFilePath)) {
      try {
        const config = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        if (config && config.vaultPath) {
          vaultPath = config.vaultPath;
        }
      } catch (e) {
        console.error('Failed to parse clinic.json for vaultPath:', e);
      }
    }
    
    // カルテフォルダのパスを特定（フラット構造では MyVault/カルテ/）
    const baseDir = vaultPath || path.join(homedir, 'Desktop', 'OralNote_Data');
    const karteDir = path.join(baseDir, 'カルテ');
    
    if (!fs.existsSync(karteDir)) {
      return NextResponse.json([]);
    }
    
    // 2. フォルダ内のマークダウンファイルをスキャンする
    const files = fs.readdirSync(karteDir);
    const history: { date: string, soap: string, filename: string }[] = [];
    
    for (const file of files) {
      if (file.startsWith('カルテ_') && file.endsWith('.md') && file.includes(patientId)) {
        try {
          const filePath = path.join(karteDir, file);
          const chartContent = fs.readFileSync(filePath, 'utf8');
          
          const parts = file.replace('.md', '').split('_');
          const dateStr = parts[parts.length - 1];
          const formattedDate = dateStr.match(/.{1,2}/g)?.join('/') || dateStr;
          
          history.push({
            date: formattedDate,
            soap: chartContent,
            filename: file
          });
        } catch (e) {
          console.warn('Failed to read file:', file, e);
        }
      }
    }
    
    // ファイル名降順（新しい日付が先）でソート
    history.sort((a, b) => b.filename.localeCompare(a.filename));
    
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching patient history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
