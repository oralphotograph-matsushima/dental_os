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

    // 3. Webhook Simulation (Console Log for now)
    // Here you can use fetch() to send a POST request to Make/Integromat or Zapier.
    console.log("=========================================");
    console.log("🔔 [WEBHOOK EVENT] Dental OS アクティベーション");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password} (Plan: ${plan})`);
    console.log(`Device ID: ${deviceId}`);
    console.log("=========================================");

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "ログイン処理中にエラーが発生しました" }, { status: 500 });
  }
}
