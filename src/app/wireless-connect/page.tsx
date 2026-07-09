"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowRight, CheckCircle2, Zap, Wifi, Shield, ArrowDown, MonitorPlay, X } from "lucide-react";
import Link from "next/link";

export default function WirelessConnectLP() {
  const [isScrolled, setIsScrolled] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-teal-500/30">
      
      {/* Sticky Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wifi className="w-6 h-6 text-teal-400" />
            <span className="font-bold text-xl tracking-tight">Wireless Connect</span>
          </div>
          <a 
            href="https://buy.stripe.com/28E8wP7f56CY6Pigza33W04" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-5 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors"
          >
            Buy Now
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <video 
            ref={heroVideoRef}
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-40 scale-105"
          >
            <source src="/wireless-connect/videos/HDR60p_cut.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/50 via-neutral-950/20 to-neutral-950"></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center mt-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            次世代の歯科ネットワークインフラ
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
            ケーブルをなくす。<br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-600">
              クリニックが進化する。
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            ゼロ遅延のワイヤレス転送で、歯科診療のワークフローを根本から変革。撮った瞬間から、シームレスなデータ連携が始まります。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
            <a 
              href="https://buy.stripe.com/28E8wP7f56CY6Pigza33W04" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-500 transition-all hover:scale-105 flex items-center gap-2 shadow-[0_0_40px_rgba(13,148,136,0.4)]"
            >
              システムを導入する
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-500 animate-bounce">
          <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
          <ArrowDown className="w-4 h-4" />
        </div>
      </section>

      {/* The Problem & Solution Section */}
      <section className="py-24 relative z-10 bg-neutral-950">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            
            <div className="w-full md:w-1/2 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">従来の煩雑なシステムの終わり。</h2>
              <p className="text-neutral-400 text-lg leading-relaxed">
                高価な機材、複雑な配線、そして絶え間ない通信トラブル。従来のカメラシステムは、現代のスピードに合っていません。Wireless Connectは、足元の配線やSDカードの抜き差しによるストレスを排除し、スマートで洗練された診療環境を実現します。
              </p>
              <div className="space-y-4 pt-4">
                {[
                  "足元の配線やSDカードの抜き差しを完全に排除",
                  "既存の不安定なWi-Fi環境に依存しない専用構築",
                  "専門業者不要、届いたその日から機能するシンプルさ"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 bg-red-500/20 p-1 rounded-full">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-neutral-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-1/2 relative">
              <div className="aspect-video rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl relative bg-neutral-900 group">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                >
                  <source src="/wireless-connect/videos/shooting.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <span className="text-white font-medium drop-shadow-md">High-definition real-time capture</span>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -inset-4 bg-teal-500/10 blur-2xl -z-10 rounded-full"></div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-neutral-900 border-y border-neutral-800">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">モダンな歯科医院のためのインフラ設計</h2>
            <p className="text-neutral-400">ITの専門知識は不要です。日常の診療に、魔法のような画像連携ワークフローをもたらします。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-neutral-950 border border-neutral-800 p-8 rounded-3xl hover:border-teal-500/50 transition-colors group">
              <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">ゼロ遅延のデータ転送</h3>
              <p className="text-neutral-400 leading-relaxed">
                シャッターを切った瞬間、データは安全かつ高速にPCやiPadへ転送されます。患者様を待たせることはもうありません。
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-neutral-950 border border-neutral-800 p-8 rounded-3xl hover:border-teal-500/50 transition-colors group">
              <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MonitorPlay className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">アプリとのシームレス連携</h3>
              <p className="text-neutral-400 leading-relaxed">
                Wireless Connect は堅牢なインフラ層として機能します。専用アプリ「Wireless Connect App」と組み合わせれば、自動スライド生成などの高度な機能も利用可能です。
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-neutral-950 border border-neutral-800 p-8 rounded-3xl hover:border-teal-500/50 transition-colors group">
              <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">独立した強靭なネットワーク</h3>
              <p className="text-neutral-400 leading-relaxed">
                院内の既存Wi-Fiとは独立した、カメラ専用のネットワーク環境を構築します。電子カルテ等のシステムに影響を与えることなく、安定した通信を保証します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Showcase */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row-reverse gap-16 items-center">
            
            <div className="w-full md:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Ultimate Synchronization
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">アプリとの相乗効果。</h2>
              <p className="text-neutral-400 text-lg leading-relaxed">
                Wireless Connect は、目に見えない強靭なハードウェア・インフラとして機能します。ここに連携アプリをアドオンすることで、データは単なる「画像」から、患者様の心を動かす「プレゼンテーション」へと昇華されます。
              </p>
              
              <ul className="space-y-4 pt-4">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                  <span>PC・iPadへのリアルタイムな画像同期</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                  <span>AIによるカルテ・スライドの自動生成（オプション）</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0" />
                  <span>圧倒的なスピードによる感動的な患者体験の提供</span>
                </li>
              </ul>
            </div>

            <div className="w-full md:w-1/2">
              <div className="relative rounded-2xl overflow-hidden border border-neutral-800 shadow-[0_0_50px_rgba(13,148,136,0.15)] bg-neutral-900">
                {/* Simulated App Window Frame */}
                <div className="h-8 bg-neutral-950 flex items-center px-4 gap-2 border-b border-neutral-800">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full aspect-[4/3] object-cover"
                >
                  <source src="/wireless-connect/videos/VID20260518185717~2.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-neutral-950 z-0"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-teal-500/20 blur-[100px] rounded-full z-0 pointer-events-none"></div>
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">クリニックを次の次元へ。</h2>
          <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto">
            Wireless Connect システムを導入し、スマートで洗練された究極の画像連携インフラを手に入れましょう。
          </p>
          
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 rounded-3xl max-w-lg mx-auto mb-10 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6">システム構築パッケージ</h3>
            
            <a 
              href="https://buy.stripe.com/28E8wP7f56CY6Pigza33W04" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full block py-4 rounded-xl bg-teal-600 text-white font-bold text-lg hover:bg-teal-500 transition-colors shadow-lg"
            >
              パッケージを購入する
            </a>
            <p className="text-xs text-neutral-500 mt-4 text-center flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> Secure payment via Stripe
            </p>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-8 border-t border-neutral-900 bg-neutral-950 text-center text-neutral-500 text-sm">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Wifi className="w-4 h-4 text-teal-600" />
            <span>© {new Date().getFullYear()} Nostalgista Inc. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-neutral-300 transition-colors">OralNote Main</Link>
            <a href="#" className="hover:text-neutral-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-neutral-300 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

// simple X icon component as fallback if lucide-react doesn't have it explicitly imported above easily (though it is, adding here to be safe)
function XIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
