"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Save, Loader2, FileText, CheckCircle2, FolderOpen, AlertTriangle } from "lucide-react";
import { get, set } from "idb-keyval";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing" | "formatting" | "saving" | "saved" | "error">("idle");
  const [transcribedText, setTranscribedText] = useState("");
  const [soapText, setSoapText] = useState("");
  const [patientInfo, setPatientInfo] = useState("");
  const [savedPath, setSavedPath] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Folder settings
  const [hasDirectory, setHasDirectory] = useState(false);
  const [directoryName, setDirectoryName] = useState("");
  const [isFSApiSupported, setIsFSApiSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Check if browser supports File System Access API
    if (!('showDirectoryPicker' in window)) {
      setIsFSApiSupported(false);
    } else {
      // Check if we already have a directory handle saved
      get("obsidianDirHandle").then((handle: any) => {
        if (handle) {
          setHasDirectory(true);
          setDirectoryName(handle.name);
        }
      });
    }
  }, []);

  const pickDirectory = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
         alert("お使いのブラウザは直接フォルダ選択に対応していません。保存時はダウンロード形式になります。");
         return;
      }
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      await set("obsidianDirHandle", dirHandle);
      setHasDirectory(true);
      setDirectoryName(dirHandle.name);
      setErrorMessage("");
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'AbortError') {
        setErrorMessage("フォルダの選択に失敗しました。");
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = processAudio;

      mediaRecorder.start();
      setIsRecording(true);
      setStatus("recording");
      setTranscribedText("");
      setSoapText("");
      setErrorMessage("");
      setSavedPath("");
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setStatus("error");
      setErrorMessage("マイクへのアクセスに失敗しました。権限を確認してください。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    setStatus("transcribing");
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      // 1. Transcribe (Whisper)
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const transcribeData = await transcribeRes.json();

      if (!transcribeRes.ok) throw new Error(transcribeData.error || "Transcription failed");

      const text = transcribeData.text;
      setTranscribedText(text);

      // 2. Format to SOAP (GPT-4o)
      setStatus("formatting");
      const soapRes = await fetch("/api/soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const soapData = await soapRes.json();

      if (!soapRes.ok) throw new Error(soapData.error || "SOAP formatting failed");

      setSoapText(soapData.soap);
      setPatientInfo(soapData.patientInfo || "不明");
      setStatus("idle");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "エラーが発生しました。");
    }
  };

  const saveToObsidian = async () => {
    if (!soapText) return;
    setStatus("saving");
    
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0].replace(/-/g, "").substring(2); 
      const filename = `カルテ_${patientInfo}_${dateStr}.md`;

      if (isFSApiSupported) {
        // Desktop Chrome/Edge approach: Direct folder write
        let dirHandle: any = await get("obsidianDirHandle");
        
        if (!dirHandle) {
          // Ask for folder if not set
          dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
          await set("obsidianDirHandle", dirHandle);
          setHasDirectory(true);
          setDirectoryName(dirHandle.name);
        } else {
          // Verify permission
          if ((await dirHandle.queryPermission({ mode: "readwrite" })) !== "granted") {
            if ((await dirHandle.requestPermission({ mode: "readwrite" })) !== "granted") {
               throw new Error("フォルダへのアクセス権限がありません。");
            }
          }
        }
        
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(soapText);
        await writable.close();
        
        setStatus("saved");
        setSavedPath(`${dirHandle.name} / ${filename}`);
      } else {
        // iPad / Safari Fallback: Download file
        const blob = new Blob([soapText], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setStatus("saved");
        setSavedPath(`ダウンロードフォルダ（手動でObsidianへ移動してください）`);
      }
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'AbortError') {
        setStatus("error");
        setErrorMessage(err.message || "保存中にエラーが発生しました。");
      } else {
        setStatus("idle");
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 font-sans selection:bg-teal-500/30">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-teal-900/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-400">
                Dental OS
              </h1>
              <p className="text-sm text-neutral-500 font-medium">音声AIカルテ＆臨床資産構築</p>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 border border-neutral-800 text-sm font-medium">
            {status === "idle" && <span className="text-neutral-400">準備完了</span>}
            {status === "recording" && (
              <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-red-400">録音中...</span></>
            )}
            {status === "transcribing" && (
              <><Loader2 className="w-4 h-4 text-blue-400 animate-spin" /><span className="text-blue-400">AI文字起こし中...</span></>
            )}
            {status === "formatting" && (
              <><Loader2 className="w-4 h-4 text-purple-400 animate-spin" /><span className="text-purple-400">SOAP整形中...</span></>
            )}
            {status === "saving" && (
              <><Loader2 className="w-4 h-4 text-teal-400 animate-spin" /><span className="text-teal-400">保存中...</span></>
            )}
            {status === "saved" && (
              <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">保存完了</span></>
            )}
            {status === "error" && <span className="text-red-500">エラー</span>}
          </div>
        </header>

        {/* Directory Settings UI */}
        <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-neutral-400">
            {isFSApiSupported ? (
              hasDirectory ? (
                <><FolderOpen className="w-4 h-4 text-teal-500" /> 保存先フォルダ: <span className="text-neutral-200 font-medium">{directoryName}</span></>
              ) : (
                <><AlertTriangle className="w-4 h-4 text-amber-500" /> 保存先フォルダが未設定です。保存時に設定ダイアログが開きます。</>
              )
            ) : (
              <><AlertTriangle className="w-4 h-4 text-amber-500" /> このブラウザは直接保存非対応です（iPad/Safari等）。ファイルはダウンロードされます。</>
            )}
          </div>
          {isFSApiSupported && (
            <button 
              onClick={pickDirectory}
              className="text-xs px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors border border-neutral-700 whitespace-nowrap"
            >
              保存先を変更
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {errorMessage}
          </div>
        )}

        <main className="grid md:grid-cols-12 gap-8">
          {/* Left Column: Recording Control */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-8 bg-neutral-900/50 border border-neutral-800 rounded-3xl backdrop-blur-sm">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={status === "transcribing" || status === "formatting" || status === "saving"}
              className={`relative group flex items-center justify-center w-32 h-32 rounded-full transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                  : 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 hover:scale-105'
              } disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100`}
            >
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />
              )}
              {isRecording ? <Square className="w-10 h-10" fill="currentColor" /> : <Mic className="w-12 h-12" />}
            </button>
            <p className="mt-6 text-sm text-neutral-400 font-medium">
              {isRecording ? "タップして停止" : "タップして喋る"}
            </p>
          </div>

          {/* Right Column: Results & Editing */}
          <div className="md:col-span-8 space-y-6">
            
            {/* Raw Transcription */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                生の文字起こし (Whisper)
              </label>
              <div className="w-full h-32 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-sm text-neutral-300 overflow-y-auto leading-relaxed">
                {transcribedText ? transcribedText : <span className="text-neutral-600 italic">ここに文字起こし結果が表示されます...</span>}
              </div>
            </div>

            {/* SOAP Note */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-purple-400/80 uppercase tracking-wider flex items-center justify-between">
                <span>AI カルテ生成 (SOAP)</span>
                {status === "formatting" && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">GPT-4o 処理中</span>}
              </label>
              <textarea
                value={soapText}
                onChange={(e) => setSoapText(e.target.value)}
                placeholder="ここにSOAP形式に整形されたカルテが表示されます。修正も可能です。"
                className="w-full h-80 p-4 bg-neutral-900 border border-neutral-700/50 focus:border-purple-500/50 rounded-2xl text-sm text-neutral-200 outline-none resize-none leading-relaxed transition-colors font-mono"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-xs text-neutral-500 truncate max-w-md">
                {status === "saved" && `保存先: ${savedPath}`}
              </div>
              <button
                onClick={saveToObsidian}
                disabled={!soapText || status === "saving" || status === "formatting" || status === "transcribing" || isRecording}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <Save className="w-4 h-4" />
                <span>{isFSApiSupported ? "Obsidianへ保存" : "ファイルをダウンロード"}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
