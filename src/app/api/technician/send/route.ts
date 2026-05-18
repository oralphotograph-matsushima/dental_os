import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const formData = await req.formData();
    
    // フォームデータの取得
    const labName = formData.get('labName') as string;
    const labEmail = formData.get('labEmail') as string;
    const patientId = formData.get('patientId') as string;
    const subject = formData.get('subject') as string;
    const shadeDetails = formData.get('shadeDetails') as string;
    const clinicName = formData.get('clinicName') as string || '当院';
    const clinicEmail = formData.get('clinicEmail') as string;
    
    // 画像ファイルの取得
    const shadePhoto = formData.get('shadePhoto') as File | null;
    const instructionPhoto = formData.get('instructionPhoto') as File | null;

    if (!labEmail) {
      return NextResponse.json({ error: '送信先メールアドレスは必須です' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ 
        error: 'Resend APIキーが設定されていません。管理者に連絡してください。' 
      }, { status: 500 });
    }

    // 添付ファイルの準備
    const attachments = [];

    if (shadePhoto && shadePhoto.size > 0) {
      const buffer = Buffer.from(await shadePhoto.arrayBuffer());
      attachments.push({
        filename: shadePhoto.name || 'shade_photo.jpg',
        content: buffer,
      });
    }

    if (instructionPhoto && instructionPhoto.size > 0) {
      const buffer = Buffer.from(await instructionPhoto.arrayBuffer());
      attachments.push({
        filename: instructionPhoto.name || 'instruction_photo.jpg',
        content: buffer,
      });
    }

    // 送信元アドレス（表示名をクリニック名にする）
    // ※実際の送信元ドメインはNostalgistaのままですが、受信者にはクリニック名が表示されます
    const senderEmailAddress = process.env.RESEND_FROM_EMAIL || 'order@nostalgista.co.jp';
    const fromEmail = `${clinicName} <${senderEmailAddress.replace(/.*<(.+)>.*/, '$1')}>`;

    // Resendでメール送信
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [labEmail],
      bcc: clinicEmail ? [clinicEmail] : undefined, // CCだとGmail等の仕様でReply-Toが無視される現象を防ぐためBCCに変更
      reply_to: clinicEmail || undefined, // 技工所が返信した時にクリニックへ届くように設定
      subject: subject || `【技工指示書】患者ID: ${patientId || '未入力'} (${labName}様宛)`,
      text: `
${labName} ご担当者様

お世話になっております。${clinicName}です。
以下の通り、技工指示書をお送りいたします。

-----------------------------------------
【患者ID/氏名】: ${patientId || '未入力'}
【シェード・形態指示詳細】:
${shadeDetails || '特になし'}
-----------------------------------------

※詳細な指示内容および画像は添付ファイルをご確認ください。

---
このメールにそのまま返信いただくと、システム経由で「${clinicName}」へメールが送信されます。
（※宛先: ${clinicEmail || 'システム設定アドレス'}）

※本メールはOralNoteシステムより自動送信されています。
      `,
      attachments: attachments,
    });

    if (error) {
      console.error('Resend Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'メールを送信しました', data });

  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'メールの送信中に予期せぬエラーが発生しました', details: error.message },
      { status: 500 }
    );
  }
}
