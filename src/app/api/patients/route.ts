import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getVaultBaseDir } from '@/lib/settingsHelper';

export async function GET() {
  try {
    const baseDir = getVaultBaseDir();
      
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    const files = fs.readdirSync(baseDir);
    const patients = files.filter(file => {
      const fullPath = path.join(baseDir, file);
      const isFile = fs.statSync(fullPath).isFile();
      return isFile && file.endsWith('.md') && !file.startsWith('.') && !file.startsWith('カルテ_');
    }).map(file => file.replace(/\.md$/, ''));
    
    return NextResponse.json(patients);
  } catch (error: any) {
    console.error('Error fetching patients list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
