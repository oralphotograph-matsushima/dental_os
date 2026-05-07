import React from 'react';
import { FileText, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-teal-500/30">
      
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/lp" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">戻る</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-teal-900/50">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Dental OS</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">特定商取引法に基づく表記</h1>
            <p className="text-neutral-400">デジタルコンテンツ（SaaS）の提供に関する法令に基づく表記です。</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
            <dl className="divide-y divide-neutral-800 text-sm md:text-base">
              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">販売事業者名</dt>
                <dd className="md:col-span-2 text-neutral-200">株式会社Nostalgista</dd>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">代表責任者</dt>
                <dd className="md:col-span-2 text-neutral-200">松島 弘晃</dd>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">所在地</dt>
                <dd className="md:col-span-2 text-neutral-200">
                  〒658-0073<br />
                  兵庫県神戸市東灘区西岡本5丁目11-21 202
                </dd>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">お問い合わせ先</dt>
                <dd className="md:col-span-2 text-neutral-200">
                  メールアドレス：oralphotograp@gmail.com<br />
                  <span className="text-neutral-500 text-sm mt-1 inline-block">※電話番号については、上記メールアドレスにてご請求をいただいた場合、遅滞なく開示いたします。</span>
                </dd>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">販売価格</dt>
                <dd className="md:col-span-2 text-neutral-200">
                  月額 3,300円（税込）
                </dd>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">商品代金以外の必要料金</dt>
                <dd className="md:col-span-2 text-neutral-200">
                  当サイトのページの閲覧、ソフトウェアのダウンロード、アプリのご利用等に必要となるインターネット接続料金、通信料金等はお客様のご負担となります。
                </dd>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">お支払方法・時期</dt>
                <dd className="md:col-span-2 text-neutral-200">
                  クレジットカード決済（Stripe）<br />
                  ・初回：お申し込み時<br />
                  ・2回目以降：初回の決済日を基準として毎月同日に自動課金
                </dd>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">サービスの引渡時期</dt>
                <dd className="md:col-span-2 text-neutral-200">
                  クレジットカード決済完了後、即時システムをご利用いただけます。
                </dd>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">返品・キャンセル・中途解約</dt>
                <dd className="md:col-span-2 text-neutral-200 space-y-3">
                  <p><strong>【返品・キャンセルについて】</strong><br />提供するサービスの性質上（デジタルコンテンツ）、購入完了後の返品や返金は一切お受けできません。</p>
                  <p><strong>【中途解約について】</strong><br />サブスクリプション（月額課金）の解約はいつでも可能です。解約手続きが完了した直後の次回更新日より請求を停止いたします。なお、日割り計算による返金等は行っておりません。</p>
                </dd>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 p-6 md:p-8 hover:bg-neutral-800/30 transition-colors">
                <dt className="text-neutral-500 font-semibold mb-2 md:mb-0">動作環境</dt>
                <dd className="md:col-span-2 text-neutral-200">
                  最新のGoogle Chrome, Safari等のモダンブラウザをご利用ください。
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 bg-black text-center text-sm text-neutral-600">
        © {new Date().getFullYear()} 株式会社 Nostalgista
      </footer>
    </div>
  );
}
