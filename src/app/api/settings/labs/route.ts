import { NextResponse } from 'next/server';
import fs from 'fs';
import { getLabsSettingsPath } from '@/lib/settingsHelper';

export async function GET() {
  try {
    const filePath = getLabsSettingsPath();
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error: any) {
    console.error('Error reading labs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const labs = await req.json();
    const filePath = getLabsSettingsPath();
    fs.writeFileSync(filePath, JSON.stringify(labs, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error writing labs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
