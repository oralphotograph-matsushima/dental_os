"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Save, Loader2, FileText, CheckCircle2, FolderOpen, AlertTriangle, Lock, Search, User, Clock, ChevronLeft, Clipboard, Camera } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { get, set } from "idb-keyval";

function generateDeviceId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function Home() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAgreedDisclaimer, setHasAgreedDisclaimer] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const deviceIdRef = useRef<string>("");

  // App Tabs
  const [activeTab, setActiveTab] = useState<"input" | "search" | "qr">("qr");

  // Input Tab State
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing" | "formatting" | "saving" | "saved" | "error">("idle");
  const [transcribedText, setTranscribedText] = useState("");
  const [soapText, setSoapText] = useState("");
  const [patientInfo, setPatientInfo] = useState("");
  const [savedPath, setSavedPath] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Search Tab State
  const [patientsList, setPatientsList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientHistory, setPatientHistory] = useState<{date: string, soap: string, filename?: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // QR Tab State
  const [qrPatientId, setQrPatientId] = useState("");

  // Append State
  const [appendingChart, setAppendingChart] = useState<string | null>(null);
  const [appendContent, setAppendContent] = useState("");
  const [staffName, setStaffName] = useState("");

  // Folder settings
  const [hasDirectory, setHasDirectory] = useState(false);
  const [directoryName, setDirectoryName] = useState("");
  const [isFSApiSupported, setIsFSApiSupported] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let storedDeviceId = localStorage.getItem("dental_os_device_id");
    if (!storedDeviceId) {
      storedDeviceId = generateDeviceId();
      localStorage.setItem("dental_os_device_id", storedDeviceId);
    }
    deviceIdRef.current = storedDeviceId;

    const storedEmail = localStorage.getItem("dental_os_email");
    if (storedEmail) {
      setAuthEmail(storedEmail);
      verifySession(storedEmail, storedDeviceId).then(valid => {
        if (valid) setIsAuthenticated(true);
      });
    }

    if (localStorage.getItem("dental_os_disclaimer_agreed") === "true") {
      setHasAgreedDisclaimer(true);
    }

    const storedStaff = localStorage.getItem("dental_os_staff_name");
    if (storedStaff) setStaffName(storedStaff);

    if (!('showDirectoryPicker' in window)) {
      setIsFSApiSupported(false);
    } else {
      get("obsidianDirHandle").then((handle: any) => {
        if (handle) {
          setHasDirectory(true);
          setDirectoryName(handle.name);
        }
      });
    }

    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      setIsIOS(true);
    }
  }, []);

  useEffect(() => {
    if ((activeTab === "search" || activeTab === "qr") && isFSApiSupported && hasDirectory && patientsList.length === 0) {
      loadPatients();
    }
  }, [activeTab, hasDirectory, patientsList.length]);

  // --- Authentication Logic ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword, deviceId: deviceIdRef.current }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "ログインに失敗しました");

      localStorage.setItem("dental_os_email", authEmail);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const verifySession = async (email: string, deviceId: string) => {
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, deviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "セッションが無効です");
      return true;
    } catch (err: any) {
      handleLogout(err.message);
      return false;
    }
  };

  const handleLogout = (reason?: string) => {
    setIsAuthenticated(false);
    setAuthPassword("");
    if (reason) alert(`ログアウトしました: ${reason}`);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => verifySession(authEmail, deviceIdRef.current), 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, authEmail]);

  // --- Directory Management ---
  const pickDirectory = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
         alert("お使いのブラウザは直接フォルダ選択に対応していません。");
         return;
      }
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      await set("obsidianDirHandle", dirHandle);
      setHasDirectory(true);
      setDirectoryName(dirHandle.name);
      setErrorMessage("");
      if (activeTab === "search") loadPatients();
    } catch (err: any) {
      console.error(err);
      if (err.name !== 'AbortError') setErrorMessage("フォルダの選択に失敗しました。");
    }
  };

  // --- Search Tab Logic ---
  const loadPatients = async () => {
    try {
      const dirHandle: any = await get("obsidianDirHandle");
      if (!dirHandle) return;
      
      if ((await dirHandle.queryPermission({ mode: "read" })) !== "granted") {
        if ((await dirHandle.requestPermission({ mode: "read" })) !== "granted") return;
      }

      const patients = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file" && entry.name.endsWith(".md") && !entry.name.startsWith("カルテ_")) {
          patients.push(entry.name.replace(".md", ""));
        }
      }
      setPatientsList(patients);
    } catch (err) {
      console.error("Failed to load patients", err);
    }
  };

  const selectPatient = async (patientName: string) => {
    setSelectedPatient(patientName);
    setIsSearching(true);
    setPatientHistory([]);
    try {
      const dirHandle: any = await get("obsidianDirHandle");
      const patientFileHandle = await dirHandle.getFileHandle(`${patientName}.md`);
      const patientFile = await patientFileHandle.getFile();
      const content = await patientFile.text();
      
      const linkRegex = /\[\[(カルテ_[^\]]+)\]\]/g;
      const links = [];
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        links.push(match[1]); 
      }
      
      const history = [];
      
      // Try to get the 'カルテ' subdirectory. If it doesn't exist, charts won't be found.
      let chartDirHandle;
      try {
        chartDirHandle = await dirHandle.getDirectoryHandle('カルテ');
      } catch (e) {
        // Fallback to root directory if 'カルテ' folder doesn't exist yet (for backwards compatibility with old charts)
        chartDirHandle = dirHandle;
      }

      for (const link of links.reverse()) { // Newest first based on insertion order
        try {
          const chartHandle = await chartDirHandle.getFileHandle(`${link}.md`);
          const chartFile = await chartHandle.getFile();
          const chartContent = await chartFile.text();
          
          const parts = link.split('_');
          const dateStr = parts[parts.length - 1];
          const formattedDate = dateStr.match(/.{1,2}/g)?.join('/') || dateStr;

          history.push({ date: formattedDate, soap: chartContent, filename: `${link}.md` });
        } catch(e) {
          console.warn("Could not load linked chart", link);
        }
      }
      setPatientHistory(history);
    } catch(err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAppendSave = async (filename: string) => {
    if (!appendContent.trim() || !staffName.trim()) {
      alert("追記内容と担当スタッフ名を入力してください。");
      return;
    }
    try {
      const dirHandle: any = await get("obsidianDirHandle");
      let chartDirHandle = dirHandle;
      try { chartDirHandle = await dirHandle.getDirectoryHandle('カルテ'); } catch (e) {}
      
      const fileHandle = await chartDirHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const currentContent = await file.text();
      
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const newContent = `${currentContent}\n\n### 追記 (${dateStr}) - 担当: ${staffName}\n${appendContent}`;
      
      const writable = await fileHandle.createWritable();
      await writable.write(newContent);
      await writable.close();
      
      localStorage.setItem("dental_os_staff_name", staffName);
      
      setAppendingChart(null);
      setAppendContent("");
      if (selectedPatient) selectPatient(selectedPatient); 
    } catch (err) {
      console.error(err);
      alert("追記の保存に失敗しました。");
    }
  };

  // --- Input Tab Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = processAudio;
      mediaRecorder.start();
      setIsRecording(true);
      setStatus("recording");
      setTranscribedText("");
      setSoapText("");
      setErrorMessage("");
      setSavedPath("");

      recordingTimeoutRef.current = setTimeout(() => {
        alert("安全のため録音を終了しました。AI処理を開始します");
        stopRecording();
      }, 119000);

    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setStatus("error");
      setErrorMessage("マイクへのアクセスに失敗しました。権限を確認してください。");
    }
  };

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
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
      const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: formData });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok) throw new Error(transcribeData.error || "Transcription failed");
      const text = transcribeData.text;
      setTranscribedText(text);

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

  const displaySoapText = staffName.trim() && soapText ? `${soapText}\n\n---\n担当: ${staffName}` : soapText;

  const saveToObsidian = async () => {
    if (!soapText) return;
    setStatus("saving");
    
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0].replace(/-/g, "").substring(2); 
      const filename = `カルテ_${patientInfo}_${dateStr}.md`;

      if (isIOS) {
        const filePath = encodeURIComponent(`カルテ/${filename}`);
        const content = encodeURIComponent(displaySoapText);
        const uri = `obsidian://new?file=${filePath}&content=${content}`;
        window.location.href = uri;
        
        localStorage.setItem("dental_os_staff_name", staffName);
        setStatus("saved");
        setSavedPath(`Obsidianアプリへ転送完了`);
      } else if (isFSApiSupported) {
        let dirHandle: any = await get("obsidianDirHandle");
        if (!dirHandle) {
          dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
          await set("obsidianDirHandle", dirHandle);
          setHasDirectory(true);
          setDirectoryName(dirHandle.name);
        } else {
          if ((await dirHandle.queryPermission({ mode: "readwrite" })) !== "granted") {
            if ((await dirHandle.requestPermission({ mode: "readwrite" })) !== "granted") {
               throw new Error("フォルダへのアクセス権限がありません。");
            }
          }
        }
        
        // 1. カルテサブフォルダの取得（無ければ作成）
        const chartDirHandle = await dirHandle.getDirectoryHandle('カルテ', { create: true });
        const fileHandle = await chartDirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(displaySoapText);
        await writable.close();
        
        localStorage.setItem("dental_os_staff_name", staffName);
        
        // 2. 患者ページの更新
        const patientFilename = `${patientInfo}.md`;
        const patientFileHandle = await dirHandle.getFileHandle(patientFilename, { create: true });
        const patientFile = await patientFileHandle.getFile();
        const patientContent = await patientFile.text();
        
        const newPatientContent = patientContent 
          ? patientContent + `\n- [[${filename.replace('.md', '')}]]`
          : `# ${patientInfo}\n\n## 診療記録\n- [[${filename.replace('.md', '')}]]`;

        const patientWritable = await patientFileHandle.createWritable();
        await patientWritable.write(newPatientContent);
        await patientWritable.close();

        setStatus("saved");
        setSavedPath(`${dirHandle.name} / カルテ / ${filename} および ${patientFilename}`);
      } else {
        const fallbackText = `患者ページ: [[${patientInfo}]]\n\n${displaySoapText}`;
        const blob = new Blob([fallbackText], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        
        localStorage.setItem("dental_os_staff_name", staffName);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setStatus("saved");
        setSavedPath(`ダウンロードフォルダ（手動で保存してください）`);
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

  // --- Renders ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 font-sans selection:bg-teal-500/30">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-teal-900/20 mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Dental OS</h1>
            <p className="text-sm text-neutral-400">ログインして利用を開始</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">メールアドレス</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="doctor@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">クリニック用パスワード</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
            {authError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{authError}</div>}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-white text-black font-bold rounded-xl py-4 mt-4 hover:bg-neutral-200 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "ロックを解除"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !hasAgreedDisclaimer) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 font-sans selection:bg-teal-500/30">
        <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-amber-500/20 p-4 rounded-2xl mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">免責事項・注意事項</h2>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 text-sm text-neutral-300 leading-relaxed space-y-4 mb-8">
            <p>本アプリはカルテ入力の効率化を目的としたドキュメント作成補助ツールであり、歯科医師法に基づく公式な診療録（電子カルテ）そのものではありません。</p>
            <p>AIの出力結果を最終的にカルテに反映する際は、必ず歯科医師自身の責任において内容を確認・修正してください。</p>
            <p>また、患者情報の管理はユーザーのローカル環境において適切なセキュリティのもとで行ってください。</p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("dental_os_disclaimer_agreed", "true");
              setHasAgreedDisclaimer(true);
            }}
            className="w-full bg-teal-600 text-white font-bold rounded-xl py-4 hover:bg-teal-500 transition-colors flex items-center justify-center"
          >
            同意して利用を開始する
          </button>
        </div>
      </div>
    );
  }

  const filteredPatients = patientsList.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-teal-500/30 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 mr-4">
            <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-teal-900/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-400">
              Dental OS
            </h1>
          </div>
          <div className="flex bg-neutral-900/50 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "qr" ? "bg-neutral-800 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Camera className="w-4 h-4" />
              撮影QR
            </button>
            <button
              onClick={() => setActiveTab("input")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "input" ? "bg-neutral-800 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Mic className="w-4 h-4" />
              AIカルテ入力
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "search" ? "bg-neutral-800 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Search className="w-4 h-4" />
              カルテ検索
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-sm text-neutral-400">
            {isFSApiSupported ? (
              hasDirectory ? (
                <div className="flex items-center gap-2 cursor-pointer hover:text-neutral-200" onClick={pickDirectory}>
                  <FolderOpen className="w-4 h-4 text-teal-500" />
                  <span className="truncate max-w-[150px]">{directoryName}</span>
                </div>
              ) : (
                <button onClick={pickDirectory} className="text-amber-500 hover:underline flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> 保存先未設定
                </button>
              )
            ) : (
              <span className="flex items-center gap-1 text-amber-500" title="iPad/Safariでは直接保存・検索機能は利用できません">
                <AlertTriangle className="w-4 h-4" /> PC専用機能制限あり
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 border-l border-neutral-800 pl-6">
            <User className="w-4 h-4 text-neutral-500" />
            <div className="text-xs text-neutral-400 truncate max-w-[120px]">{authEmail}</div>
            <button onClick={() => handleLogout()} className="text-xs text-red-400 hover:text-red-300 ml-2">
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {errorMessage && (
            <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          {/* === QR TAB === */}
          {activeTab === "qr" && (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl min-h-[600px] flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-md space-y-8 flex flex-col items-center text-center">
                
                <div className="w-full space-y-2">
                  <label className="text-sm font-bold text-neutral-400">患者ID（カルテ番号）を入力・選択</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={qrPatientId}
                      onChange={(e) => setQrPatientId(e.target.value.toUpperCase())}
                      placeholder="例: S1000"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-xl px-6 py-4 text-3xl font-bold text-center text-white focus:border-teal-500 outline-none uppercase tracking-wider"
                    />
                    {isFSApiSupported && patientsList.length > 0 && (
                      <select 
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-neutral-800 text-white border-none rounded-lg p-2 text-sm outline-none cursor-pointer max-w-[120px]"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const idMatch = val.split('_')[0];
                            setQrPatientId(idMatch || val);
                            setPatientInfo(val);
                          }
                        }}
                        value=""
                      >
                        <option value="" disabled>リストから選択</option>
                        {patientsList.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-2xl transition-all hover:scale-105 duration-300">
                  {qrPatientId ? (
                    <QRCodeSVG 
                      value={qrPatientId} 
                      size={256} 
                      level={"H"}
                      includeMargin={false}
                    />
                  ) : (
                    <div className="w-[256px] h-[256px] flex flex-col items-center justify-center border-4 border-dashed border-neutral-200 rounded-xl text-neutral-400">
                      <Camera className="w-16 h-16 mb-4 opacity-50" />
                      <p className="font-bold">IDを入力</p>
                    </div>
                  )}
                </div>

                {qrPatientId && (
                  <div className="text-5xl font-black text-teal-400 tracking-widest mt-4">
                    {qrPatientId}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (!patientInfo || !patientInfo.startsWith(qrPatientId)) {
                      setPatientInfo(qrPatientId);
                    }
                    setActiveTab("input");
                  }}
                  disabled={!qrPatientId}
                  className="w-full mt-12 py-5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white text-xl font-bold rounded-2xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-3"
                >
                  <Mic className="w-6 h-6" />
                  この患者のカルテ入力へ
                </button>
              </div>
            </div>
          )}

          {/* === INPUT TAB === */}
          {activeTab === "input" && (
            <div className="grid md:grid-cols-12 gap-8">
              <div className="md:col-span-4 flex flex-col items-center justify-center p-8 bg-neutral-900/50 border border-neutral-800 rounded-3xl backdrop-blur-sm relative h-[600px]">
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-950/50 border border-neutral-800 text-xs font-medium">
                  {status === "idle" && <span className="text-neutral-400">準備完了</span>}
                  {status === "recording" && (
                    <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-red-400">録音中</span></>
                  )}
                  {status === "transcribing" && (
                    <><Loader2 className="w-3 h-3 text-blue-400 animate-spin" /><span className="text-blue-400">文字起こし</span></>
                  )}
                  {status === "formatting" && (
                    <><Loader2 className="w-3 h-3 text-purple-400 animate-spin" /><span className="text-purple-400">整形中</span></>
                  )}
                  {status === "saving" && (
                    <><Loader2 className="w-3 h-3 text-teal-400 animate-spin" /><span className="text-teal-400">保存中</span></>
                  )}
                  {status === "saved" && (
                    <><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">保存完了</span></>
                  )}
                  {status === "error" && <span className="text-red-500">エラー</span>}
                </div>

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={status === "transcribing" || status === "formatting" || status === "saving"}
                  className={`relative group flex items-center justify-center w-20 h-20 md:w-32 md:h-32 rounded-full transition-all duration-300 mt-4 ${
                    isRecording 
                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                      : 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 hover:scale-105'
                  } disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100`}
                >
                  {isRecording && <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" />}
                  {isRecording ? <Square className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" /> : <Mic className="w-10 h-10 md:w-12 md:h-12" />}
                </button>
                <p className="mt-4 md:mt-6 text-xs md:text-sm text-neutral-400 font-medium">
                  {isRecording ? "タップして停止" : "タップして喋る (最大 1m 59s)"}
                </p>
              </div>

              <div className="md:col-span-8 space-y-6 h-[600px] flex flex-col">
                <div className="space-y-2 flex-shrink-0">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">生の文字起こし</label>
                  <div className="w-full h-24 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-sm text-neutral-300 overflow-y-auto leading-relaxed">
                    {transcribedText ? transcribedText : <span className="text-neutral-600 italic">ここに文字起こし結果が表示されます...</span>}
                  </div>
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-purple-400/80 uppercase tracking-wider flex items-center justify-between">
                    <span>AI カルテ生成 (SOAP)</span>
                  </label>
                  <textarea
                    value={soapText}
                    onChange={(e) => setSoapText(e.target.value)}
                    placeholder="ここにSOAP形式に整形されたカルテが表示されます。修正も可能です。"
                    className="flex-1 w-full p-4 bg-neutral-900 border border-neutral-700/50 focus:border-purple-500/50 rounded-2xl text-sm text-neutral-200 outline-none resize-none leading-relaxed transition-colors font-mono"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 flex-shrink-0 gap-4">
                  <div className="text-xs text-neutral-500 truncate w-full sm:max-w-xs order-2 sm:order-1 text-center sm:text-left">
                    {status === "saved" && `保存先: ${savedPath}`}
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <User className="w-4 h-4 text-teal-500 hidden sm:block" />
                      <input 
                        type="text" 
                        value={staffName}
                        onChange={e => setStaffName(e.target.value)}
                        placeholder="担当スタッフ名 (任意)"
                        className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-3 sm:py-2 text-sm text-white focus:border-teal-500 outline-none w-full sm:w-40"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(displaySoapText);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        disabled={!soapText || status === "saving" || status === "formatting" || status === "transcribing" || isRecording}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-3 sm:py-4 bg-neutral-800 text-white font-bold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Clipboard className="w-5 h-5" />}
                        <span className="text-sm sm:text-base">{copied ? "コピー済" : "コピー"}</span>
                      </button>
                      <button
                        onClick={saveToObsidian}
                        disabled={!soapText || status === "saving" || status === "formatting" || status === "transcribing" || isRecording}
                        className="flex-[2] sm:flex-none flex justify-center items-center gap-2 px-6 py-3 sm:py-4 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <Save className="w-5 h-5" />
                        <span className="text-sm sm:text-base">{isIOS ? "Obsidianへ転送" : isFSApiSupported ? "データを保存" : "ダウンロード"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === SEARCH TAB === */}
          {activeTab === "search" && (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl min-h-[600px] overflow-hidden flex">
              {!isFSApiSupported ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <AlertTriangle className="w-16 h-16 text-amber-500/50 mb-6" />
                  <h2 className="text-2xl font-bold text-neutral-200 mb-4">iPad等のモバイルブラウザでは利用できません</h2>
                  <p className="text-neutral-400 max-w-lg leading-relaxed">
                    セキュリティ制限のため、ブラウザから直接パソコンのフォルダを検索・閲覧する機能はPC版のChromeやEdge専用となっております。
                    <br/><br/>過去のカルテを閲覧する場合は、お使いの端末の「Obsidian」などのファイル管理アプリをご利用ください。
                  </p>
                </div>
              ) : !hasDirectory ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <FolderOpen className="w-16 h-16 text-teal-500/50 mb-6" />
                  <h2 className="text-2xl font-bold text-neutral-200 mb-4">保存先フォルダが設定されていません</h2>
                  <p className="text-neutral-400 mb-8">過去のカルテを検索・閲覧するには、データが保存されているフォルダを選択してください。</p>
                  <button onClick={pickDirectory} className="px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors">
                    フォルダを選択する
                  </button>
                </div>
              ) : (
                <>
                  {/* Left Sidebar: Patient List */}
                  <div className="w-80 border-r border-neutral-800 bg-neutral-950/50 flex flex-col">
                    <div className="p-4 border-b border-neutral-800">
                      <div className="relative">
                        <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="患者名やIDで検索..."
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {filteredPatients.length === 0 ? (
                        <div className="text-center text-sm text-neutral-500 mt-10">患者が見つかりません</div>
                      ) : (
                        filteredPatients.map(p => (
                          <button
                            key={p}
                            onClick={() => selectPatient(p)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors mb-1 ${
                              selectedPatient === p ? "bg-teal-500/20 text-teal-300" : "text-neutral-300 hover:bg-neutral-800"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <User className="w-4 h-4 opacity-70" />
                              <span className="truncate">{p}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Content: Patient History */}
                  <div className="flex-1 bg-neutral-900/30 flex flex-col">
                    {!selectedPatient ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                        <User className="w-16 h-16 opacity-20 mb-4" />
                        <p>左のリストから患者を選択してください</p>
                      </div>
                    ) : isSearching ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                        <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-4" />
                        <p>カルテ履歴を読み込み中...</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto">
                        <div className="sticky top-0 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-8 py-6 z-10">
                          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <User className="w-6 h-6 text-teal-500" />
                            {selectedPatient}
                          </h2>
                          <p className="text-sm text-neutral-400 mt-1">{patientHistory.length} 件の診療記録</p>
                        </div>
                        
                        <div className="p-8 max-w-4xl mx-auto space-y-8">
                          {patientHistory.length === 0 ? (
                            <div className="text-center text-neutral-500 py-10 bg-neutral-900 rounded-2xl border border-neutral-800 border-dashed">
                              診療記録が見つかりません
                            </div>
                          ) : (
                            <div className="relative border-l-2 border-neutral-800 ml-4 space-y-12 pb-12">
                              {patientHistory.map((record, idx) => (
                                <div key={idx} className="relative pl-8">
                                  {/* Timeline Dot */}
                                  <div className="absolute w-4 h-4 bg-teal-500 rounded-full -left-[9px] top-1 ring-4 ring-neutral-950" />
                                  
                                  <div className="flex items-center gap-2 mb-4">
                                    <Clock className="w-4 h-4 text-teal-500" />
                                    <h3 className="text-lg font-bold text-teal-400">{record.date}</h3>
                                  </div>
                                  
                                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl relative group">
                                    <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-300 leading-relaxed font-medium">
                                      {record.soap}
                                    </pre>
                                    
                                    {appendingChart === record.filename ? (
                                      <div className="mt-6 pt-6 border-t border-neutral-800">
                                        <div className="mb-3 flex items-center gap-2">
                                          <User className="w-4 h-4 text-teal-500" />
                                          <input 
                                            type="text" 
                                            value={staffName}
                                            onChange={e => setStaffName(e.target.value)}
                                            placeholder="担当スタッフ名"
                                            className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-teal-500 outline-none w-48"
                                          />
                                        </div>
                                        <textarea
                                          value={appendContent}
                                          onChange={e => setAppendContent(e.target.value)}
                                          placeholder="※追記内容を入力してください。元の記録は上書きされず、末尾に追記されます。"
                                          className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-sm text-white focus:border-teal-500 outline-none resize-none mb-3 font-mono leading-relaxed"
                                        />
                                        <div className="flex gap-2 justify-end">
                                          <button 
                                            onClick={() => setAppendingChart(null)}
                                            className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                                          >
                                            キャンセル
                                          </button>
                                          <button 
                                            onClick={() => record.filename && handleAppendSave(record.filename)}
                                            className="px-6 py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
                                          >
                                            <Save className="w-4 h-4" /> 追記を保存
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          setAppendingChart(record.filename || null);
                                          setAppendContent("");
                                        }}
                                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-neutral-700"
                                      >
                                        <FileText className="w-3 h-3" /> 追記する
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
