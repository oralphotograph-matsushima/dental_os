'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { getDeviceId, getDeviceName } from '@/lib/device';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAccess = async () => {
      // 0. マスターパスワードのバイパス確認
      const isMasterBypass = localStorage.getItem('master_bypass') === 'true';
      if (isMasterBypass) {
        if (pathname === '/login' || pathname === '/subscription-required' || pathname === '/manage-devices') {
          router.push('/');
        }
        setLoading(false);
        return;
      }

      // 1. ログイン中のセッションを取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        if (pathname !== '/login') router.push('/login');
        setLoading(false);
        return;
      }

      // ログインページにいる場合はトップへ
      if (pathname === '/login') {
        router.push('/');
        setLoading(false);
        return;
      }

      // 2. サブスクリプション状態の確認
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      // 管理者から手動で登録されてない場合や、ステータスがactiveでない場合
      if (subError || !subData || subData.status !== 'active') {
        if (pathname !== '/subscription-required') {
          router.push('/subscription-required');
        }
        setLoading(false);
        return;
      }

      // 3. デバイスチェック
      const deviceId = getDeviceId();
      const { data: devices, error: devicesError } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', session.user.id);

      if (devicesError) {
        console.error('Failed to fetch devices', devicesError);
        setLoading(false);
        return;
      }

      const currentDevice = devices?.find((d) => d.device_id === deviceId);

      if (currentDevice) {
        // 既に登録済みなのでOK、最終アクセス時間を更新
        await supabase
          .from('user_devices')
          .update({ last_active_at: new Date().toISOString() })
          .eq('device_id', deviceId);
      } else {
        // 未登録デバイスの場合、上限チェック
        const maxDevices = subData.max_devices || 0;
        const currentCount = devices?.length || 0;

        if (currentCount >= maxDevices) {
          // 上限オーバー
          if (pathname !== '/manage-devices') {
            router.push('/manage-devices');
          }
          setLoading(false);
          return;
        } else {
          // 上限以内なので新規登録
          await supabase.from('user_devices').insert({
            user_id: session.user.id,
            device_id: deviceId,
            device_name: getDeviceName(),
          });
        }
      }

      // 全てクリア
      if (pathname === '/subscription-required' || pathname === '/manage-devices') {
         router.push('/');
      }
      setLoading(false);
    };

    checkAccess();

    // 認証状態の変化を購読（ログアウト時など）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-400">認証情報を確認中...</p>
      </div>
    );
  }

  // 特定のページ（ログインやデバイス管理）はそのまま表示、それ以外はチェックを通った子要素を表示
  if (pathname === '/login' || pathname === '/subscription-required' || pathname === '/manage-devices') {
    return <>{children}</>;
  }

  return <>{children}</>;
}
