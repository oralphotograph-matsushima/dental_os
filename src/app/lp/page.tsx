import React from 'react';
import { Mic, FileText, Presentation, Wifi, Zap, ChevronRight, CheckCircle2 } from 'lucide-react';

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
              ログイン / 無料で試す
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
            次世代Dental OS（画像転送 × AIカルテ）
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.2]">
            撮った瞬間、iPadに届く。<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              しゃべるだけで、カルテが完成する。
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            SDカードの抜き差しから解放される「Wireless Connect」と、音声でSOAPカルテを自動生成する「OralNote AI」。毎日の臨床を劇的に変える、統合型システム。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <a href="#pricing" className="w-full sm:w-auto px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25">
              料金・プランを見る
              <ChevronRight className="w-5 h-5" />
            </a>
            <a href="https://nostalgista.co.jp/lineup" target="_blank" rel="noreferrer" className="w-full sm:w-auto px-8 py-4 bg-neutral-800 text-white font-bold rounded-2xl hover:bg-neutral-700 transition-all flex items-center justify-center gap-2">
              対応カメラ機材を見る
            </a>
          </div>
        </div>
      </section>

      {/* Feature 1: Wireless Connect */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch bg-neutral-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group">
            <div className="w-full md:w-1/2 relative overflow-hidden aspect-video md:aspect-auto md:min-h-[400px] bg-neutral-800 flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80" 
                alt="Wireless Connect" 
                className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-neutral-900" />
              <div className="z-10 text-center relative">
                 <Wifi className="w-20 h-20 text-teal-400 mx-auto drop-shadow-lg" />
              </div>
            </div>
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-neutral-900 z-10">
              <div className="text-teal-400 font-bold mb-2 tracking-wider text-sm">WIRELESS CONNECT</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                SDカードは、もう抜きません。<br />
                撮った瞬間、iPadがカウンセリングツールに。
              </h2>
              <p className="text-lg text-neutral-300 leading-relaxed mb-4">
                「写真を撮った後、PCに取り込む手間で『撮りっぱなし』になっていませんか？」<br/><br/>
                シャッターを切るだけで、数秒でiPadへ自動転送。患者様を待たせることなく、最高画質の写真で説明が可能です。最もハードルの高い「ネットワーク設定」は、届いた専用ルーターを院内に置くだけで完了します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Voice Charting */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row-reverse items-stretch bg-neutral-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group">
            <div className="w-full md:w-1/2 relative overflow-hidden aspect-video md:aspect-auto md:min-h-[400px] bg-neutral-800 flex items-center justify-center">
              <img 
                src="/voice-chart-concept.png" 
                alt="Voice Charting Concept" 
                className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-l md:from-transparent md:via-transparent md:to-neutral-900" />
              <div className="z-10 text-center relative">
                 <Mic className="w-20 h-20 text-blue-400 mx-auto drop-shadow-lg" />
              </div>
            </div>
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-neutral-900 z-10">
              <div className="text-blue-400 font-bold mb-2 tracking-wider text-sm">AI CHARTING</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                手が塞がっていても、<br />声だけでカルテが完了。
              </h2>
              <p className="text-lg text-neutral-300 leading-relaxed">
                グローブを外す必要も、キーボードを叩く必要もありません。治療しながら、あるいは治療直後に喋るだけで、AIが瞬時に構造化されたカルテ（SOAP形式）を書き上げます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Slide Generation */}
      <section className="pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch bg-neutral-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group">
            <div className="w-full md:w-1/2 relative overflow-hidden aspect-video md:aspect-auto md:min-h-[400px] bg-neutral-800 flex items-center justify-center">
              <img 
                src="/slide-gen-concept.png"
                alt="Automatic PowerPoint Generation" 
                className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-neutral-900" />
              <div className="z-10 text-center relative">
                 <Presentation className="w-20 h-20 text-purple-400 mx-auto drop-shadow-lg" />
              </div>
            </div>
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-neutral-900 z-10">
               <div className="text-purple-400 font-bold mb-2 tracking-wider text-sm">SLIDE AUTOMATION</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                カルテのついでに、<br />スライドも一瞬で完成。
              </h2>
              <p className="text-lg text-neutral-300 leading-relaxed">
                Wireless Connectで転送された写真をアップロードするだけで、患者説明や症例発表に使える美しいPowerPointが自動生成されます。「画像転送 → 声でカルテ作成 → スライド生成」という、全く新しいシームレスな診療スタイルを実現します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-neutral-900/30 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">システム利用プラン</h2>
            <p className="text-neutral-400">用途に合わせてお選びください。※Wireless Connect機能の利用には、別途専用カメラ機材が必要です。</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Personal Plan */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 hover:border-teal-500/50 transition-all flex flex-col relative group">
              <h3 className="text-2xl font-bold text-white mb-2">Personal <span className="text-sm font-normal text-neutral-400">/ クラウド利用</span></h3>
              <p className="text-sm text-neutral-400 mb-6">個人でのAIカルテ利用（端末2台まで推奨）</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">¥3,300</span>
                <span className="text-neutral-500 text-sm">/ 月額(税込)</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" /> <span><strong>音声カルテ入力メイン</strong><br/><span className="text-xs text-neutral-500">（クラウド型Webアプリからのアクセス）</span></span></li>
                <li className="flex items-center gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" /> AIカルテアシスト機能（無制限）</li>
                <li className="flex items-center gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" /> スライド自動作成機能</li>
              </ul>
              <a 
                href="https://buy.stripe.com/dRmdR9fLB2mIb5yfv633W00" 
                target="_blank" rel="noreferrer"
                className="w-full text-center py-3.5 bg-neutral-800 group-hover:bg-teal-600 text-white font-bold rounded-xl transition-all block"
              >
                Personalを申し込む
              </a>
            </div>

            {/* Clinic Plan */}
            <div className="bg-gradient-to-b from-neutral-800 to-neutral-900 border border-teal-500 rounded-3xl p-8 shadow-2xl shadow-teal-900/30 flex flex-col relative transform md:-translate-y-4">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-t-3xl" />
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                画像転送・完全パッケージ
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 mt-2">Clinic Pro <span className="text-sm font-normal text-teal-300">/ ローカル同期</span></h3>
              <p className="text-sm text-neutral-400 mb-6">クリニック全体での共有（端末5台まで推奨）</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">¥5,500</span>
                <span className="text-neutral-500 text-sm">/ 月額(税込)</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" /> <span><strong>専用デスクトップアプリの提供</strong><br/><span className="text-xs text-teal-300">（クリニックPCへのインストール版）</span></span></li>
                <li className="flex items-start gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" /> <span><strong>Wireless Connect 画像自動連携</strong><br/><span className="text-xs text-teal-300">（カメラからの自動FTP/Wi-Fi同期）</span></span></li>
                <li className="flex items-center gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" /> iPadへのリアルタイム画像表示</li>
                <li className="flex items-center gap-3 text-neutral-300 text-sm"><CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" /> AIカルテ ＆ スライド生成機能</li>
              </ul>
              <div className="space-y-3">
                 <button 
                   disabled
                   className="w-full text-center py-3.5 bg-teal-500/50 text-white/70 font-bold rounded-xl cursor-not-allowed block"
                 >
                   Clinic Pro 準備中（アプリ版へ移行）
                 </button>
                 <p className="text-xs text-center text-neutral-500 mt-2">
                    ※画像自動連携のご利用には、別途<a href="https://nostalgista.co.jp/lineup" target="_blank" rel="noreferrer" className="underline hover:text-teal-400">設定済みカメラ・ルーターセット</a>が必要です。
                 </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-black">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-neutral-500" />
            <span className="text-neutral-400 font-bold">Nostalgista | OralNote AI</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4 text-sm text-neutral-500">
              <a href="https://nostalgista.co.jp/company" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">企業概要</a>
              <a href="https://nostalgista.co.jp/tokushoho" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">特定商取引法に基づく表記</a>
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
