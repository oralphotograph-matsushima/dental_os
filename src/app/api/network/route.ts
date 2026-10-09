import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import path from 'path';

/**
 * clinic.json の customIP のみ読む。
 * settingsHelper は vaultPath など動的パスの fs 操作が多く、@vercel/nft が
 * プロジェクト全体（LP動画・WCマニュアル等）を serverless に同梱してしまうため使わない。
 * Vercel 上に Desktop 設定は無いので FS はスキップする。
 */
function readCustomIp(): string {
  if (process.env.VERCEL) return '';
  try {
    const settingsPath = path.join(
      os.homedir(),
      'Desktop',
      'WirelessConnect_Data',
      'Settings',
      'clinic.json'
    );
    if (!fs.existsSync(settingsPath)) return '';
    const config = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return typeof config?.customIP === 'string' ? config.customIP : '';
  } catch (e) {
    console.error('Failed to read customIP in network route:', e);
    return '';
  }
}

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

    let detectedIp = '127.0.0.1';
    if (allIps.length > 0) {
      detectedIp = allIps[0].address;
    }

    const customIp = readCustomIp();

    return NextResponse.json({
      ip: customIp || detectedIp,
      detectedIp,
      customIp,
      allIps,
    });
  } catch (error: any) {
    console.error('Error fetching network interfaces:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
