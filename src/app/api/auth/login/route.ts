import { NextResponse } from "next/server";
import { PASSWORDS, registerDevice } from "@/lib/sessionStore";

export async function POST(request: Request) {
  try {
    const { password, email, deviceId } = await request.json();

    if (!password || !email || !deviceId) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

    // 1. Validate Password
    const plan = PASSWORDS[password];
    if (!plan) {
      return NextResponse.json({ error: "パスワードが間違っています" }, { status: 401 });
    }

    // 2. Register Device and Enforce Limits
    registerDevice(email, plan, deviceId);

    // 3. Webhook / Email Notification
    // Webhookを経由して oralphotograp@gmail.com へ通知を送る設定
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "new_login",
            email: email,
            plan: plan,
            deviceId: deviceId,
            timestamp: new Date().toISOString(),
            target_email: "oralphotograp@gmail.com"
          })
        });
      } catch (e) {
        console.error("Webhook failed:", e);
      }
    } else {
      console.log("🔔 [Login Event] Email notification is ready, but WEBHOOK_URL is not set.");
    }

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "ログイン処理中にエラーが発生しました" }, { status: 500 });
  }
}
