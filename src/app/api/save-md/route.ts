import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getPatientsDir, findExistingPatientFolder, resolvePatientFolderName } from '@/lib/settingsHelper';
import { withObsidianPhotoLinks } from '@/lib/obsidianPhotos';

function folderFromChartFilename(filename: string): string | null {
  const base = path.basename(filename).replace(/\.md$/i, '');
  const parts = base.startsWith('カルテ_') ? base.split('_').slice(1) : base.split('_');
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];
  const rest = /^\d{6}$/.test(last) ? parts.slice(0, -1) : parts;
  const id = rest[0];
  if (!id) return null;
  const name = rest.slice(1).join('_');
  return resolvePatientFolderName(id, name ? `${id}_${name}` : id);
}

export async function POST(req: Request) {
  try {
    const { filename, content } = await req.json();

    if (!filename || !content) {
      return NextResponse.json({ error: 'filename and content are required' }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const folder = folderFromChartFilename(safeFilename) || findExistingPatientFolder(safeFilename);
    if (!folder) {
      return NextResponse.json({ error: '患者番号がファイル名から分かりません' }, { status: 400 });
    }

    const patientDir = path.join(getPatientsDir(), folder);
    if (!fs.existsSync(patientDir)) {
      fs.mkdirSync(patientDir, { recursive: true });
    }

    const { markdown, photoCount } = withObsidianPhotoLinks(content, patientDir);
    const filePath = path.join(patientDir, safeFilename);
    fs.writeFileSync(filePath, markdown, 'utf8');

    return NextResponse.json({ success: true, filePath, folder, photoCount });
  } catch (error: any) {
    console.error('Error saving md file:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
