import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getVaultBaseDir } from '@/lib/settingsHelper';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const karteDir = path.join(getVaultBaseDir(), 'カルテ');
    
    if (!fs.existsSync(karteDir)) {
      return NextResponse.json([]);
    }
    
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
    
    history.sort((a, b) => b.filename.localeCompare(a.filename));
    
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching patient history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
