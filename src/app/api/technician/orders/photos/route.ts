import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getOrdersDir } from '@/lib/settingsHelper';

// GET: ローカルに保存されている写真ファイルを読み込んで返す
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const filename = searchParams.get('filename');

    if (!orderId || !filename) {
      return NextResponse.json({ error: 'orderId and filename are required' }, { status: 400 });
    }

    const ordersDir = getOrdersDir();
    // セキュリティ対策: パストレーバースを防止するためベース名のみ抽出
    const safeFilename = path.basename(filename);
    const safeOrderId = path.basename(orderId);
    
    const filePath = path.join(ordersDir, 'photos', safeOrderId, safeFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // 拡張子に応じたMIMEタイプの決定
    let contentType = 'image/jpeg';
    if (filename.toLowerCase().endsWith('.png')) {
      contentType = 'image/png';
    } else if (filename.toLowerCase().endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (filename.toLowerCase().endsWith('.webp')) {
      contentType = 'image/webp';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error reading photo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
