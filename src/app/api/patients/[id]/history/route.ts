import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getVaultBaseDir, getPatientsDir, extractPatientNumber } from '@/lib/settingsHelper';

function folderMatchesId(folderName: string, id: string) {
  return folderName === id || folderName.startsWith(`${id}_`);
}

function chartMatchesId(filename: string, id: string) {
  if (!filename.startsWith('カルテ_') || !filename.endsWith('.md')) return false;
  const rest = filename.replace(/^カルテ_/, '').replace(/\.md$/i, '');
  return rest === id || rest.startsWith(`${id}_`);
}

function pushChart(
  history: { date: string; soap: string; filename: string }[],
  filePath: string,
  file: string
) {
  try {
    const chartContent = fs.readFileSync(filePath, 'utf8');
    const parts = file.replace('.md', '').split('_');
    const dateStr = parts[parts.length - 1];
    const formattedDate = dateStr.match(/.{1,2}/g)?.join('/') || dateStr;
    history.push({
      date: formattedDate,
      soap: chartContent,
      filename: file,
    });
  } catch (e) {
    console.warn('Failed to read file:', file, e);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const patientId = extractPatientNumber(rawId) || rawId;
    const history: { date: string; soap: string; filename: string }[] = [];
    const seen = new Set<string>();

    const patientsDir = getPatientsDir();
    if (fs.existsSync(patientsDir)) {
      for (const entry of fs.readdirSync(patientsDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !folderMatchesId(entry.name, patientId)) continue;
        const dir = path.join(patientsDir, entry.name);
        for (const file of fs.readdirSync(dir)) {
          if (!chartMatchesId(file, patientId) || seen.has(file)) continue;
          seen.add(file);
          pushChart(history, path.join(dir, file), file);
        }
      }
    }

    const karteDir = path.join(getVaultBaseDir(), 'カルテ');
    if (fs.existsSync(karteDir)) {
      for (const file of fs.readdirSync(karteDir)) {
        if (!chartMatchesId(file, patientId) || seen.has(file)) continue;
        seen.add(file);
        pushChart(history, path.join(karteDir, file), file);
      }
    }

    history.sort((a, b) => b.filename.localeCompare(a.filename));
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching patient history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
