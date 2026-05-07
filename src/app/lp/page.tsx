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
            <span className="text-xl font-bold tracking-tight text-white">Dental OS</span>
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

      {/* Concept Image Section */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group bg-neutral-900">
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent z-10" />
            <img 
              src="/concept-voice.png" 
              alt="Hands-free AI Charting Concept" 
              className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 aspect-video md:aspect-[21/9]"
            />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                手が塞がっていても、<br className="hidden md:block" />声だけで完了。
              </h2>
              <p className="text-lg md:text-xl text-neutral-300 max-w-2xl text-shadow">
                グローブを外す必要も、キーボードを叩く必要もありません。治療しながら、あるいは治療直後に喋るだけで、AIが瞬時に構造化されたカルテ（SOAP形式）を書き上げます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-neutral-900/30 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Dental OS の圧倒的な特徴</h2>
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
                Dental OSは日々進化します。将来的には蓄積したカルテデータの「高度な検索性向上」や「分析機能」など、医院の資産を最大化するアップデートを予定しています。
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

          <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 space-y-6 w-full">
                <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold">
                  モニター特別価格
                </div>
                <div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-5xl font-extrabold text-white">¥3,300</span>
                    <span className="text-neutral-400 font-medium mb-1">/ 月額 (税込)</span>
                  </div>
                  <p className="text-neutral-500 text-sm">※価格は将来改定される場合がありますが、モニター期間中にご契約いただいた方は永続してこの価格でご利用いただけます。</p>
                </div>
                
                <ul className="space-y-4 pt-4 border-t border-neutral-800">
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
                    AIカルテアシスト機能（無制限）
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
                    スライド自動作成機能
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
                    将来の検索機能などの無償アップデート
                  </li>
                  <li className="flex items-center gap-3 text-neutral-300 font-bold">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    解約自由（いつでもキャンセル可能）
                  </li>
                </ul>
              </div>

              <div className="w-full md:w-[320px] shrink-0">
                <div className="bg-black/50 border border-white/5 rounded-3xl p-6 text-center">
                  <h4 className="text-white font-bold mb-6">導入のご相談・お申し込み</h4>
                  <a 
                    href="https://lin.ee/MBSF2D9" 
                    target="_blank"
                    rel="noreferrer"
                    className="w-full block px-6 py-4 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-2xl transition-all"
                  >
                    LINEで申し込む
                  </a>
                  <p className="text-xs text-neutral-500 mt-4">Nostalgista公式LINEへ遷移します</p>
                </div>
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
            <span className="text-neutral-400 font-bold">Dental OS</span>
          </div>
          <p className="text-sm text-neutral-600">
            © {new Date().getFullYear()} 株式会社 Nostalgista All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
