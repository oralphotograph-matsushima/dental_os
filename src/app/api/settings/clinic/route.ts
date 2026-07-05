import { NextResponse } from 'next/server';
import fs from 'fs';
import { getClinicSettingsPath, saveClinicSettingsData } from '@/lib/settingsHelper';

export async function GET() {
  try {
    const filePath = getClinicSettingsPath();
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ email: '', customIP: '' });
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error: any) {
    console.error('Error reading clinic settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    saveClinicSettingsData(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error writing clinic settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
