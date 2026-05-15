<?php
/*
Template Name: OralNote & Wireless Connect LP
*/
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OralNote | 次世代Dental OS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 900: '#134e4a' },
              emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
            }
          }
        }
      }
    </script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background-color: #0a0a0a;
        color: #f5f5f5;
      }
      /* スムーズスクロール */
      html { scroll-behavior: smooth; }
    </style>
</head>
<body class="bg-neutral-950 text-neutral-100 selection:bg-teal-500/30 overflow-x-hidden">

  <!-- Navigation -->
  <nav class="fixed w-full top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5">
    <div class="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="bg-gradient-to-br from-teal-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-teal-900/50">
          <i data-lucide="file-text" class="w-5 h-5 text-white"></i>
        </div>
        <span class="text-xl font-bold tracking-tight text-white">OralNote</span>
      </div>
      <div class="flex gap-4">
        <a href="https://dental-os-kappa.vercel.app/" class="text-sm font-bold text-white bg-teal-600 hover:bg-teal-500 px-6 py-2.5 rounded-full transition-all flex items-center gap-1 shadow-lg shadow-teal-500/20">
          ログイン / 無料で試す
          <i data-lucide="chevron-right" class="w-4 h-4"></i>
        </a>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="relative pt-40 pb-20 md:pt-48 md:pb-32 px-6">
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
    
    <div class="relative max-w-4xl mx-auto text-center space-y-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-semibold mb-4">
        <i data-lucide="zap" class="w-4 h-4"></i>
        次世代Dental OS（画像転送 × AIカルテ）
      </div>
      <h1 class="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.2]">
        撮った瞬間、iPadに届く。<br />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
          歯科の業務効率を劇的に変える専用アプリ。
        </span>
      </h1>
      <p class="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
        カメラのSDカード運用から解放される「Wireless Connect」と、日々の記録業務をシームレスに繋ぐ「OralNote」。現場のストレスをなくし、患者様と向き合う時間を増やす次世代Dental OS。
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
        <a href="#pricing" class="w-full sm:w-auto px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25">
          料金・プランを見る
          <i data-lucide="chevron-right" class="w-5 h-5"></i>
        </a>
        <a href="https://nostalgista.co.jp/lineup" class="w-full sm:w-auto px-8 py-4 bg-neutral-800 text-white font-bold rounded-2xl hover:bg-neutral-700 transition-all flex items-center justify-center gap-2">
          対応カメラ機材を見る
        </a>
      </div>
    </div>
  </section>

  <!-- Feature 1: Wireless Connect -->
  <section class="py-12 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="flex flex-col md:flex-row items-stretch bg-neutral-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group">
        <div class="w-full md:w-1/2 relative overflow-hidden aspect-video md:aspect-auto md:min-h-[400px] bg-neutral-800 flex items-center justify-center">
          <!-- TODO: 必要に応じてNostalgistaの画像URLに差し替えてください -->
          <img 
            src="https://dental-os-kappa.vercel.app/banner-human.png" 
            alt="Wireless Connect" 
            class="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-neutral-900"></div>
          <div class="z-10 text-center relative">
             <i data-lucide="wifi" class="w-20 h-20 text-teal-400 mx-auto drop-shadow-lg"></i>
          </div>
        </div>
        <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-neutral-900 z-10">
          <div class="text-teal-400 font-bold mb-2 tracking-wider text-sm">WIRELESS CONNECT</div>
          <h2 class="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
            SDカードは、もう抜きません。<br />
            撮った瞬間、iPadがカウンセリングツールに。
          </h2>
          <p class="text-lg text-neutral-300 leading-relaxed mb-4">
            「写真を撮った後、PCに取り込む手間で『撮りっぱなし』になっていませんか？」<br><br>
            シャッターを切るだけで、数秒でiPadへ自動転送。患者様を待たせることなく、最高画質の写真で説明が可能です。最もハードルの高い「ネットワーク設定」は、届いた専用ルーターを院内に置くだけで完了します。
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Feature 2: Voice Charting -->
  <section class="py-12 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="flex flex-col md:flex-row-reverse items-stretch bg-neutral-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group">
        <div class="w-full md:w-1/2 relative overflow-hidden aspect-video md:aspect-auto md:min-h-[400px] bg-neutral-800 flex items-center justify-center">
          <img 
            src="https://dental-os-kappa.vercel.app/voice-chart-human.png" 
            onerror="this.style.display='none'"
            alt="Voice Charting Concept" 
            class="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-l md:from-transparent md:via-transparent md:to-neutral-900"></div>
          <div class="z-10 text-center relative">
             <i data-lucide="mic" class="w-20 h-20 text-blue-400 mx-auto drop-shadow-lg"></i>
          </div>
        </div>
        <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-neutral-900 z-10">
          <div class="text-blue-400 font-bold mb-2 tracking-wider text-sm">DOCUMENTATION ASSIST</div>
          <h2 class="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
            手が塞がっていても、<br />声だけでカルテが完了。
          </h2>
          <p class="text-lg text-neutral-300 leading-relaxed">
            iPadに転送された画像を見ながら、その場で直感的に記録を残せます。タイピングが苦手なスタッフでも安心の「音声入力アシスト」も搭載。忙しい診療の合間でも、カルテの下書きがあっという間に完了します。
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Feature 3: Slide Generation -->
  <section class="pb-12 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="flex flex-col md:flex-row items-stretch bg-neutral-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group">
        <div class="w-full md:w-1/2 relative overflow-hidden aspect-video md:aspect-auto md:min-h-[400px] bg-neutral-800 flex items-center justify-center">
          <img 
            src="https://dental-os-kappa.vercel.app/slide-gen-human.png"
            onerror="this.style.display='none'"
            alt="Automatic PowerPoint Generation" 
            class="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 opacity-60"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-neutral-900"></div>
          <div class="z-10 text-center relative">
             <i data-lucide="presentation" class="w-20 h-20 text-purple-400 mx-auto drop-shadow-lg"></i>
          </div>
        </div>
        <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-neutral-900 z-10">
           <div class="text-purple-400 font-bold mb-2 tracking-wider text-sm">SLIDE AUTOMATION</div>
          <h2 class="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
            カルテのついでに、<br />スライドも一瞬で完成。
          </h2>
          <p class="text-lg text-neutral-300 leading-relaxed">
            Wireless Connectで転送された写真を選ぶだけで、患者説明や症例発表に使える美しいPowerPointが自動生成されます。「画像転送 → 記録作成 → スライド生成」という、全く新しいシームレスな診療スタイルを実現します。
          </p>
        </div>
      </div>
    </div>
  </section>


  <!-- Pricing Section -->
  <section id="pricing" class="py-24 bg-neutral-900/30 border-t border-white/5">
    <div class="max-w-4xl mx-auto px-6">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">システム利用プラン</h2>
        <p class="text-neutral-400">用途に合わせてお選びください。※Wireless Connect機能の利用には、別途専用カメラ機材が必要です。</p>
      </div>

      <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <!-- Personal Plan -->
        <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 hover:border-teal-500/50 transition-all flex flex-col relative group">
          <h3 class="text-2xl font-bold text-white mb-2">Personal <span class="text-sm font-normal text-neutral-400">/ クラウド利用</span></h3>
          <p class="text-sm text-neutral-400 mb-6">個人でのAIカルテ利用（端末2台まで推奨）</p>
          <div class="mb-6">
            <span class="text-4xl font-extrabold text-white">¥3,300</span>
            <span class="text-neutral-500 text-sm">/ 月額(税込)</span>
          </div>
          <ul class="space-y-4 mb-8 flex-1">
            <li class="flex items-start gap-3 text-neutral-300 text-sm"><i data-lucide="check-circle-2" class="w-5 h-5 text-teal-500 shrink-0 mt-0.5"></i> <span><strong>音声カルテ入力メイン</strong><br/><span class="text-xs text-neutral-500">（クラウド型Webアプリからのアクセス）</span></span></li>
            <li class="flex items-center gap-3 text-neutral-300 text-sm"><i data-lucide="check-circle-2" class="w-5 h-5 text-teal-500 shrink-0"></i> AIカルテアシスト機能（無制限）</li>
            <li class="flex items-center gap-3 text-neutral-300 text-sm"><i data-lucide="check-circle-2" class="w-5 h-5 text-teal-500 shrink-0"></i> スライド自動作成機能</li>
          </ul>
          <a 
            href="https://buy.stripe.com/dRmdR9fLB2mIb5yfv633W00" 
            target="_blank" rel="noreferrer"
            class="w-full text-center py-3.5 bg-neutral-800 group-hover:bg-teal-600 text-white font-bold rounded-xl transition-all block"
          >
            Personalを申し込む
          </a>
        </div>

        <!-- Clinic Plan -->
        <div class="bg-gradient-to-b from-neutral-800 to-neutral-900 border border-teal-500 rounded-3xl p-8 shadow-2xl shadow-teal-900/30 flex flex-col relative transform md:-translate-y-4">
          <div class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-t-3xl"></div>
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
            画像転送・完全パッケージ
          </div>
          <h3 class="text-2xl font-bold text-white mb-2 mt-2">Clinic Pro <span class="text-sm font-normal text-teal-300">/ ローカル同期</span></h3>
          <p class="text-sm text-neutral-400 mb-6">クリニック全体での共有（端末5台まで推奨）</p>
          <div class="mb-6">
            <span class="text-4xl font-extrabold text-white">¥5,500</span>
            <span class="text-neutral-500 text-sm">/ 月額(税込)</span>
          </div>
          <ul class="space-y-4 mb-8 flex-1">
            <li class="flex items-start gap-3 text-neutral-300 text-sm"><i data-lucide="check-circle-2" class="w-5 h-5 text-teal-400 shrink-0 mt-0.5"></i> <span><strong>専用デスクトップアプリの提供</strong><br/><span class="text-xs text-teal-300">（クリニックPCへのインストール版）</span></span></li>
            <li class="flex items-start gap-3 text-neutral-300 text-sm"><i data-lucide="check-circle-2" class="w-5 h-5 text-teal-400 shrink-0 mt-0.5"></i> <span><strong>Wireless Connect 画像自動連携</strong><br/><span class="text-xs text-teal-300">（カメラからの自動FTP/Wi-Fi同期）</span></span></li>
            <li class="flex items-center gap-3 text-neutral-300 text-sm"><i data-lucide="check-circle-2" class="w-5 h-5 text-teal-400 shrink-0"></i> iPadへのリアルタイム画像表示</li>
            <li class="flex items-center gap-3 text-neutral-300 text-sm"><i data-lucide="check-circle-2" class="w-5 h-5 text-teal-400 shrink-0"></i> AIカルテ ＆ スライド生成機能</li>
          </ul>
          <div class="space-y-3">
             <button 
               disabled
               class="w-full text-center py-3.5 bg-teal-500/50 text-white/70 font-bold rounded-xl cursor-not-allowed block"
             >
               Clinic Pro 準備中（アプリ版へ移行）
             </button>
             <p class="text-xs text-center text-neutral-500 mt-2">
                ※画像自動連携のご利用には、別途<a href="https://nostalgista.co.jp/lineup" class="underline hover:text-teal-400">設定済みカメラ・ルーターセット</a>が必要です。
             </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 border-t border-white/5 bg-black">
    <div class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <i data-lucide="file-text" class="w-5 h-5 text-neutral-500"></i>
        <span class="text-neutral-400 font-bold">Nostalgista | OralNote</span>
      </div>
      <div class="flex flex-col items-end gap-2">
        <div class="flex items-center gap-4 text-sm text-neutral-500">
          <a href="https://nostalgista.co.jp/company" class="hover:text-white transition-colors">企業概要</a>
          <a href="https://nostalgista.co.jp/tokushoho" class="hover:text-white transition-colors">特定商取引法に基づく表記</a>
        </div>
        <p class="text-sm text-neutral-600">
          © <?php echo date('Y'); ?> 株式会社 Nostalgista All Rights Reserved.
        </p>
      </div>
    </div>
  </footer>

  <script>
    // Initialize Lucide Icons
    lucide.createIcons();
  </script>
</body>
</html>
