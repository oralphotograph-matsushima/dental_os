import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { getOrdersDir } from '@/lib/settingsHelper';

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const formData = await req.formData();

    const orderId = formData.get('orderId') as string;
    const matchScore = parseInt(formData.get('matchScore') as string || '5');
    const afterShade = formData.get('afterShade') as string || '';
    const comments = formData.get('comments') as string || '';
    const afterPhotos = formData.getAll('afterPhotos') as File[];

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const ordersDir = getOrdersDir();
    const filePath = path.join(ordersDir, `${orderId}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '発注データが見つかりません' }, { status: 404 });
    }

    const order = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // 写真の保存
    const photosDir = path.join(ordersDir, 'photos', orderId);
    const savedAfterPhotos: string[] = [];
    const attachments = [];

    if (afterPhotos && afterPhotos.length > 0) {
      fs.mkdirSync(photosDir, { recursive: true });
      for (let i = 0; i < afterPhotos.length; i++) {
        const photo = afterPhotos[i];
        if (photo && photo.size > 0) {
          const buffer = Buffer.from(await photo.arrayBuffer());
          const fileName = photo.name || `after_photo_${i + 1}.jpg`;
          fs.writeFileSync(path.join(photosDir, fileName), buffer);
          savedAfterPhotos.push(fileName);

          attachments.push({
            filename: fileName,
            content: buffer,
          });
        }
      }
    }

    // 評価内容をデータに追記して更新
    order.status = 'completed';
    order.evaluation = {
      completedAt: new Date().toISOString(),
      afterShade,
      matchScore,
      comments,
      afterPhotos: savedAfterPhotos,
    };

    fs.writeFileSync(filePath, JSON.stringify(order, null, 2), 'utf8');

    // 技工士への評価フィードバックメール送信
    if (process.env.RESEND_API_KEY && order.labEmail) {
      try {
        const senderEmailAddress = process.env.RESEND_FROM_EMAIL || 'order@nostalgista.co.jp';
        const clinicName = order.clinicName || '当院';
        const fromEmail = `${clinicName} <${senderEmailAddress.replace(/.*<(.+)>.*/, '$1')}>`;

        // 星マークを生成
        const stars = '★'.repeat(matchScore) + '☆'.repeat(5 - matchScore);

        await resend.emails.send({
          from: fromEmail,
          to: [order.labEmail],
          replyTo: order.clinicEmail || undefined,
          subject: `【シェード評価フィードバック】患者ID: ${order.patientId || '未入力'} (${stars})`,
          text: `
${order.labName} ご担当者様

お世話になっております。${clinicName}です。
先日作成いただきました技工物の装着（セット）が完了しましたので、色調適合（シェードマッチング）のフィードバックをお送りいたします。

-----------------------------------------
【対象患者ID/氏名】: ${order.patientId || '未入力'}
【指示件名】: ${order.subject || '未入力'}
【オーダー時の指示】:
${order.shadeDetails || '特になし'}

【セット評価】: ${stars} (${matchScore}/5点)
【セット後のシェード色調】: ${afterShade || '未指定'}
【臨床コメント・所見】:
${comments || '特になし'}
-----------------------------------------

※セット後の口腔内写真が添付されている場合は、本メールの添付ファイルをご確認いただき、今後の色調調整の参考にしていただけますと幸いです。
いつも素晴らしい技工物を作成いただきありがとうございます。今後ともよろしくお願いいたします。

---
このメールにそのまま返信いただくと、システム経由で「${clinicName}」へメールが送信されます。
（※宛先: ${order.clinicEmail || 'システム設定アドレス'}）

※本メールはOralNoteシステムより自動送信されています。
          `,
          attachments: attachments,
        });
      } catch (emailErr) {
        console.error('Failed to send evaluation email to lab:', emailErr);
        // メール送信に失敗しても、ローカルデータベースへの保存は成功しているので、成功レスポンスを返す
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Error in evaluation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
