import { NextResponse } from "next/server";
import { registerDevice } from "@/lib/sessionStore";
import Stripe from 'stripe';

// Initialize Stripe with the Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-04-22.dahlia",
});

const MASTER_PASSWORD = "Oral0000";

export async function POST(request: Request) {
  try {
    const { emailOrPassword, deviceId } = await request.json();

    if (!emailOrPassword || !deviceId) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

    let plan: any = "1_device"; // デフォルトは1端末制限（複数端末での同時利用を防止）
    let userEmail = emailOrPassword;

    // 1. Check Master Password
    if (emailOrPassword === MASTER_PASSWORD) {
      userEmail = "admin@nostalgista.co.jp";
      plan = "unlimited";
    } else {
      // 2. Check Stripe Subscription
      if (!process.env.STRIPE_SECRET_KEY) {
         return NextResponse.json({ error: "Stripe APIキーがサーバーに設定されていません" }, { status: 500 });
      }
      
      const customers = await stripe.customers.list({ email: emailOrPassword, limit: 1 });
      if (customers.data.length === 0) {
        return NextResponse.json({ error: "このメールアドレスの決済記録が見つかりません。入力に間違いがないかご確認ください。" }, { status: 401 });
      }
      
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: 'all',
        limit: 10
      });

      const hasValidSubscription = subscriptions.data.some(sub => 
        sub.status === 'active' || sub.status === 'trialing'
      );

      if (!hasValidSubscription) {
        return NextResponse.json({ error: "有効なサブスクリプション（または無料トライアル）が見つかりません。決済ページからご利用登録をお願いします。" }, { status: 401 });
      }
    }

    // 3. Register Device Session (in-memory validation)
    registerDevice(userEmail, plan, deviceId);

    // 4. Webhook Notification (Optional)
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "new_login",
            email: userEmail,
            plan: plan,
            deviceId: deviceId,
            timestamp: new Date().toISOString(),
          })
        });
      } catch (e) {
        console.error("Webhook failed:", e);
      }
    }

    return NextResponse.json({ success: true, plan, email: userEmail });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "ログイン処理中にエラーが発生しました。しばらく経ってから再度お試しください。" }, { status: 500 });
  }
}
