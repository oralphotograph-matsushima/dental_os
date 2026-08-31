"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, Image as ImageIcon, Send, X, CheckCircle, AlertCircle, LayoutTemplate, Download, Presentation } from "lucide-react";
import * as htmlToImage from 'html-to-image';
import LayoutConfirm from "@/components/LayoutConfirm";
import OralLayoutCanvas from "@/components/OralLayoutCanvas";
import { LayoutFormat, LayoutSlot, buildSlotsFromAnalysis, compositePngFilename, compositePngLatestName, isCompositePng } from "@/lib/layoutSlots";

function samePatientNumber(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.split("_")[0] === b.split("_")[0];
}

interface CameraModeProps {
  activePatient?: string;
  autoSortEnabled?: boolean;
  onSelectPatient?: (folder: string) => void;
  onOpenSlideTab?: () => void;
}

interface AssignmentTarget {
  id: string;
  name: string;
  folder: string;
  startTime?: string;
  source?: string;
}

export default function CameraModePage({ activePatient, autoSortEnabled = false, onSelectPatient, onOpenSlideTab }: CameraModeProps) {
  const [patientId, setPatientId] = useState("");
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [analysisResults, setAnalysisResults] = useState<Record<string, string[]> | null>(null);
  const [duplicateConflicts, setDuplicateConflicts] = useState<Record<string, string[]> | null>(null);
  const [showSlidePreview, setShowSlidePreview] = useState(false);

  // === Master Schedule State ===
  const [schedule, setSchedule] = useState<any[]>([]);
  const [assignmentTargets, setAssignmentTargets] = useState<AssignmentTarget[]>([]);
  const [isParsingSchedule, setIsParsingSchedule] = useState(false);
  const [batchPreview, setBatchPreview] = useState<any[] | null>(null);
  const [showBatchPreviewModal, setShowBatchPreviewModal] = useState(false);
  const [isExecutingBatch, setIsExecutingBatch] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [layoutFormat, setLayoutFormat] = useState<LayoutFormat>("9");
  const [layoutSlots, setLayoutSlots] = useState<LayoutSlot[]>([]);
  const [showLayoutConfirm, setShowLayoutConfirm] = useState(false);
  const [layoutConfirmed, setLayoutConfirmed] = useState(false);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [pngSavedName, setPngSavedName] = useState("");
  const scheduleInputRef = useRef<HTMLInputElement>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  // 患者タブで開いている人を、番号だけで既存フォルダに接続（名前のゆれは無視）
  useEffect(() => {
    if (!activePatient) {
      fetchActivePatient();
      return;
    }
    const idOnly = activePatient.includes('_') ? activePatient.split('_')[0] : activePatient;
    setPatientId(idOnly);
    fetch(`http://${window.location.hostname}:3001/api/patient`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: activePatient })
    })
      .then((res) => res.json())
      .then((data) => {
        const folder = data.activePatientId || activePatient;
        setActivePatientId(folder);
        fetchImages(folder);
        connectSSE();
      })
      .catch((err) => console.error("Failed to sync active patient to PC server:", err));
  }, [activePatient]);

  // マウント時に今日のスケジュールと本日の診療キューをPCサーバーから取得
  useEffect(() => {
    fetch(`http://${window.location.hostname}:3001/api/schedule`)
      .then(res => res.json())
      .then(data => {
        if (data.schedule) setSchedule(data.schedule);
      }).catch(err => console.error("Failed to fetch schedule:", err));

    fetch(`http://${window.location.hostname}:3001/api/assignment-targets`)
      .then(res => res.json())
      .then(data => {
        if (data.targets) setAssignmentTargets(data.targets);
      }).catch(err => console.error("Failed to fetch assignment targets:", err));
  }, []);

  useEffect(() => {
    if (assignmentTargets.length === 0) return;
    let cancelled = false;
    Promise.all(assignmentTargets.map(async (t) => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3001/api/patients/${encodeURIComponent(t.folder)}/images`);
        const data = await res.json();
        return [t.folder, Array.isArray(data.images) ? data.images.length : 0] as const;
      } catch {
        return [t.folder, 0] as const;
      }
    })).then((entries) => {
      if (!cancelled) setPhotoCounts(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [assignmentTargets]);

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
      const res = await fetch(`http://${window.location.hostname}:3001/api/patients/${encodeURIComponent(id)}/images`);
      if (res.ok) {
        const data = await res.json();
        const nextImages = data.images || [];
        setImages(nextImages);
        const folder = data.folder || id;
        setPhotoCounts((prev) => ({ ...prev, [folder]: nextImages.length }));
        if (folder && folder !== id) {
          setActivePatientId(folder);
        }
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
          if (currentId && samePatientNumber(data.patientId, currentId)) {
            setImages(prev => [data.fileName, ...prev]);
          }
          return currentId;
        });
      } else if (data.type === "REFRESH_IMAGES") {
        setActivePatientId(currentId => {
          if (currentId && (samePatientNumber(data.patientId, currentId) || data.patientId === 'all')) {
            fetchImages(currentId);
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

  const resolvePatientFolder = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    const hit = assignmentTargets.find(
      (t) => t.folder === trimmed || t.id === trimmed || t.folder.startsWith(`${trimmed}_`)
    );
    return hit?.folder || trimmed;
  };

  const activatePatient = async (folderOrId: string) => {
    const folder = resolvePatientFolder(folderOrId);
    if (!folder) {
      setErrorMsg("患者番号を入力してください。");
      return;
    }
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: folder })
      });
      if (!res.ok) throw new Error("接続に失敗しました");
      const data = await res.json();
      const resolved = data.activePatientId || folder;
      const idOnly = resolved.includes("_") ? resolved.split("_")[0] : resolved;
      setPatientId(idOnly);
      setActivePatientId(resolved);
      setImages([]);
      setShowSlidePreview(false);
      setShowLayoutConfirm(false);
      setLayoutConfirmed(false);
      setLayoutSlots([]);
      setPngSavedName("");
      setErrorMsg("");
      fetchImages(resolved);
      connectSSE();
      onSelectPatient?.(resolved);
    } catch (err) {
      setErrorMsg("PCサーバーとの通信に失敗しました。");
    }
  };

  const handleConnect = async () => {
    if (!patientId.trim()) {
      setErrorMsg("患者番号を入力してください。");
      return;
    }
    await activatePatient(patientId.trim());
  };

  // ==========================================
  // Master Schedule Functions
  // ==========================================
  const handleScheduleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingSchedule(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/schedule/parse`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error("アポ表の解析に失敗しました。");
      const data = await res.json();
      setSchedule(data.schedule);
      
      await fetch(`http://${window.location.hostname}:3001/api/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: data.schedule })
      });

      const targetsRes = await fetch(`http://${window.location.hostname}:3001/api/assignment-targets`);
      if (targetsRes.ok) {
        const targetsData = await targetsRes.json();
        if (targetsData.targets) setAssignmentTargets(targetsData.targets);
      }
      
    } catch (err: any) {
      setErrorMsg(err.message || "エラーが発生しました");
    } finally {
      setIsParsingSchedule(false);
      if (scheduleInputRef.current) scheduleInputRef.current.value = "";
    }
  };

  const handleBatchSort = async () => {
    setErrorMsg("");
    setIsLoadingPreview(true);
    
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/batch-preview`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "プレビュー取得に失敗しました");

      if (data.targets) setAssignmentTargets(data.targets);

      const preview = data.preview || [];
      setBatchPreview(preview);
      setShowBatchPreviewModal(true);

      if (preview.length > 0 && (data.targets || []).length === 0) {
        setErrorMsg("本日の診療キューかアポ表に患者がいません。先に患者を登録すると、写真の行き先を選べます。");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "プレビュー取得に失敗しました");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleBatchExecute = async () => {
    if (!batchPreview) return;
    setIsExecutingBatch(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/batch-execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: batchPreview })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`${data.moved} 枚の写真を振り分けました。`);
        setShowBatchPreviewModal(false);
        setBatchPreview(null);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "振り分け実行に失敗しました");
    } finally {
      setIsExecutingBatch(false);
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
        throw new Error("配置の判定に失敗しました。PC側の設定を確認してください。");
      }

      const data = await res.json();
      const results = data.results || [];

      const viewMap: Record<string, string[]> = {
        front: [], front_half: [], coupling: [], right: [], left: [], upper: [], lower: [], facial: [], smile: [], right_overjet: [], left_overjet: [], other: []
      };
      const metaByFile: Record<string, { mirrorSuspected?: boolean }> = {};

      results.forEach((r: any) => {
        const view = viewMap[r.view] ? r.view : "other";
        viewMap[view].push(r.filename);
        metaByFile[r.filename] = { mirrorSuspected: r.mirrorSuspected === true || r.suggestedFlip === "H" || r.suggestedFlip === "V" || r.suggestedFlip === "HV" };
      });

      const conflicts: Record<string, string[]> = {};
      Object.keys(viewMap).forEach(v => {
        if (viewMap[v].length > 1 && v !== 'other') { // otherの重複は無視
          conflicts[v] = viewMap[v];
        }
      });

      setAnalysisResults(viewMap);
      setLayoutSlots(buildSlotsFromAnalysis(layoutFormat, viewMap, metaByFile));
      setLayoutConfirmed(false);

      if (Object.keys(conflicts).length > 0) {
        setDuplicateConflicts(conflicts);
      } else {
        setShowLayoutConfirm(true);
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
      const unselected = newResults[view].filter(f => f !== selectedFilename);
      newResults.other = [...newResults.other, ...unselected];
      newResults[view] = [selectedFilename];

      setDuplicateConflicts(currentConflicts => {
        if (!currentConflicts) return currentConflicts;
        const newConflicts = { ...currentConflicts };
        delete newConflicts[view];
        if (Object.keys(newConflicts).length === 0) {
          setLayoutSlots(buildSlotsFromAnalysis(layoutFormat, newResults, {}));
          setShowLayoutConfirm(true);
          return null;
        }
        return newConflicts;
      });

      return newResults;
    });
  };

  const downloadSlide = async () => {
    if (!slideRef.current || !activePatientId) return;
    try {
      setIsGenerating(true);
      setErrorMsg("");
      const imgs = Array.from(slideRef.current.querySelectorAll("img"));
      await Promise.all(imgs.map((img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      })));
      const dataUrl = await htmlToImage.toPng(slideRef.current, {
        backgroundColor: "#0a0a0a",
        pixelRatio: 2,
      });
      const timestamped = compositePngFilename(layoutFormat, activePatientId);
      const latest = compositePngLatestName(layoutFormat);
      const res = await fetch(`http://${window.location.hostname}:3001/api/patients/${encodeURIComponent(activePatientId)}/export-png`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [
            { filename: timestamped, dataUrl },
            { filename: latest, dataUrl },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存に失敗しました");
      setPngSavedName(timestamped);
      await fetchImages(activePatientId);
    } catch (e: any) {
      setErrorMsg(e.message || "PNGの保存に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const viewLabels: Record<string, string> = {
    front: "正面", front_half: "半開口", coupling: "カップリング", right: "右側", left: "左側", upper: "上顎", lower: "下顎", facial: "顔貌", smile: "スマイル", right_overjet: "右側オーバージェット", left_overjet: "左側オーバージェット"
  };

  const saveLayout = async (slots: LayoutSlot[], confirmed: boolean) => {
    if (!activePatientId) return;
    try {
      await fetch(`http://${window.location.hostname}:3001/api/patients/${activePatientId}/layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: layoutFormat, confirmed, slots })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmLayout = async () => {
    setLayoutConfirmed(true);
    await saveLayout(layoutSlots, true);
    setShowLayoutConfirm(false);
    setShowSlidePreview(true);
  };

  const galleryImages = [...images].sort((a, b) => Number(isCompositePng(b)) - Number(isCompositePng(a)));

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
                カメラで撮影した写真は、届いた時点で PC の <code className="text-teal-400 font-mono">Patients/{activePatient}</code> に保存されます。カルテも同じフォルダです。
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* Master Schedule (Batch Sort) UI            */}
        {/* ========================================== */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mt-20 transition-opacity group-hover:opacity-100 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-200 mb-2 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">1</span>
                  写真の振り分け
                </h2>
                <p className="text-xs text-neutral-400">
                  写真は Patients 直下に溜まります。「振り分けを開始」を押すと、撮影時刻の候補と本日の患者一覧から行き先を選んで確定できます。
                  {autoSortEnabled
                    ? " 設定で自動振り分けがオンのため、時刻が確実に一致したものだけ先に患者フォルダへ入ります。"
                    : " 自動振り分けはオフです。自分のタイミングで開始してください。"}
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex gap-2">
                <input 
                  type="file" 
                  ref={scheduleInputRef}
                  onChange={handleScheduleUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button 
                  onClick={() => scheduleInputRef.current?.click()}
                  disabled={isParsingSchedule}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-2 text-sm border border-neutral-700 active:scale-95 disabled:opacity-50"
                >
                  {isParsingSchedule ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  アポ表を読み込む
                </button>
                <button 
                  onClick={handleBatchSort}
                  disabled={isLoadingPreview}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-2 text-sm active:scale-95 disabled:opacity-50"
                >
                  {isLoadingPreview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LayoutTemplate className="w-4 h-4" />}
                  振り分けを開始
                </button>
              </div>
            </div>
            
            {(assignmentTargets.length > 0 || schedule.length > 0) && (
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 overflow-x-auto scrollbar-thin">
                <div className="flex gap-2">
                  {(assignmentTargets.length > 0 ? assignmentTargets : schedule.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    folder: `${s.id}_${s.name}`,
                    startTime: s.startTime,
                    source: 'schedule'
                  }))).map((slot, idx) => {
                    const isActive = samePatientNumber(activePatientId, slot.folder) || samePatientNumber(activePatientId, slot.id);
                    const count = photoCounts[slot.folder] || 0;
                    const displayName = String(slot.name).includes('_') ? String(slot.name).split('_').slice(1).join('_') : slot.name;
                    return (
                    <button
                      type="button"
                      key={`${slot.id}-${idx}`}
                      onClick={() => activatePatient(slot.folder)}
                      className={`rounded-xl p-3 min-w-[132px] flex-shrink-0 text-left transition-all border ${
                        isActive
                          ? "bg-teal-500/15 border-teal-500/40"
                          : "bg-neutral-900 border-neutral-800 hover:border-teal-500/30"
                      }`}
                    >
                      <div className="text-xs font-mono text-purple-400 mb-1">{slot.startTime ? `${slot.startTime}〜` : "本日"}</div>
                      <div className="text-sm font-bold text-white truncate">{displayName}</div>
                      <div className="text-[10px] text-neutral-500 font-mono mt-1">ID: {slot.id}</div>
                      {count > 0 ? (
                        <div className="text-[10px] text-teal-400 font-bold mt-1">{count}枚あり・タップで確認</div>
                      ) : (
                        <div className="text-[10px] text-neutral-600 mt-1">データなし</div>
                      )}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Patient Selection Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-opacity group-hover:opacity-100 opacity-50"></div>
          
          <div className="relative z-10">
            <h2 className="text-lg font-semibold text-neutral-200 mb-2 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold">1</span>
              患者番号を指定して同期を開始
            </h2>
            <p className="text-xs text-neutral-400 mb-6 flex items-center gap-1.5 bg-black/40 p-2.5 rounded-lg border border-white/5 inline-flex">
              <span className="text-teal-500 font-bold">📌 保存先:</span> PCのデスクトップ / WirelessConnect_Data / Patients / [患者番号]
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
                この患者で受信を開始
              </button>
            </div>
            {activePatientId && (
              <p className="mt-4 text-sm text-teal-400/80 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                PC上で「{activePatientId}」を受信対象にしました。写真またはカルテが保存されたときにフォルダを作ります。
              </p>
            )}
          </div>
        </div>

        {/* Images Grid or Slide Preview */}
        {activePatientId && !showLayoutConfirm && !showSlidePreview && (
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
                {galleryImages.map((img, i) => (
                  <div key={i} className="group aspect-[4/3] bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden relative shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`http://${window.location.hostname}:3001/images/${activePatientId}/${img}`} 
                      alt="Oral photo"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {isCompositePng(img) && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold bg-teal-500 text-white px-2 py-0.5 rounded-full">
                        {img.match(/oral_(\d)view/i)?.[1] || ""}枚PNG
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <p className="text-xs text-white/80 truncate w-full font-medium">{img}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activePatientId && showLayoutConfirm && layoutSlots.length > 0 && (
          <LayoutConfirm
            slots={layoutSlots}
            imageUrl={(filename) => `http://${window.location.hostname}:3001/images/${activePatientId}/${filename}`}
            confirmed={layoutConfirmed}
            onChange={(next) => {
              setLayoutSlots(next);
              saveLayout(next, layoutConfirmed);
            }}
            onBack={() => {
              setShowLayoutConfirm(false);
              setLayoutConfirmed(false);
            }}
            onConfirm={handleConfirmLayout}
          />
        )}

        {showSlidePreview && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-teal-400 flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6" />
                {layoutFormat}枚法・黒背景PNG
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadSlide}
                  disabled={isGenerating || !activePatientId}
                  className="bg-teal-500 hover:bg-teal-400 text-white font-bold px-5 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-teal-500/20"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  患者フォルダへPNG保存
                </button>
                <button
                  type="button"
                  onClick={() => onOpenSlideTab?.()}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-5 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 border border-white/10"
                >
                  <Presentation className="w-5 h-5" />
                  スライド生成タブへ
                </button>
              </div>
            </div>

            {pngSavedName && (
              <p className="text-sm text-teal-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                保存しました: {pngSavedName}（Wireless Connect のギャラリーからも確認できます）
              </p>
            )}

            <div className="overflow-x-auto bg-neutral-950 p-4 md:p-8 rounded-3xl border border-neutral-800 flex justify-center">
              <div className="origin-top scale-[0.28] sm:scale-[0.45] md:scale-[0.62] lg:scale-75">
                <OralLayoutCanvas
                  ref={slideRef}
                  format={layoutFormat}
                  slots={layoutSlots}
                  imageUrl={(filename) => `http://${window.location.hostname}:3001/images/${activePatientId}/${filename}`}
                  patientLabel={activePatientId || ""}
                />
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
      {images.length > 0 && !showSlidePreview && !showLayoutConfirm && (
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
                  <span className="text-xs text-slate-400">撮影が終わったら配置を確認</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={layoutFormat}
                  onChange={(e) => setLayoutFormat(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-xl px-4 py-3 focus:ring-teal-500 focus:border-teal-500 font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                >
                  <option value="5">基本5枚法</option>
                  <option value="7">標準7枚法</option>
                  <option value="9">精密9枚法</option>
                </select>
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
                  <span>配置を確認する</span>
                </button>
              </div>
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

      {/* Batch Preview Modal */}
      {showBatchPreviewModal && batchPreview && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <LayoutTemplate className="w-8 h-8 text-purple-400" />
                振り分け先の確認
              </h2>
              <button 
                onClick={() => setShowBatchPreviewModal(false)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-neutral-400 mb-6 text-sm">
              時刻から候補が付いている写真は確認して確定してください。付いていない写真は、本日のアポ／診療キューから患者を選んで入れてください。
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {batchPreview.length === 0 ? (
                <div className="text-center text-neutral-500 py-10">Patients 直下に振り分け対象の写真がありません。</div>
              ) : (
                batchPreview.map((item, idx) => (
                  <div key={idx} className="bg-neutral-950/50 border border-neutral-800 rounded-2xl p-4 flex gap-4 items-center">
                    <div className="w-24 h-24 rounded-lg bg-neutral-900 overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={`http://${window.location.hostname}:3001/inbox-images/${item.fileName}`} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-neutral-500 mb-1">{item.fileName}</div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <select
                          className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-purple-500 focus:border-purple-500 min-w-[200px]"
                          value={item.targetPatient || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newPreview = [...batchPreview];
                            newPreview[idx].targetPatient = val;
                            newPreview[idx].status = (!val || val === 'ignore') ? 'unknown' : 'manual';
                            setBatchPreview(newPreview);
                          }}
                        >
                          <option value="">患者を選択</option>
                          <option value="ignore">今回は入れない</option>
                          {assignmentTargets.map(t => (
                            <option key={t.folder} value={t.folder}>
                              {t.id} {String(t.name).includes('_') ? String(t.name).split('_').slice(1).join('_') : t.name}
                              {t.startTime ? ` (${t.startTime})` : ''}
                            </option>
                          ))}
                          {schedule.filter((s: any) => !assignmentTargets.some(t => t.id === String(s.id))).map((s: any) => (
                            <option key={`${s.id}_${s.name}`} value={`${s.id}_${s.name}`}>{s.id} {s.name}</option>
                          ))}
                          {item.targetPatient && item.targetPatient !== 'ignore' && !assignmentTargets.some(t => t.folder === item.targetPatient) && !schedule.some((s: any) => `${s.id}_${s.name}` === item.targetPatient) && (
                            <option value={item.targetPatient}>{item.targetPatient}</option>
                          )}
                        </select>
                        {item.status === 'match' && item.targetPatient && (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded inline-flex items-center">時刻候補あり・確認して確定</span>
                        )}
                        {item.status === 'manual' && item.targetPatient && item.targetPatient !== 'ignore' && (
                          <span className="text-xs font-bold text-teal-400 bg-teal-400/10 px-2 py-1 rounded inline-flex items-center">手動選択</span>
                        )}
                        {(!item.targetPatient || item.targetPatient === 'ignore' || item.status === 'unknown') && item.status !== 'manual' && item.status !== 'match' && (
                          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded inline-flex items-center">行き先未定・アポから選択</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <button 
                onClick={() => setShowBatchPreviewModal(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                キャンセル
              </button>
              <button 
                onClick={handleBatchExecute}
                disabled={isExecutingBatch || batchPreview.length === 0}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isExecutingBatch ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                確定して振り分ける
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
