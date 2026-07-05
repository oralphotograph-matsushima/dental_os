'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { getDeviceId } from '@/lib/device';
import { Monitor, Trash2, LogOut, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Device = {
  id: string;
  device_id: string;
  device_name: string;
  last_active_at: string;
};

export default function ManageDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [maxDevices, setMaxDevices] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const currentDeviceId = getDeviceId();

  const fetchDevices = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    // デバイス取得
    const { data: devicesData } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', session.user.id)
      .order('last_active_at', { ascending: false });

    if (devicesData) {
      setDevices(devicesData);
    }

    // 上限取得
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('max_devices')
      .eq('user_id', session.user.id)
      .single();
    
    if (subData) {
      setMaxDevices(subData.max_devices || 0);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!confirm('このデバイスの登録を解除してもよろしいですか？')) return;
    
    setLoading(true);
    await supabase.from('user_devices').delete().eq('id', id);
    await fetchDevices();
    
    // 削除後、もう一度トップ（またはAuthGuard）へルーティングして再チェック
    router.push('/');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isLimitExceeded = devices.length >= maxDevices && !devices.find(d => d.device_id === currentDeviceId);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">デバイス管理</h1>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
          >
            <LogOut className="w-4 h-4" />
            <span>ログアウト</span>
          </button>
        </div>

        {isLimitExceeded && (
          <div className="bg-amber-500/10 border border-amber-500/50 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-amber-500 mb-2">デバイスの上限に達しています</h2>
              <p className="text-amber-200">
                現在の契約プランでは最大 <strong>{maxDevices}台</strong> までのデバイスで利用可能です。
                このPCで利用を開始するには、以下のリストから不要なデバイスの登録を解除してください。
              </p>
            </div>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">登録済みデバイス ({devices.length} / {maxDevices}台)</h2>
          </div>

          <div className="space-y-4">
            {devices.map((device) => {
              const isCurrent = device.device_id === currentDeviceId;
              return (
                <div 
                  key={device.id} 
                  className={`flex items-center justify-between p-4 rounded-xl border ${isCurrent ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-800/50 border-gray-700'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${isCurrent ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{device.device_name || '不明なデバイス'}</h3>
                        {isCurrent && (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> 現在のPC
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        最終アクセス: {new Date(device.last_active_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  
                  {!isCurrent && (
                    <button
                      onClick={() => handleDelete(device.id)}
                      className="p-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors flex items-center gap-2"
                      title="このデバイスを解除する"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="hidden sm:inline">解除</span>
                    </button>
                  )}
                </div>
              );
            })}
            
            {devices.length === 0 && (
              <p className="text-gray-400 text-center py-8">登録されているデバイスはありません。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
