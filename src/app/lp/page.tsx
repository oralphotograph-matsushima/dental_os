import React from 'react';
import { Mic, FileText, Presentation, Search, ShieldCheck, Zap, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-teal-500/30 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-teal-900/50">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">OralNote AI</span>
          </div>
          <div>
            <a href="/" className="text-sm font-bold text-white bg-teal-600 hover:bg-teal-500 px-6 py-2.5 rounded-full transition-all flex items-center gap-1 shadow-lg shadow-teal-500/20">
              無料で試す
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-semibold mb-4">
            <Zap className="w-4 h-4" />
            次世代のAIカルテ入力システム
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            しゃべるだけで、<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              完璧なカルテが完成する。
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            最新のAI処理を内部に完全統合。音声と手打ちを組み合わせ、毎日のカルテ業務とスライド作成を劇的に効率化します。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <a href="/" className="w-full sm:w-auto px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25">
              無料で5回試してみる
              <ChevronRight className="w-5 h-5" />
            </a>
            <a href="#pricing" className="w-full sm:w-auto px-8 py-4 bg-neutral-800 text-white font-bold rounded-2xl hover:bg-neutral-700 transition-all flex items-center justify-center gap-2">
              料金プランを見る
            </a>
          </div>
        </div>
      </section>

      {/* Concept Image Section 1: Voice Charting */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch bg-neutral-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group">
            <div className="w-full md:w-1/2 relative overflow-hidden aspect-video md:aspect-auto md:min-h-[400px]">
              <img 
                src="/voice-chart-concept.png" 
                alt="Hands-free AI Charting Concept" 
                className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-neutral-900" />
            </div>
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-neutral-900 z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                手が塞がっていても、<br />声だけで完了。
              </h2>
              <p className="text-lg md:text-xl text-neutral-300 leading-relaxed">
                グローブを外す必要も、キーボードを叩く必要もありません。治療しながら、あるいは治療直後に喋るだけで、AIが瞬時に構造化されたカルテ（SOAP形式）を書き上げます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Slide Concept Section 2: Slide Generation */}
      <section className="pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row-reverse items-stretch bg-neutral-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group">
            <div className="w-full md:w-1/2 relative overflow-hidden aspect-video md:aspect-auto md:min-h-[400px]">
              {/* Note: Change this to /real-slide.jpg if you upload your own image to the public folder! */}
              <img 
                src="/slide-gen-concept.png"
                alt="Automatic PowerPoint Generation" 
                className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-l md:from-transparent md:via-transparent md:to-neutral-900" />
            </div>
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-neutral-900 z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                カルテのついでに、<br />スライドも一瞬で完成。
              </h2>
              <p className="text-lg md:text-xl text-neutral-300 leading-relaxed">
                写真をアップロードするだけで、患者説明や症例発表に使える美しいPowerPointが自動生成されます。「声で素早くカルテを終わらせ、そのままスライドを作って即座に患者さんへ説明する」という全く新しい診療スタイルを実現します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-neutral-900/30 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">OralNote AI の圧倒的な特徴</h2>
            <p className="text-neutral-400">毎日の臨床をサポートする3つのコア機能と、進化し続けるシステム。</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 hover:border-teal-500/30 transition-colors">
              <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Mic className="w-7 h-7 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AIカルテアシスト</h3>
              <p className="text-neutral-400 leading-relaxed">
                内部に高度なAI処理を内蔵。「音声での吹き込み」と「タップ式歯列表＋手打ちメモ」のハイブリッド入力で、瞬時に美しいSOAP形式のカルテを生成します。
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 hover:border-blue-500/30 transition-colors">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Presentation className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">スライド自動作成機能</h3>
              <p className="text-neutral-400 leading-relaxed">
                口腔内写真やパノラマ画像をアップロードするだけで、患者説明用や症例発表用の美しいスライド（PowerPoint形式）を全自動で生成・書き出します。
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 hover:border-purple-500/30 transition-colors relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 relative">
                <Search className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">将来の機能拡張予定</h3>
              <p className="text-neutral-400 leading-relaxed">
                OralNote AIは日々進化します。将来的には蓄積したカルテデータの「高度な検索性向上」や「分析機能」など、医院の資産を最大化するアップデートを予定しています。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">シンプルな料金体系</h2>
            <p className="text-neutral-400">初期費用なし。いつでも解約可能です。</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Personal Plan */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 hover:border-teal-500/50 transition-all flex flex-col relative group">
              <h3 className="text-xl font-bold text-white mb-2">Personal</h3>
              <p className="text-sm text-neutral-400 mb-6">個人での利用（端末2台まで推奨）</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">¥3,300</span>
                <span className="text-neutral-500 text-sm">/ 月額(税込)</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" /> <span><strong>音声カルテ入力メイン</strong><br/><span className="text-xs text-neutral-500">（クラウド型Webアプリ）</span></span></li>
                <li className="flex items-center gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" /> AIカルテアシスト機能（無制限）</li>
                <li className="flex items-center gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" /> スライド自動作成機能</li>
              </ul>
              <a 
                href="https://buy.stripe.com/dRmdR9fLB2mIb5yfv633W00" 
                target="_blank" rel="noreferrer"
                className="w-full text-center py-3.5 bg-neutral-800 group-hover:bg-teal-600 text-white font-bold rounded-xl transition-all"
              >
                利用を開始する
              </a>
            </div>

            {/* Clinic Plan */}
            <div className="bg-gradient-to-b from-neutral-800 to-neutral-900 border border-teal-500 rounded-3xl p-8 shadow-2xl shadow-teal-900/30 flex flex-col relative transform md:-translate-y-4">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-t-3xl" />
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                一番人気
              </div>
              <h3 className="text-xl font-bold text-white mb-2 mt-2">Clinic</h3>
              <p className="text-sm text-neutral-400 mb-6">クリニック全体での共有（端末5台まで推奨）</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">¥5,500</span>
                <span className="text-neutral-500 text-sm">/ 月額(税込)</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" /> <span><strong>専用デスクトップアプリの提供</strong><br/><span className="text-xs text-neutral-400">（クリニックPCへのインストール版）</span></span></li>
                <li className="flex items-start gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" /> <span><strong>カメラからの自動FTP/Wi-Fi同期</strong><br/><span className="text-xs text-neutral-400">（撮影画像を患者ごとに全自動振り分け）</span></span></li>
                <li className="flex items-center gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" /> iPadへのリアルタイム画像表示</li>
              </ul>
              <button 
                disabled
                className="w-full text-center py-3.5 bg-teal-500/50 text-white/70 font-bold rounded-xl cursor-not-allowed"
              >
                現在準備中（アプリ版へ移行）
              </button>
            </div>

            {/* Corporate Plan */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 hover:border-teal-500/50 transition-all flex flex-col relative group">
              <h3 className="text-xl font-bold text-white mb-2">Corporate</h3>
              <p className="text-sm text-neutral-400 mb-6">法人・大規模利用（端末10台まで推奨）</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">¥9,900</span>
                <span className="text-neutral-500 text-sm">/ 月額(税込)</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" /> <span><strong>専用デスクトップアプリの提供</strong><br/><span className="text-xs text-neutral-500">（大型分院への一括導入に対応）</span></span></li>
                <li className="flex items-start gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" /> <span><strong>カメラからの自動FTP/Wi-Fi同期</strong><br/><span className="text-xs text-neutral-500">（全チェアへのリアルタイム画像表示）</span></span></li>
                <li className="flex items-center gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" /> 全基本機能の無制限利用</li>
              </ul>
              <button 
                disabled
                className="w-full text-center py-3.5 bg-neutral-800/50 text-white/50 font-bold rounded-xl cursor-not-allowed"
              >
                現在準備中（アプリ版へ移行）
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-neutral-500" />
            <span className="text-neutral-400 font-bold">OralNote AI</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <a href="/tokushoho" className="hover:text-white transition-colors">特定商取引法に基づく表記</a>
              <a href="/lp" className="hover:text-white transition-colors">利用規約</a>
            </div>
            <p className="text-sm text-neutral-600">
              © {new Date().getFullYear()} 株式会社 Nostalgista All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
