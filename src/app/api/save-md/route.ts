import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getVaultBaseDir } from '@/lib/settingsHelper';

export async function POST(req: Request) {
  try {
    const { filename, content } = await req.json();

    if (!filename || !content) {
      return NextResponse.json({ error: 'filename and content are required' }, { status: 400 });
    }

    const baseDir = getVaultBaseDir();

    // ファイル名から患者フォルダ名を抽出 (例: カルテ_1234_山田太郎_260524.md -> 1234_山田太郎)
    let patientFolder = "";
    if (filename.startsWith("カルテ_")) {
      const parts = filename.replace(".md", "").split("_");
      if (parts.length >= 3) {
        patientFolder = `${parts[1]}_${parts[2]}`;
      } else if (parts.length === 2) {
        patientFolder = parts[1];
      }
    } else {
      patientFolder = filename.replace(".md", "");
    }

    if (patientFolder) {
      const patientPhotoDir = path.join(baseDir, 'Patients', patientFolder);
      if (!fs.existsSync(patientPhotoDir)) {
        fs.mkdirSync(patientPhotoDir, { recursive: true });
      }
    }

    const karteDir = path.join(baseDir, 'カルテ');

    if (!fs.existsSync(karteDir)) {
      fs.mkdirSync(karteDir, { recursive: true });
    }

    // セキュリティ対策: パストラバーサルを防ぐため、basename のみを使用
    const safeFilename = path.basename(filename);
    const filePath = path.join(karteDir, safeFilename);

    // 1. カルテファイルの保存
    fs.writeFileSync(filePath, content, 'utf8');

    // 2. ファイル名から患者名を抽出 (例: カルテ_1234_ヤマダ_260524.md -> 1234_ヤマダ)
    let patientInfo = "不明";
    if (safeFilename.startsWith("カルテ_")) {
      const parts = safeFilename.replace(".md", "").split("_");
      if (parts.length >= 3) {
        patientInfo = `${parts[1]}_${parts[2]}`;
      } else if (parts.length === 2) {
        patientInfo = parts[1];
      }
    } else {
      patientInfo = safeFilename.replace(".md", "");
    }

    // 3. 患者ページの更新または作成 (MyVault/[患者名].md)
    const patientFilename = `${patientInfo}.md`;
    const patientFilePath = path.join(baseDir, patientFilename);
    let patientContent = "";
    
    if (fs.existsSync(patientFilePath)) {
      patientContent = fs.readFileSync(patientFilePath, 'utf8');
    }

    const chartNameWithoutExt = safeFilename.replace('.md', '');
    let newPatientContent = "";
    if (patientContent) {
      newPatientContent = patientContent.trimEnd() + `\n- ${chartNameWithoutExt}`;
    } else {
      newPatientContent = `# ${patientInfo}\n\n## 診療記録\n- ${chartNameWithoutExt}`;
    }

    fs.writeFileSync(patientFilePath, newPatientContent, 'utf8');

    return NextResponse.json({ success: true, filePath });
  } catch (error: any) {
    console.error('Error saving md file:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
