'use client';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, CreditCard } from 'lucide-react';
import { useState } from 'react';

export default function SubscriptionRequiredPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCheckAgain = async () => {
    setLoading(true);
    // AuthGuardに再チェックさせるためトップへ
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border border-white/20 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6">
          <CreditCard className="w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">ライセンスが見つかりません</h1>
        
        <p className="text-gray-300 mb-8 text-left leading-relaxed">
          このアカウントには有効なClinicプランのライセンス（サブスクリプション）が見つかりませんでした。
          OralNote AI をご利用いただくには、有効な契約が必要です。
        </p>

        <div className="space-y-4">
          <a
            href="https://buy.stripe.com/dRmdR9fLB2mIb5yfv633W00"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all"
          >
            プランを購入する
          </a>

          <button
            onClick={handleCheckAgain}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium border border-gray-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            購入したので再確認する
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3 text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            別のアカウントでログイン
          </button>
        </div>
      </div>
    </div>
  );
}
