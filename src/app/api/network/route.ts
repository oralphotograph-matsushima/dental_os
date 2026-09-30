import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import { getClinicSettingsPath } from '@/lib/settingsHelper';

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const allIps: { name: string; address: string }[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          allIps.push({ name, address: iface.address });
        }
      }
    }

    // デフォルトの自動検出IP (最初のIPv4)
    let detectedIp = '127.0.0.1';
    if (allIps.length > 0) {
      detectedIp = allIps[0].address;
    }

    // clinic.json から手動IP設定があるかを読み出す
    let customIp = '';
    const settingsPath = getClinicSettingsPath();
    if (fs.existsSync(settingsPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (config && config.customIP) {
          customIp = config.customIP;
        }
      } catch (e) {
        console.error('Failed to parse clinic.json for customIP in network route:', e);
      }
    }

    return NextResponse.json({
      ip: customIp || detectedIp, // iPad連携のQRコードや表示用
      detectedIp,
      customIp,
      allIps
    });
  } catch (error: any) {
    console.error('Error fetching network interfaces:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
