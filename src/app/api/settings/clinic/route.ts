import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const getSettingsFilePath = () => {
  const desktopPath = path.join(os.homedir(), 'Desktop');
  const settingsDir = path.join(desktopPath, 'OralNote_Data', 'Settings');
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  return path.join(settingsDir, 'clinic.json');
};

export async function GET() {
  try {
    const filePath = getSettingsFilePath();
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ email: '' });
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
    const filePath = getSettingsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error writing clinic settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
