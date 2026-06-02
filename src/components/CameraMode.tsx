"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, Image as ImageIcon, Send, X, CheckCircle, AlertCircle, LayoutTemplate, Download } from "lucide-react";
import * as htmlToImage from 'html-to-image';

interface CameraModeProps {
  activePatient?: string;
}

export default function CameraModePage({ activePatient }: CameraModeProps) {
  const [patientId, setPatientId] = useState("");
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [analysisResults, setAnalysisResults] = useState<Record<string, string[]> | null>(null);
  const [duplicateConflicts, setDuplicateConflicts] = useState<Record<string, string[]> | null>(null);
  const [showSlidePreview, setShowSlidePreview] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  // activePatient Prop の変化、または初回ロード時に現在のActive Patientを取得
  useEffect(() => {
    if (activePatient) {
      const idOnly = activePatient.includes('_') ? activePatient.split('_')[0] : activePatient;
      setPatientId(idOnly);
      setActivePatientId(activePatient); // Keep full name (e.g., 1234_ヤマダ) for folder and image sync
      fetchImages(activePatient);
      
      fetch(`http://${window.location.hostname}:3001/api/patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: activePatient }) // Create full folder name on PC Watcher
      }).then(res => {
        if (res.ok) {
          connectSSE();
        }
      }).catch(err => console.error("Failed to sync active patient to PC server:", err));
    } else {
      fetchActivePatient();
    }
  }, [activePatient]);

  // スリープ復帰時などの自動再接続処理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!isConnected && activePatientId) {
          connectSSE();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isConnected, activePatientId]);

  const fetchActivePatient = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/patient`);
      if (res.ok) {
        const data = await res.json();
        if (data.activePatientId) {
          setActivePatientId(data.activePatientId);
          const idOnly = data.activePatientId.includes('_') ? data.activePatientId.split('_')[0] : data.activePatientId;
          setPatientId(idOnly);
          fetchImages(data.activePatientId);
          connectSSE();
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("PCサーバーに接続できません。");
    }
  };

  const fetchImages = async (id: string) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/patients/${id}/images`);
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const connectSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const sse = new EventSource(`http://${window.location.hostname}:3001/api/stream`);
    
    sse.onopen = () => {
      setIsConnected(true);
      setErrorMsg("");
    };

    sse.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "NEW_IMAGE") {
        // 現在アクティブな患者IDの画像のみ追加する
        setActivePatientId(currentId => {
          if (currentId && data.patientId === currentId) {
            setImages(prev => [data.fileName, ...prev]);
          }
          return currentId;
        });
      }
    };

    sse.onerror = () => {
      setIsConnected(false);
      // 自動再接続を妨げないため、ここでは close() しない
      // sse.close(); 
    };

    eventSourceRef.current = sse;
  };

  const handleConnect = async () => {
    if (!patientId.trim()) {
      setErrorMsg("患者番号を入力してください。");
      return;
    }
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patientId.trim() })
      });
      
      if (res.ok) {
        setActivePatientId(patientId.trim());
        setImages([]); // リセット
        fetchImages(patientId.trim());
        connectSSE();
      }
    } catch (err) {
      setErrorMsg("PCサーバーとの通信に失敗しました。");
    }
  };

  const fileToBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleGenerateSlide = async () => {
    if (images.length === 0 || !activePatientId) return;
    setIsGenerating(true);
    setErrorMsg("");

    try {
      const payloads = await Promise.all(
        images.map(async (filename) => {
          const url = `http://${window.location.hostname}:3001/images/${activePatientId}/${filename}`;
          const base64 = await fileToBase64(url);
          return { filename, base64 };
        })
      );

      const res = await fetch("/api/camera/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: payloads })
      });

      if (!res.ok) {
        throw new Error("AI判定に失敗しました。OpenAI APIキーが設定されているか確認してください。");
      }

      const data = await res.json();
      const results = data.results || [];

      const viewMap: Record<string, string[]> = {
        front: [], right: [], left: [], upper: [], lower: [], facial: [], other: []
      };

      results.forEach((r: any) => {
        if (viewMap[r.view]) {
          viewMap[r.view].push(r.filename);
        } else {
          viewMap.other.push(r.filename);
        }
      });

      const conflicts: Record<string, string[]> = {};
      Object.keys(viewMap).forEach(v => {
        if (viewMap[v].length > 1 && v !== 'other') { // otherの重複は無視
          conflicts[v] = viewMap[v];
        }
      });

      setAnalysisResults(viewMap);

      if (Object.keys(conflicts).length > 0) {
        setDuplicateConflicts(conflicts);
      } else {
        setShowSlidePreview(true);
      }

    } catch (err: any) {
      setErrorMsg(err.message || "エラーが発生しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const resolveConflict = (view: string, selectedFilename: string) => {
    setAnalysisResults(prev => {
      if (!prev) return prev;
      const newResults = { ...prev };
      
      // 選ばれなかった画像は other に移動
      const unselected = newResults[view].filter(f => f !== selectedFilename);
      newResults.other = [...newResults.other, ...unselected];
      
      // 選択された画像のみを残す
      newResults[view] = [selectedFilename];
      return newResults;
    });

    setDuplicateConflicts(prev => {
      if (!prev) return prev;
      const newConflicts = { ...prev };
      delete newConflicts[view];
      
      if (Object.keys(newConflicts).length === 0) {
        setShowSlidePreview(true);
        return null;
      }
      return newConflicts;
    });
  };

  const downloadSlide = async () => {
    if (!slideRef.current) return;
    try {
      setIsGenerating(true);
      const dataUrl = await htmlToImage.toJpeg(slideRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${activePatientId}_oral_slide.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setErrorMsg("画像の保存に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const viewLabels: Record<string, string> = {
    front: "正面", right: "右側", left: "左側", upper: "上顎", lower: "下顎", facial: "顔貌"
  };

  return (
    <div className="flex flex-col bg-neutral-900/50 border border-neutral-800 rounded-3xl min-h-[600px] overflow-hidden relative shadow-2xl">
      {/* Header */}
      <header className="bg-neutral-900/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/20 rounded-xl">
            <Camera className="w-6 h-6 text-teal-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            Wireless Connect
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          {isConnected ? (
            <span className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              待機中
            </span>
          ) : (
            <span className="flex items-center gap-2 text-neutral-400 bg-neutral-800 px-3 py-1.5 rounded-full">
              <RefreshCw className="w-4 h-4 animate-spin" />
              未接続
            </span>
          )}
        </div>
      </header>

      <main className="p-6 pb-32 space-y-8 flex-1 overflow-y-auto">
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Active Patient Indicator Banner */}
        {activePatient && (
          <div className="bg-gradient-to-br from-teal-500/10 via-teal-600/10 to-teal-500/10 border border-teal-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400">
                  <Camera className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded border border-teal-500/20">
                      No. {activePatient.split('_')[0]}
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">ワイヤレス連動中</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white mt-1.5">
                    {activePatient.split('_')[1] || activePatient} 様 📸 撮影アクティブ
                  </h3>
                </div>
              </div>
              <div className="text-xs text-neutral-400 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5 max-w-sm font-sans">
                <p className="font-bold text-white mb-1">📸 ワイヤレスカメラ自動格納モード</p>
                カメラで撮影した写真は、PCのフォルダ <code className="text-teal-400 font-mono">Patients/{activePatient}</code> へリアルタイムで完全自動保存されます。
              </div>
            </div>
          </div>
        )}

        {/* Patient Selection Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-opacity group-hover:opacity-100 opacity-50"></div>
          
          <div className="relative z-10">
            <h2 className="text-lg font-semibold text-neutral-200 mb-2 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold">1</span>
              患者番号を指定して同期を開始
            </h2>
            <p className="text-xs text-neutral-400 mb-6 flex items-center gap-1.5 bg-black/40 p-2.5 rounded-lg border border-white/5 inline-flex">
              <span className="text-teal-500 font-bold">📌 保存先:</span> PCのデスクトップ / OralNote_Data / Patients / [患者番号]
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="例: 12345"
                  className="w-full bg-neutral-950 border border-neutral-700/50 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder:text-neutral-600 text-white font-bold uppercase tracking-wider"
                />
              </div>
              <button 
                onClick={handleConnect}
                className="bg-white hover:bg-neutral-200 text-black font-bold py-4 px-8 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                連携フォルダを作成
              </button>
            </div>
            {activePatientId && (
              <p className="mt-4 text-sm text-teal-400/80 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                PC上に「{activePatientId}」の連携フォルダが作成され、受信待機中です。カメラで撮影を行ってください。
              </p>
            )}
          </div>
        </div>

        {/* Images Grid or Slide Preview */}
        {activePatientId && !showSlidePreview && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold">2</span>
              受信した写真（{images.length}枚）
            </h2>
            
            {images.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-700/50 rounded-3xl flex flex-col items-center justify-center text-slate-500 space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-full">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <p className="font-medium">EOS/Nikon Utilityから写真が転送されるのを待機しています...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {images.map((img, i) => (
                  <div key={i} className="group aspect-[4/3] bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden relative shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`http://${window.location.hostname}:3001/images/${activePatientId}/${img}`} 
                      alt="Oral photo"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <p className="text-xs text-white/80 truncate w-full font-medium">{img}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Slide Preview (Phase 3) */}
        {showSlidePreview && analysisResults && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-teal-400 flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6" />
                自動生成スライド
              </h2>
              <button 
                onClick={downloadSlide}
                disabled={isGenerating}
                className="bg-teal-500 hover:bg-teal-400 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-teal-500/20"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                画像として保存 (JPEG)
              </button>
            </div>

            <div className="overflow-x-auto bg-neutral-950 p-8 rounded-3xl border border-neutral-800 flex justify-center">
              {/* Slide Canvas */}
              <div 
                ref={slideRef}
                className="bg-black p-4 w-[1280px] aspect-[16/9] flex flex-col gap-4 relative"
              >
                <div className="flex justify-between items-end px-4 pt-2">
                  <h1 className="text-3xl font-bold text-white tracking-widest">ORAL PHOTOGRAPH</h1>
                  <p className="text-xl text-neutral-400 font-mono">ID: {activePatientId}</p>
                </div>

                <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-4">
                  {/* Top Row: Right, Front, Left */}
                  <div className="bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {analysisResults.right?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`http://${window.location.hostname}:3001/images/${activePatientId}/${analysisResults.right[0]}`} className="w-full h-full object-cover" alt="Right" />
                    ) : <span className="text-neutral-700 font-bold">右側観</span>}
                  </div>
                  <div className="bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {analysisResults.front?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`http://${window.location.hostname}:3001/images/${activePatientId}/${analysisResults.front[0]}`} className="w-full h-full object-cover" alt="Front" />
                    ) : <span className="text-neutral-700 font-bold">正面観</span>}
                  </div>
                  <div className="bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {analysisResults.left?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`http://${window.location.hostname}:3001/images/${activePatientId}/${analysisResults.left[0]}`} className="w-full h-full object-cover" alt="Left" />
                    ) : <span className="text-neutral-700 font-bold">左側観</span>}
                  </div>

                  {/* Bottom Row: Upper, Facial/Other, Lower */}
                  <div className="bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {analysisResults.upper?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`http://${window.location.hostname}:3001/images/${activePatientId}/${analysisResults.upper[0]}`} className="w-full h-full object-cover" alt="Upper" />
                    ) : <span className="text-neutral-700 font-bold">上顎観</span>}
                  </div>
                  <div className="bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {analysisResults.facial?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`http://${window.location.hostname}:3001/images/${activePatientId}/${analysisResults.facial[0]}`} className="w-full h-full object-cover" alt="Facial" />
                    ) : <span className="text-neutral-700 font-bold text-sm text-center px-4">顔貌（未撮影時は空白）</span>}
                  </div>
                  <div className="bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {analysisResults.lower?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`http://${window.location.hostname}:3001/images/${activePatientId}/${analysisResults.lower[0]}`} className="w-full h-full object-cover" alt="Lower" />
                    ) : <span className="text-neutral-700 font-bold">下顎観</span>}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-4">
              <button onClick={() => setShowSlidePreview(false)} className="text-neutral-400 hover:text-white underline underline-offset-4 transition-colors">
                画像の再判定・再選択に戻る
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Bar */}
      {images.length > 0 && !showSlidePreview && (
        <div className="absolute bottom-0 left-0 right-0 p-6 z-40 animate-in slide-in-from-bottom-10 fade-in duration-500 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className="bg-slate-800/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 shadow-2xl flex items-center justify-between">
              <div className="px-6 py-2 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {images.slice(0, 3).map((img, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-800 overflow-hidden relative z-10 shadow-sm bg-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`http://${window.location.hostname}:3001/images/${activePatientId}/${img}`} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                  {images.length > 3 && (
                    <div className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center relative z-0 text-xs font-bold text-white/80">
                      +{images.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">計 {images.length} 枚を撮影</span>
                  <span className="text-xs text-slate-400">撮影が完了したらAI判定へ</span>
                </div>
              </div>
              <button 
                onClick={handleGenerateSlide}
                disabled={isGenerating}
                className="bg-teal-500 hover:bg-teal-400 text-white font-bold px-6 py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <LayoutTemplate className="w-5 h-5" />
                )}
                <span>AIで自動スライド生成</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Conflict Resolution Modal */}
      {duplicateConflicts && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative flex flex-col max-h-full">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              画像の選択
            </h2>
            <p className="text-neutral-400 mb-6">
              AIが同じ部位（似たアングル）の写真を複数検出しました。スライドに採用するベストな1枚を選んでください。
            </p>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              {Object.entries(duplicateConflicts).map(([view, filenames]) => (
                <div key={view} className="bg-neutral-950/50 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-teal-400 mb-4 border-b border-neutral-800 pb-2">
                    {viewLabels[view] || view} の写真 ({filenames.length}枚)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {filenames.map(filename => (
                      <div 
                        key={filename} 
                        onClick={() => resolveConflict(view, filename)}
                        className="group cursor-pointer aspect-square bg-neutral-900 rounded-xl border-2 border-neutral-700 hover:border-teal-500 overflow-hidden relative transition-all"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={`http://${window.location.hostname}:3001/images/${activePatientId}/${filename}`}
                          alt={filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button className="bg-teal-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> 採用
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
