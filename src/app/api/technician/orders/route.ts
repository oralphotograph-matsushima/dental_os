import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getOrdersDir } from '@/lib/settingsHelper';

// GET: すべての技工指示書データを取得
export async function GET() {
  try {
    const ordersDir = getOrdersDir();
    const files = fs.readdirSync(ordersDir);
    const orders = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(ordersDir, file);
          const data = fs.readFileSync(filePath, 'utf8');
          orders.push(JSON.parse(data));
        } catch (e) {
          console.error(`Failed to parse order file: ${file}`, e);
        }
      }
    }

    // 作成日時降順でソート
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Error fetching technician orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 技工指示書データの直接更新
export async function POST(req: NextRequest) {
  try {
    const orderData = await req.json();
    if (!orderData.id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const ordersDir = getOrdersDir();
    const filePath = path.join(ordersDir, `${orderData.id}.json`);

    let existingData = {};
    if (fs.existsSync(filePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {}
    }

    const updatedData = {
      ...existingData,
      ...orderData,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
    return NextResponse.json({ success: true, data: updatedData });
  } catch (error: any) {
    console.error('Error updating technician order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
