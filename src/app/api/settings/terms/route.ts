import { NextResponse } from 'next/server';
import fs from 'fs';
import { getTermsSettingsPath } from '@/lib/settingsHelper';

export async function GET() {
  try {
    const filePath = getTermsSettingsPath();
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error: any) {
    console.error('Error reading terms:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const terms = await req.json();
    const filePath = getTermsSettingsPath();
    fs.writeFileSync(filePath, JSON.stringify(terms, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error writing terms:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
