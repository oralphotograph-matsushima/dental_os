import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // フォームデータの取得
    const labName = formData.get('labName') as string;
    const labEmail = formData.get('labEmail') as string;
    const patientId = formData.get('patientId') as string;
    const subject = formData.get('subject') as string;
    const shadeDetails = formData.get('shadeDetails') as string;
    const clinicEmail = formData.get('clinicEmail') as string;
    
    // 画像ファイルの取得
    const shadePhoto = formData.get('shadePhoto') as File | null;
    const instructionPhoto = formData.get('instructionPhoto') as File | null;

    // 必須チェック（サーバーサイド）
    if (!labEmail) {
      return NextResponse.json({ error: '送信先メールアドレスは必須です' }, { status: 400 });
    }

    // SMTP設定の確認
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ 
        error: 'サーバーのメール送信設定（SMTP）が未設定です。管理者に連絡してください。' 
      }, { status: 500 });
    }

    // Nodemailerトランスポーターの作成
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // 465の場合はtrue
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

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

    // メールの作成
    const mailOptions = {
      from: `"${process.env.CLINIC_NAME || 'OralNote AI'}" <${process.env.SMTP_USER}>`,
      to: labEmail,
      cc: clinicEmail || process.env.CLINIC_EMAIL, // 医院のアドレスにもCCで送る
      subject: subject || `【技工指示書】患者ID: ${patientId || '未入力'} (${labName}様宛)`,
      text: `
${labName} ご担当者様

いつもお世話になっております。
以下の通り、技工指示書をお送りいたします。

-----------------------------------------
【患者ID/氏名】: ${patientId || '未入力'}
【シェード・形態指示詳細】:
${shadeDetails || '特になし'}
-----------------------------------------

※詳細な指示内容および画像は添付ファイルをご確認ください。
※本メールはOralNote AIシステムより自動送信されています。
`,
      attachments: attachments,
    };

    // メールの送信
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'メールを送信しました' });

  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'メールの送信中にエラーが発生しました', details: error.message },
      { status: 500 }
    );
  }
}
