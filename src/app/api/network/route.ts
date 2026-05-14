import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIP = '127.0.0.1';

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // IPv4 でかつ内部ループバックではないものを探す
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        // 最初の有効なIPアドレスを見つけたら終了
        break;
      }
    }
    if (localIP !== '127.0.0.1') break;
  }

  return NextResponse.json({ ip: localIP });
}
