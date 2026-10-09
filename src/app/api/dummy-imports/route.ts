import { NextResponse } from 'next/server';

/**
 * Electron standalone 用の依存確保は scripts/build-electron.js 側で行う。
 * ここに ftp-srv / express 等を静的 import すると Vercel の serverless 関数が肥大化する。
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message:
      'Watcher dependencies are packaged for Electron via build-electron.js, not this route.',
  });
}
