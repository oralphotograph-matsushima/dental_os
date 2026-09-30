import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getVaultBaseDir, getPatientsDir } from '@/lib/settingsHelper';

export async function GET() {
  try {
    const baseDir = getVaultBaseDir();
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const patients = new Set<string>();

    for (const file of fs.readdirSync(baseDir)) {
      const fullPath = path.join(baseDir, file);
      try {
        if (!fs.statSync(fullPath).isFile()) continue;
      } catch {
        continue;
      }
      if (file.endsWith('.md') && !file.startsWith('.') && !file.startsWith('カルテ_')) {
        patients.add(file.replace(/\.md$/, ''));
      }
    }

    const patientsDir = getPatientsDir();
    if (fs.existsSync(patientsDir)) {
      for (const entry of fs.readdirSync(patientsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const dir = path.join(patientsDir, entry.name);
        let hasChart = false;
        try {
          hasChart = fs.readdirSync(dir).some((f) => f.startsWith('カルテ_') && f.endsWith('.md'));
        } catch {
          continue;
        }
        if (hasChart) patients.add(entry.name);
      }
    }

    return NextResponse.json(Array.from(patients));
  } catch (error: any) {
    console.error('Error fetching patients list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
