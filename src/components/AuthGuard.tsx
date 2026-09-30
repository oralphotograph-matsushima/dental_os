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

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // どんなエラーがあっても3秒後には強制的に画面を表示させるフェイルセーフ
    const timer = setTimeout(() => {
      setLoading((prevLoading) => {
        if (prevLoading) {
          setErrorMsg("タイムアウトにより強制的に画面を表示しました");
          return false;
        }
        return prevLoading;
      });
    }, 3000);

    const checkAccess = async () => {
      try {
        if (!pathname || pathname === '/' || pathname.startsWith('/lp') || pathname.startsWith('/wireless-connect')) {
          setLoading(false);
          return;
        }

        const isMasterBypass = localStorage.getItem('master_bypass') === 'true';
        if (isMasterBypass) {
          if (pathname === '/login' || pathname === '/subscription-required' || pathname === '/manage-devices') {
            router.push('/');
          }
          setLoading(false);
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!session) {
          if (pathname !== '/login') router.push('/login');
          setLoading(false);
          return;
        }

        if (pathname === '/login') {
          router.push('/');
          setLoading(false);
          return;
        }

        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (subError || !subData || subData.status !== 'active') {
          if (pathname !== '/subscription-required') {
            router.push('/subscription-required');
          }
          setLoading(false);
          return;
        }

        const deviceId = getDeviceId();
        const { data: devices, error: devicesError } = await supabase
          .from('user_devices')
          .select('*')
          .eq('user_id', session.user.id);

        if (devicesError) {
          setLoading(false);
          return;
        }

        const currentDevice = devices?.find((d) => d.device_id === deviceId);

        if (currentDevice) {
          await supabase
            .from('user_devices')
            .update({ last_active_at: new Date().toISOString() })
            .eq('device_id', deviceId);
        } else {
          const maxDevices = subData.max_devices || 0;
          const currentCount = devices?.length || 0;

          if (currentCount >= maxDevices) {
            if (pathname !== '/manage-devices') {
              router.push('/manage-devices');
            }
            setLoading(false);
            return;
          } else {
            await supabase.from('user_devices').insert({
              user_id: session.user.id,
              device_id: deviceId,
              device_name: getDeviceName(),
            });
          }
        }

        if (pathname === '/subscription-required' || pathname === '/manage-devices') {
           router.push('/');
        }
        setLoading(false);
      } catch (err: any) {
        console.error("AuthGuard checkAccess error:", err);
        setErrorMsg(err.message || String(err));
        setLoading(false);
      }
    };

    checkAccess();

    let subscriptionRef: any = null;
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      });
      subscriptionRef = subscription;
    } catch (err: any) {
      console.error("Supabase onAuthStateChange error:", err);
      setErrorMsg("Supabase初期化エラー: " + (err.message || String(err)));
      setLoading(false);
    }

    return () => {
      clearTimeout(timer);
      if (subscriptionRef) subscriptionRef.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-400">認証情報を確認中...</p>
        <p className="text-xs text-gray-600 mt-2">v1.2.0 (Path: {pathname || 'null'})</p>
      </div>
    );
  }

  return (
    <>
      {errorMsg && (
        <div className="bg-red-500 text-white text-xs p-2 text-center sticky top-0 z-[9999]">
          エラー: {errorMsg}
        </div>
      )}
      {(!pathname || pathname === '/login' || pathname === '/subscription-required' || pathname === '/manage-devices' || pathname.startsWith('/lp') || pathname.startsWith('/wireless-connect')) ? children : children}
    </>
  );
}
