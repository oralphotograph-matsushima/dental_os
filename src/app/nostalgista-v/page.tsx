"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Maximize, Play, Video, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function NostalgistaVTeaser() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Simulation State
  const [simState, setSimState] = useState<'idle' | 'recording' | 'flash' | 'compare'>('idle');
  const [sliderPosition, setSliderPosition] = useState(50);
  const simulationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Trigger simulation when scrolled into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && simState === 'idle') {
          startSimulation();
        }
      },
      { threshold: 0.5 }
    );
    
    if (simulationRef.current) {
      observer.observe(simulationRef.current);
    }
    
    return () => observer.disconnect();
  }, [simState]);

  const startSimulation = () => {
    setSimState('recording');
    
    // Simulate recording for 3 seconds, then flash
    setTimeout(() => {
      setSimState('flash');
      
      // Flash duration 0.5s, then show compare UI
      setTimeout(() => {
        setSimState('compare');
      }, 500);
    }, 3000);
  };

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (simState !== 'compare') return;
    if (!simulationRef.current) return;

    const rect = simulationRef.current.getBoundingClientRect();
    let clientX = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500 selection:text-white font-sans overflow-x-hidden">
      
      {/* Global Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
            NOSTALGISTA <span className="text-orange-500">V</span>
          </div>
          <Link href="/" className="text-sm text-neutral-400 hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-black to-black opacity-50" />
        
        {/* The Giant V */}
        <div className="relative z-10 w-full max-w-[1200px] flex flex-col justify-center items-center h-full">
          <h1 className={`absolute text-[18rem] md:text-[35rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-400 to-black transition-all duration-[2000ms] ease-out ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`} style={{ WebkitTextStroke: '1px rgba(255,255,255,0.05)', transform: 'scaleY(0.8)' }}>
            V
          </h1>
          
          {/* The 4 V's (Wider Cinemascope Layout) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none w-full px-6 md:px-20">
            <div className="w-full flex flex-col justify-between h-[50vh] md:h-[40vh]">
              {/* Top Row */}
              <div className="w-full flex justify-between items-center px-4 md:px-12">
                <div className={`transition-all duration-1000 delay-500 text-left ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                  <p className="text-orange-500 font-bold tracking-[0.4em] md:tracking-[0.6em] text-sm md:text-xl uppercase">Vision</p>
                  <p className="text-neutral-500 text-xs md:text-sm mt-2 tracking-wider">新たな視界</p>
                </div>
                <div className={`transition-all duration-1000 delay-700 text-right ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                  <p className="text-orange-500 font-bold tracking-[0.4em] md:tracking-[0.6em] text-sm md:text-xl uppercase">Visual</p>
                  <p className="text-neutral-500 text-xs md:text-sm mt-2 tracking-wider">圧倒的画質</p>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="w-full flex justify-between items-center px-4 md:px-12">
                <div className={`transition-all duration-1000 delay-1000 text-left ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                  <p className="text-orange-500 font-bold tracking-[0.4em] md:tracking-[0.6em] text-sm md:text-xl uppercase">Value</p>
                  <p className="text-neutral-500 text-xs md:text-sm mt-2 tracking-wider">真の価値</p>
                </div>
                <div className={`transition-all duration-1000 delay-[1200ms] text-right ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                  <p className="text-orange-500 font-bold tracking-[0.4em] md:tracking-[0.6em] text-sm md:text-xl uppercase">Video</p>
                  <p className="text-neutral-500 text-xs md:text-sm mt-2 tracking-wider">動画というインフラ</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 delay-[2000ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-neutral-500 text-[10px] tracking-[0.4em] uppercase mb-4">Discover the Next Phase</p>
          <div className="w-[1px] h-16 bg-gradient-to-b from-orange-500 to-transparent animate-pulse" />
        </div>
      </section>

      {/* Statement Section */}
      <section className="py-32 md:py-48 px-6 relative">
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white mb-8">
            <span className="inline-block">口腔内写真は、</span><br className="md:hidden" />
            <span className="inline-block"><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">動画を活用する</span>ことで</span><br />
            <span className="inline-block">次のフェーズに移行する。</span>
          </h2>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            <span className="inline-block">止まった世界では見えなかったものが、</span><span className="inline-block">動くことで真実の姿を現す。</span><br />
            <span className="inline-block">Nostalgista Vは、動画を記録しながら</span><span className="inline-block">劇的なビフォーアフターを生成する、</span><br className="hidden md:block" />
            <span className="inline-block">まったく新しい歯科診療のインフラです。</span>
          </p>
        </div>
      </section>

      {/* Simulation Section */}
      <section className="py-24 px-4 md:px-12 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          
          <div className="mb-16 text-center">
            <h3 className="text-orange-500 font-bold tracking-widest text-sm mb-4 uppercase">Experience</h3>
            <p className="text-2xl md:text-3xl font-bold text-white">次世代の記録・比較プロセスを体感する</p>
          </div>

          <div 
            ref={simulationRef}
            className="relative w-full aspect-[4/3] md:aspect-video bg-[#0a0a0a] rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(249,115,22,0.1)] cursor-crosshair group select-none"
            onMouseMove={handleSliderMove}
            onTouchMove={handleSliderMove}
          >
            {/* 1. Recording State */}
            <div className={`absolute inset-0 transition-opacity duration-500 ${simState === 'idle' || simState === 'recording' ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10" />
              
              {/* Video Background (Before) */}
              <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                <span className="text-white/20 text-sm tracking-widest absolute">VIDEO PLACEHOLDER (BEFORE)</span>
                <video 
                  src="/nostalgista-v/demo_before.mp4" 
                  autoPlay loop muted playsInline
                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[5000ms] ${simState === 'recording' ? 'scale-110' : 'scale-100'} filter grayscale-[30%] opacity-80`}
                />
              </div>

              {/* UI Overlay */}
              <div className="absolute inset-0 z-20 p-6 md:p-8 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-white" />
                    <span className="font-mono text-sm text-white font-bold drop-shadow-md">4K 30fps</span>
                  </div>
                  <div className={`flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full ${simState === 'recording' ? 'animate-pulse' : ''}`}>
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                    <span className="font-mono text-sm font-bold text-red-500 tracking-wider">REC</span>
                    <span className="font-mono text-xs text-white ml-2">00:00:03</span>
                  </div>
                </div>

                {/* Center Reticle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-64 md:h-64 border-[1px] border-white/30 rounded-full flex items-center justify-center transition-transform duration-1000 ease-out">
                  <div className="w-2 h-2 bg-orange-500/80 rounded-full" />
                  <Maximize className="absolute w-8 h-8 text-white/50 top-[-16px] left-[-16px]" strokeWidth={1} />
                  <Maximize className="absolute w-8 h-8 text-white/50 bottom-[-16px] right-[-16px]" strokeWidth={1} />
                </div>

                <div className="text-center w-full">
                  <p className="text-white/60 font-mono text-xs tracking-widest">NOSTALGISTA CAMERA APP - AUTO CAPTURE MODE</p>
                </div>
              </div>
            </div>

            {/* 2. Flash State */}
            <div className={`absolute inset-0 bg-white z-30 transition-opacity duration-150 ${simState === 'flash' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

            {/* 3. Compare State */}
            <div className={`absolute inset-0 z-40 transition-opacity duration-1000 ${simState === 'compare' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              
              {/* After Video (Background) */}
              <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
                <span className="text-white/20 text-sm tracking-widest absolute">VIDEO PLACEHOLDER (AFTER)</span>
                <video 
                  src="/nostalgista-v/demo_after.mp4" 
                  autoPlay loop muted playsInline
                  className="absolute inset-0 w-full h-full object-cover" 
                />
              </div>
              
              {/* Before Video (Clipped) */}
              <div 
                className="absolute inset-0 w-full h-full border-r-2 border-orange-500 shadow-[2px_0_15px_rgba(0,0,0,0.5)] overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                <div className="absolute top-0 left-0 h-full bg-neutral-900 flex items-center justify-center" style={{ width: simulationRef.current?.offsetWidth || '100vw' }}>
                  <video 
                    src="/nostalgista-v/demo_before.mp4" 
                    autoPlay loop muted playsInline
                    className="absolute inset-0 w-full h-full object-cover filter grayscale-[30%] opacity-80" 
                  />
                </div>
                
                {/* Before Label */}
                <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                  <span className="text-xs font-bold tracking-widest text-white">BEFORE (Captured)</span>
                </div>
              </div>

              {/* After Label */}
              <div className="absolute top-6 right-6 bg-orange-500/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-orange-400/30">
                <span className="text-xs font-bold tracking-widest text-white">AFTER</span>
              </div>

              {/* Slider Handle */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize group-hover:bg-orange-500 transition-colors"
                style={{ left: `calc(${sliderPosition}% - 2px)` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black border-2 border-orange-500 rounded-full flex items-center justify-center shadow-xl">
                  <ChevronLeft className="w-3 h-3 text-white" />
                  <ChevronRight className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Hint Text */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
                <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center gap-3">
                  <ArrowRight className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-sm font-bold text-white tracking-wider">Drag to Compare</span>
                </div>
              </div>

            </div>

            {/* Replay Button */}
            {simState === 'compare' && (
              <button 
                onClick={(e) => { e.stopPropagation(); setSimState('idle'); setTimeout(startSimulation, 500); }}
                className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-black/50 hover:bg-black/80 transition-colors backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2"
              >
                <Play className="w-4 h-4 text-white" fill="currentColor" />
                <span className="text-xs font-bold text-white tracking-widest">REPLAY</span>
              </button>
            )}

          </div>
        </div>
      </section>

      {/* Footer / CTA Section */}
      <section className="py-32 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-500/5" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">Coming Soon.</h2>
          <p className="text-neutral-400 mb-12 text-lg">動画が変える、記録と説明のパラダイムシフト。<br />Nostalgista V の全貌公開をお待ちください。</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://lin.ee/MBSF2D9" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-full font-bold transition-all shadow-[0_0_20px_rgba(6,199,85,0.3)] flex items-center justify-center gap-2">
              LINEで最新情報を受け取る
            </a>
            <Link href="/" className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all backdrop-blur-md border border-white/10">
              既存のシステムを見る
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
