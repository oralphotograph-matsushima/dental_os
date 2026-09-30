"use client";

import React, { useEffect, useState } from 'react';
import { Camera, Monitor, Tablet, Image as ImageIcon } from 'lucide-react';

export default function HeroAnimationSimple({ onClick }: { onClick?: () => void }) {
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrigger(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      key={trigger} 
      className="relative w-full h-[350px] md:h-[450px] rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl flex items-center justify-center cursor-pointer group"
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-colors duration-300 z-40" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50 pointer-events-none">
         <span className="bg-black/80 text-white px-6 py-3 rounded-full font-bold tracking-wider text-sm border border-white/20 shadow-xl backdrop-blur-sm">
            詳細を見る
         </span>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .anim-s-flash { animation: s-flash 5s linear infinite; }
        @keyframes s-flash { 0%, 9% { opacity: 0; } 10% { opacity: 1; } 15%, 100% { opacity: 0; } }

        .anim-s-camera { animation: s-camera 5s linear infinite; }
        @keyframes s-camera { 0%, 8% { transform: scale(1); } 10% { transform: scale(1.1); } 15%, 100% { transform: scale(1); } }

        .anim-s-fly-pc { animation: s-fly-pc 5s linear infinite; }
        @keyframes s-fly-pc { 
          0%, 15% { opacity: 0; left: 18%; top: 50%; transform: scale(0.5); } 
          16% { opacity: 1; transform: scale(1); } 
          35% { opacity: 1; left: 50%; top: 50%; transform: scale(0.8); } 
          36%, 100% { opacity: 0; left: 50%; top: 50%; } 
        }

        .anim-s-fly-ipad { animation: s-fly-ipad 5s linear infinite; }
        @keyframes s-fly-ipad { 
          0%, 15% { opacity: 0; left: 18%; top: 50%; transform: scale(0.5); } 
          16% { opacity: 1; transform: scale(1); } 
          35% { opacity: 1; left: 80%; top: 50%; transform: scale(0.8); } 
          36%, 100% { opacity: 0; left: 80%; top: 50%; } 
        }

        .anim-s-device-pc { animation: s-device-wake 5s linear infinite; }
        .anim-s-device-ipad { animation: s-device-wake 5s linear infinite; }
        @keyframes s-device-wake {
          0%, 34% { opacity: 0.3; filter: drop-shadow(0 0 0px #f97316); }
          35%, 100% { opacity: 1; filter: drop-shadow(0 0 20px rgba(249,115,22,0.5)); color: #f97316; }
        }

        .anim-s-text { animation: s-text 5s linear infinite; }
        @keyframes s-text {
          0%, 45% { opacity: 0; transform: translateY(20px); }
          50%, 85% { opacity: 1; transform: translateY(0); }
          90%, 100% { opacity: 0; transform: translateY(-20px); }
        }

        .anim-s-logo { animation: s-logo 5s linear infinite; }
        @keyframes s-logo {
          0%, 85% { opacity: 0; }
          90%, 100% { opacity: 1; }
        }

        .anim-s-line { animation: s-line 5s linear infinite; }
        @keyframes s-line {
          0%, 15% { width: 0; opacity: 0; }
          16% { opacity: 1; }
          35%, 100% { width: 62%; opacity: 0; }
        }

        @media (max-width: 768px) {
          .anim-s-fly-pc { animation: s-fly-pc-mobile 5s linear infinite; }
          @keyframes s-fly-pc-mobile { 
            0%, 15% { opacity: 0; left: 18%; top: 30%; transform: scale(0.5); } 
            16% { opacity: 1; transform: scale(1); } 
            35% { opacity: 1; left: 50%; top: 30%; transform: scale(0.8); } 
            36%, 100% { opacity: 0; left: 50%; top: 30%; } 
          }

          .anim-s-fly-ipad { animation: s-fly-ipad-mobile 5s linear infinite; }
          @keyframes s-fly-ipad-mobile { 
            0%, 15% { opacity: 0; left: 18%; top: 30%; transform: scale(0.5); } 
            16% { opacity: 1; transform: scale(1); } 
            35% { opacity: 1; left: 80%; top: 30%; transform: scale(0.8); } 
            36%, 100% { opacity: 0; left: 80%; top: 30%; } 
          }
        }
      `}} />

      {/* フラッシュ */}
      <div className="absolute inset-0 bg-white anim-s-flash z-30 pointer-events-none" />

      {/* ネットワークの線 */}
      <div className="absolute top-1/2 left-[18%] h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent -translate-y-1/2 anim-s-line z-0" />

      {/* カメラ (左) */}
      <div className="absolute left-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center anim-s-camera text-neutral-400 z-10">
        <Camera className="w-12 h-12 md:w-20 md:h-20" strokeWidth={1.5} />
        <div className="text-center text-[10px] md:text-xs mt-2 font-bold tracking-widest text-neutral-500">CAMERA</div>
      </div>

      {/* 飛んでいくデータ（PCへ） */}
      <div className="absolute -translate-y-1/2 -translate-x-1/2 anim-s-fly-pc z-20 text-orange-400 drop-shadow-[0_0_10px_#f97316]">
        <ImageIcon className="w-8 h-8 md:w-10 md:h-10" />
      </div>

      {/* 飛んでいくデータ（iPadへ） */}
      <div className="absolute -translate-y-1/2 -translate-x-1/2 anim-s-fly-ipad z-20 text-orange-400 drop-shadow-[0_0_10px_#f97316]">
        <ImageIcon className="w-8 h-8 md:w-10 md:h-10" />
      </div>

      {/* PC (中央) */}
      <div className="absolute left-[50%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center text-neutral-500 anim-s-device-pc z-10">
        <Monitor className="w-16 h-16 md:w-24 md:h-24" strokeWidth={1.5} />
        <div className="text-center text-[10px] md:text-xs mt-2 font-bold tracking-widest">CLINIC PC</div>
      </div>

      {/* iPad (右) */}
      <div className="absolute left-[80%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center text-neutral-500 anim-s-device-ipad z-10">
        <Tablet className="w-12 h-12 md:w-16 md:h-16" strokeWidth={1.5} />
        <div className="text-center text-[10px] md:text-xs mt-2 font-bold tracking-widest">iPad</div>
      </div>

      {/* メッセージ */}
      <div className="absolute bottom-[10%] w-full text-center anim-s-text px-4 z-10">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">撮るだけ。<span className="text-orange-400">一瞬</span>で全端末へ。</h2>
        <p className="text-sm md:text-base text-neutral-400">Wireless Connect 画像自動転送</p>
      </div>

      {/* 最後のロゴ */}
      <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center anim-s-logo z-20">
        <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-orange-400 to-amber-600 p-3 rounded-2xl">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl md:text-4xl font-bold tracking-tight text-white">Wireless Connect</span>
        </div>
        <p className="text-orange-400 font-bold tracking-widest text-xs md:text-sm">次世代 Dental OS</p>
      </div>
    </div>
  );
}
