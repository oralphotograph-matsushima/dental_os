import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const getQueueFilePath = () => {
  const desktopPath = path.join(os.homedir(), 'Desktop');
  const settingsDir = path.join(desktopPath, 'OralNote_Data', 'Settings');
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  return path.join(settingsDir, 'queue.json');
};

export async function GET() {
  try {
    const filePath = getQueueFilePath();
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error: any) {
    console.error('Error reading today queue settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const queue = await req.json();
    if (!Array.isArray(queue)) {
      return NextResponse.json({ error: 'Invalid data format. Expected an array.' }, { status: 400 });
    }
    const filePath = getQueueFilePath();
    fs.writeFileSync(filePath, JSON.stringify(queue, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error writing today queue settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
