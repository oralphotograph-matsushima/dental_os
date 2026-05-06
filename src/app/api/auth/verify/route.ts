import { NextResponse } from "next/server";
import { isDeviceValid } from "@/lib/sessionStore";

export async function POST(request: Request) {
  try {
    const { email, deviceId } = await request.json();

    if (!email || !deviceId) {
      return NextResponse.json({ error: "必要な情報が不足しています" }, { status: 400 });
    }

    const valid = isDeviceValid(email, deviceId);

    if (!valid) {
      return NextResponse.json({ 
        valid: false, 
        error: "別の端末でログインされたため、この端末から自動的にログアウトされました。" 
      }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (error: any) {
    console.error("Verify Error:", error);
    return NextResponse.json({ error: "セッション確認中にエラーが発生しました" }, { status: 500 });
  }
}
