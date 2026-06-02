"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Save, Loader2, FileText, CheckCircle2, FolderOpen, AlertTriangle, Lock, Search, User, Clock, ChevronLeft, Clipboard, Camera, Presentation, Settings, Tablet, Download, Wifi, HelpCircle, X, ExternalLink, Plus, Trash2, ChevronRight } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { get, set } from "idb-keyval";
import SlideGenerator from "@/components/SlideGenerator";
import TechnicianOrder from "@/components/TechnicianOrder";
import CameraMode from "@/components/CameraMode";
import { supabase } from "@/lib/supabase";

function generateDeviceId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

interface CustomTerm {
  id: string;
  reading: string;
  term: string;
}

interface TodayPatient {
  id: string; // ナンバー（患者ID）
  name: string; // "患者ID_名前"
  addedAt: number;
  completed?: boolean;
}

// ひらがなを全角カタカナに変換する関数
const toKatakana = (str: string): string => {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) + 0x60);
  });
};

// 苗字（スペースの前の部分）を切り出し、カタカナに変換する関数
const formatToKatakanaLastName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return "";
  // 半角・全角スペースで分割して最初の要素（苗字）を取得
  const parts = trimmed.split(/[\s　]+/);
  const lastName = parts[0] || trimmed;
  // ひらがなをカタカナに変換
  return toKatakana(lastName);
};

export default function Home() {
  // Web Version Check
  const [isPublicWeb, setIsPublicWeb] = useState(false);
  const [downloadCode, setDownloadCode] = useState("");
  const [isCodeUnlocked, setIsCodeUnlocked] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [showDesktopMigrationModal, setShowDesktopMigrationModal] = useState(false);

  useEffect(() => {
    // クライアントサイドでのみ実行してホスト名をチェック
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || 
                    hostname === '127.0.0.1' || 
                    hostname.endsWith('.local') ||
                    /^(192\.168\.|10\.|172\.)/.test(hostname);
    
    setIsPublicWeb(!isLocal);
  }, []);

  const handleUnlockDownload = (e: React.FormEvent) => {
    e.preventDefault();
    const code = downloadCode.trim().toLowerCase();
    
    // 許可するダウンロード認証コード一覧
    const validCodes = ['oralnote-setup', 'matsushima-vip', 'coupon-free', 'oralnote2026'];
    
    if (validCodes.includes(code)) {
      setIsCodeUnlocked(true);
      setCodeError("");
    } else {
      setCodeError("無効なコードです。コードを正しく入力いただくか、下記よりお問い合わせください。");
      setIsCodeUnlocked(false);
    }
  };

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAgreedDisclaimer, setHasAgreedDisclaimer] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const deviceIdRef = useRef<string>("");

  // App Tabs
  const [activeTab, setActiveTab] = useState<"input" | "search" | "qr" | "slide" | "technician" | "settings">("search");
  const [todayQueue, setTodayQueue] = useState<TodayPatient[]>([]);
  const [inputPatientId, setInputPatientId] = useState("");
  const [inputPatientName, setInputPatientName] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"today" | "history">("today");
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [trialCount, setTrialCount] = useState(0);
  const [showQRModal, setShowQRModal] = useState(false);
  const [localIP, setLocalIP] = useState("");

  const fetchLocalIP = async () => {
    try {
      const res = await fetch("/api/network");
      if (res.ok) {
        const data = await res.json();
        setLocalIP(data.ip);
      }
    } catch (e) {
      console.error("Failed to fetch local IP:", e);
    }
  };

  // App Update State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{latestVersion: string, downloadUrl: string, releaseNotes: string} | null>(null);

  // Help Panel State
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  useEffect(() => {
    // Desktop App Update Checker
    const checkUpdate = async () => {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || /^(192\.168\.|10\.|172\.)/.test(hostname);
      
      if (isLocal) {
        try {
          const CURRENT_VERSION = "1.2.0"; // 現在のアプリのバージョン
          const res = await fetch("https://oralnote.nostalgista.co.jp/api/app-version", { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data.latestVersion && data.latestVersion > CURRENT_VERSION) {
              setUpdateInfo(data);
              setShowUpdateModal(true);
            }
          }
        } catch (e) {
          console.log("Update check failed (expected if offline or CORS issue)");
        }
      }
    };
    checkUpdate();
  }, []);

  useEffect(() => {
    const savedCount = localStorage.getItem("dental_os_trial_count");
    if (savedCount) setTrialCount(parseInt(savedCount, 10));
  }, []);

  // Input Tab State
  const [transcribedText, setTranscribedText] = useState("");
  const [soapText, setSoapText] = useState("");
  const [outputLength, setOutputLength] = useState<"short" | "long">("short");
  const [patientInfo, setPatientInfo] = useState("");
  const [savedPath, setSavedPath] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Search Tab State
  const [patientsList, setPatientsList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [patientHistory, setPatientHistory] = useState<{date: string, soap: string, filename?: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Wireless Connect Tab State
  const [wirelessPatientId, setWirelessPatientId] = useState("");
  const [wirelessImages, setWirelessImages] = useState<string[]>([]);
  const [isWirelessActive, setIsWirelessActive] = useState(false);
  const [showClinicProUpsell, setShowClinicProUpsell] = useState(false);

  // Wireless Connect Polling Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === "qr" && isWirelessActive && wirelessPatientId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://${window.location.hostname}:3001/api/patients/${wirelessPatientId}/images`);
          if (res.ok) {
            const data = await res.json();
            setWirelessImages(data.images);
          }
        } catch (e) {
          console.error("Failed to fetch wireless images", e);
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, isWirelessActive, wirelessPatientId]);
  // Append State
  const [appendingChart, setAppendingChart] = useState<string | null>(null);
  const [appendContent, setAppendContent] = useState("");
  const [staffName, setStaffName] = useState("");
  const [defaultStaffName, setDefaultStaffName] = useState("");
  const [customTerms, setCustomTerms] = useState<CustomTerm[]>([]);
  const [globalTerms, setGlobalTerms] = useState<CustomTerm[]>([]);
  const [showGlobalTerms, setShowGlobalTerms] = useState(false);
  const [newTermReading, setNewTermReading] = useState("");
  const [newTermNotation, setNewTermNotation] = useState("");
  const [reportReading, setReportReading] = useState("");
  const [reportNotation, setReportNotation] = useState("");

  const isMaster = typeof window !== 'undefined' ? localStorage.getItem('master_bypass') === 'true' : false;

  // Folder settings
  const [hasDirectory, setHasDirectory] = useState(false);
  const [directoryName, setDirectoryName] = useState("");
  const [isFSApiSupported, setIsFSApiSupported] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vaultPath, setVaultPath] = useState("");

  const saveVaultPath = async (pathStr: string) => {
    try {
      let currentSettings = { email: "" };
      const getRes = await fetch('/api/settings/clinic');
      if (getRes.ok) {
        currentSettings = await getRes.json();
      }
      await fetch('/api/settings/clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentSettings, vaultPath: pathStr })
      });
    } catch(e) {
      console.error("Failed to save vault path:", e);
    }
  };

  const [status, setStatus] = useState<"idle" | "recording" | "transcribing" | "formatting" | "saving" | "saved" | "error">("idle");
  const [mdSaveTarget, setMdSaveTarget] = useState<'ipad' | 'pc'>(process.env.NEXT_PUBLIC_APP_MODE === 'local' ? 'pc' : 'ipad');
  
  // Draft save effect
  useEffect(() => {
    const savedDraft = localStorage.getItem("dental_os_draft_text");
    if (savedDraft) setTranscribedText(savedDraft);
  }, []);

  useEffect(() => {
    localStorage.setItem("dental_os_draft_text", transcribedText);
  }, [transcribedText]);

  // Fetch Global Terms
  useEffect(() => {
    const fetchGlobalTerms = async () => {
      try {
        const { data, error } = await supabase.from('global_terms').select('*');
        if (error) throw error;
        if (data) {
          setGlobalTerms(data.map((item: any) => ({
            id: item.id,
            reading: item.reading,
            term: item.term
          })));
        }
      } catch (err) {
        console.error("Failed to fetch global terms:", err);
      }
    };
    fetchGlobalTerms();
  }, []);

  useEffect(() => {
    let storedDeviceId = localStorage.getItem("dental_os_device_id");
    if (!storedDeviceId) {
      storedDeviceId = generateDeviceId();
      localStorage.setItem("dental_os_device_id", storedDeviceId);
    }
    deviceIdRef.current = storedDeviceId;

    // ローカルネットワーク（iPad等からのアクセス）を判定
    const isLanIp = /^(192\.168\.\d+\.\d+|10\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/.test(window.location.hostname);

    // マスターバイパスが有効、またはLAN経由（iPad等）なら即座に認証完了とする
    if (localStorage.getItem('master_bypass') === 'true' || isLanIp) {
      setIsAuthenticated(true);
      // LAN経由（iPad）の場合は、PC側で既に認証されている前提として、Stripe認証を完全にスキップする
      if (isLanIp) return; 
    }

    const storedEmail = localStorage.getItem("dental_os_email");
    if (storedEmail) {
      setAuthEmail(storedEmail);
      // 通信ラグで一瞬未認証扱いになるのを防ぐため、ローカルに保存されていれば即座に認証済みとする（Optimistic UI）
      setIsAuthenticated(true);
      
      verifySession(storedEmail, storedDeviceId).then(valid => {
        // もしサーバー側で明確に無効と判定された場合のみログアウトする
        if (!valid && localStorage.getItem('master_bypass') !== 'true') {
          setIsAuthenticated(false);
        }
      });
    }

    if (localStorage.getItem("dental_os_disclaimer_agreed") === "true") {
      setHasAgreedDisclaimer(true);
    }

    const storedStaff = localStorage.getItem("dental_os_staff_name");
    if (storedStaff) {
      setStaffName(storedStaff);
      setDefaultStaffName(storedStaff);
    }

    // カスタム辞書（ローカルネットワーク同期）の取得
    const fetchCustomTerms = async () => {
      try {
        const res = await fetch('/api/settings/terms');
        if (res.ok) {
          const data = await res.json();
          setCustomTerms(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Failed to fetch custom terms:", e);
        // フォールバックとして古いlocalStorageを読み込む
        const storedTerms = localStorage.getItem("dental_os_custom_terms");
        if (storedTerms) {
          try { setCustomTerms(JSON.parse(storedTerms)); } catch(e){}
        }
      }
    };
    fetchCustomTerms();
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
    const isMobileDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isMobileDevice) {
      setIsIOS(true);
      setMdSaveTarget('pc'); // Default to PC save for iPad terminals
    }

    // Handle login=true URL parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('login') === 'true') {
        setShowUnlockModal(true);
      }
    }

    // 医院設定（PC保存先フォルダ絶対パス含む）の取得
    const fetchClinicSettings = async () => {
      try {
        const res = await fetch('/api/settings/clinic');
        if (res.ok) {
          const data = await res.json();
          if (data && data.vaultPath) {
            setVaultPath(data.vaultPath);
          }
        }
      } catch (e) {
        console.error("Failed to fetch clinic settings:", e);
      }
    };
    fetchClinicSettings();

    // Restore todayQueue from server, fallback to localStorage
    const restoreQueue = async () => {
      try {
        const res = await fetch('/api/settings/queue');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setTodayQueue(data);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to load today queue from server, falling back to localStorage", e);
      }
      
      const storedQueue = localStorage.getItem("dental_os_today_queue");
      if (storedQueue) {
        try {
          setTodayQueue(JSON.parse(storedQueue));
        } catch (e) {
          console.error("Failed to parse today queue", e);
        }
      }
    };
    restoreQueue();
  }, []);

  // Polling todayQueue from server to sync between PC and iPad
  useEffect(() => {
    const isLocalMode = process.env.NEXT_PUBLIC_APP_MODE === 'local';
    if (!isLocalMode) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/settings/queue');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setTodayQueue(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(data)) {
                localStorage.setItem("dental_os_today_queue", JSON.stringify(data));
                return data;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        console.warn("Polling today queue failed:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "search" && patientsList.length === 0) {
      if (isFSApiSupported && hasDirectory) {
        loadPatients();
      } else if (!isFSApiSupported && process.env.NEXT_PUBLIC_APP_MODE === 'local') {
        loadPatients();
      }
    }
  }, [activeTab, hasDirectory, isFSApiSupported, patientsList.length]);

  // --- Authentication Logic ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError("");

    try {
      if (!deviceIdRef.current) deviceIdRef.current = generateDeviceId();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPassword: authPassword, deviceId: deviceIdRef.current }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ログインに失敗しました");

      setAuthEmail(data.email);
      localStorage.setItem("dental_os_email", data.email);
      localStorage.setItem("dental_os_password", authPassword);
      setIsAuthenticated(true);
      setShowUnlockModal(false);
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
      if (!res.ok) {
        if (data.reason === 'not_found') {
          // Auto re-login silently
          const savedPass = localStorage.getItem("dental_os_password");
          if (savedPass) {
            const loginRes = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ emailOrPassword: savedPass, deviceId }),
            });
            if (loginRes.ok) return true;
          }
        }
        throw new Error(data.error || "セッションが無効です");
      }
      return true;
    } catch (err: any) {
      console.warn("Session verification network error ignored:", err);
      // 通信エラー（iPadのスリープ復帰時など）でサーバーに繋がらない場合は、
      // 強制ログアウトさせず、ローカルのセッションを維持する。
      return true;
    }
  };

  const handleLogout = (reason?: string) => {
    setIsAuthenticated(false);
    setAuthPassword("");
    if (reason) alert(`ログアウトしました: ${reason}`);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    // Removed 10-second polling to prevent Vercel serverless cold-start logouts and Stripe rate limits.
    // Session is validated on initial load.
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

  // --- Today's Patient Queue Logic ---
  const updateQueue = async (updated: TodayPatient[]) => {
    setTodayQueue(updated);
    localStorage.setItem("dental_os_today_queue", JSON.stringify(updated));
    try {
      await fetch('/api/settings/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error("Failed to save today queue to server:", e);
    }
  };

  const handleToggleTodayPatientComplete = (id: string) => {
    const updated = todayQueue.map(p => {
      if (p.id === id) {
        return { ...p, completed: !p.completed };
      }
      return p;
    });
    updateQueue(updated);
  };

  const handleDeleteTodayPatient = (id: string) => {
    const updated = todayQueue.filter(p => p.id !== id);
    updateQueue(updated);
    if (wirelessPatientId === id) {
      setWirelessPatientId("");
      setPatientInfo("");
    }
  };

  const handleAddTodayPatient = (idStr: string, nameStr: string) => {
    const trimmedId = idStr.trim();
    const trimmedName = nameStr.trim();
    if (!trimmedId) return;

    const kanaLastName = formatToKatakanaLastName(trimmedName);
    const displayName = kanaLastName ? `${trimmedId}_${kanaLastName}` : trimmedId;

    if (todayQueue.some(p => p.id === trimmedId)) {
      alert("すでに登録されている患者IDです。");
      return;
    }

    const newPatient: TodayPatient = {
      id: trimmedId,
      name: displayName,
      addedAt: Date.now(),
      completed: false
    };

    const updated = [...todayQueue, newPatient];
    updateQueue(updated);
    setInputPatientId("");
    setInputPatientName("");
  };

  const handleSelectTodayPatient = (patient: TodayPatient) => {
    setPatientInfo(patient.name);
    setWirelessPatientId(patient.id);
    setIsWirelessActive(true);
    setActiveTab("input");
  };

  const triggerPatientCompleted = (patientNameOrId: string) => {
    if (!patientNameOrId) return;
    const updated = todayQueue.map(p => {
      if (p.name === patientNameOrId || p.id === patientNameOrId || patientNameOrId.startsWith(p.id)) {
        return { ...p, completed: true };
      }
      return p;
    });
    updateQueue(updated);
  };

  // --- Search Tab Logic ---
  const loadPatients = async () => {
    try {
      if (isFSApiSupported) {
        const dirHandle: any = await get("obsidianDirHandle");
        if (!dirHandle) return;
        
        if ((await dirHandle.queryPermission({ mode: "read" })) !== "granted") {
          if ((await dirHandle.requestPermission({ mode: "read" })) !== "granted") return;
        }

        const patientsSet = new Set<string>();
        for await (const entry of dirHandle.values()) {
          if (entry.kind === "file" && entry.name.endsWith(".md")) {
            if (entry.name.startsWith("カルテ_")) {
              const parts = entry.name.replace(".md", "").split("_");
              if (parts.length >= 2) {
                patientsSet.add(parts[1]);
              }
            } else {
              patientsSet.add(entry.name.replace(".md", ""));
            }
          }
        }
        setPatientsList(Array.from(patientsSet));
      } else {
        // iPad / local network API fallback
        const res = await fetch("/api/patients");
        if (res.ok) {
          const data = await res.json();
          setPatientsList(Array.isArray(data) ? data : []);
        }
      }
    } catch (err: any) {
      console.error("Failed to load patients", err);
      if (err.name === 'NotFoundError') {
        setHasDirectory(false);
        setDirectoryName("");
      }
    }
  };

  const selectPatient = async (patientName: string) => {
    setSelectedPatient(patientName);
    setIsSearching(true);
    setPatientHistory([]);
    setShowMobileDetail(true);
    try {
      if (isFSApiSupported) {
        const dirHandle: any = await get("obsidianDirHandle");
        const history = [];
        
        // 1. Scan root directory for flat chart files
        for await (const entry of dirHandle.values()) {
          if (entry.kind === "file" && entry.name.startsWith(`カルテ_${patientName}_`) && entry.name.endsWith(".md")) {
            try {
              const chartFile = await entry.getFile();
              const chartContent = await chartFile.text();
              const parts = entry.name.replace(".md", "").split('_');
              const dateStr = parts[parts.length - 1];
              const formattedDate = dateStr.match(/.{1,2}/g)?.join('/') || dateStr;
              history.push({ date: formattedDate, soap: chartContent, filename: entry.name });
            } catch(e) { console.warn(e); }
          }
        }

        // 2. Scan inside 'カルテ' directory for organized chart files
        try {
          const chartDirHandle = await dirHandle.getDirectoryHandle('カルテ');
          for await (const entry of chartDirHandle.values()) {
            if (entry.kind === "file" && entry.name.startsWith(`カルテ_${patientName}_`) && entry.name.endsWith(".md")) {
              try {
                const chartFile = await entry.getFile();
                const chartContent = await chartFile.text();
                const parts = entry.name.replace(".md", "").split('_');
                const dateStr = parts[parts.length - 1];
                const formattedDate = dateStr.match(/.{1,2}/g)?.join('/') || dateStr;
                if (!history.find(h => h.filename === entry.name)) {
                  history.push({ date: formattedDate, soap: chartContent, filename: entry.name });
                }
              } catch(e) {}
            }
          }
        } catch (e) {}

        // Sort newest first
        history.sort((a, b) => b.filename.localeCompare(a.filename));
        setPatientHistory(history);
      } else {
        // iPad / local network API fallback
        const res = await fetch(`/api/patients/${encodeURIComponent(patientName)}/history`);
        if (res.ok) {
          const data = await res.json();
          setPatientHistory(Array.isArray(data) ? data : []);
        }
      }
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
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      if (isFSApiSupported) {
        const dirHandle: any = await get("obsidianDirHandle");
        let chartDirHandle = dirHandle;
        try { chartDirHandle = await dirHandle.getDirectoryHandle('カルテ'); } catch (e) {}
        
        const fileHandle = await chartDirHandle.getFileHandle(filename);
        const file = await fileHandle.getFile();
        const currentContent = await file.text();
        
        const newContent = `${currentContent}\n\n### 追記 (${dateStr}) - 担当: ${staffName}\n${appendContent}`;
        
        const writable = await fileHandle.createWritable();
        await writable.write(newContent);
        await writable.close();
      } else {
        // iPad / local network API fallback
        const record = patientHistory.find(r => r.filename === filename);
        if (!record) throw new Error("対象のカルテファイルが見つかりません。");
        
        const newContent = `${record.soap}\n\n### 追記 (${dateStr}) - 担当: ${staffName}\n${appendContent}`;
        
        const saveRes = await fetch("/api/save-md", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, content: newContent }),
        });
        
        if (!saveRes.ok) throw new Error("PCへの追記保存に失敗しました");
      }
      
      localStorage.setItem("dental_os_staff_name", staffName);
      
      setAppendingChart(null);
      setAppendContent("");
      if (selectedPatient) selectPatient(selectedPatient); 
    } catch (err) {
      console.error(err);
      alert("追記の保存に失敗しました。");
    }
  };

  // Audio recording has been removed in favor of OS-native keyboard dictation

  const handleToothClick = (number: number, quadrant: 'UR' | 'UL' | 'LR' | 'LL') => {
    const symbols = { UR: '┛', UL: '┗', LR: '┓', LL: '┏' };
    const symbol = symbols[quadrant];
    
    setTranscribedText(prev => {
      let trimmed = prev.trimEnd();
      
      // 同じ象限（ブロック）に連続入力された場合は数字を連結する
      if (quadrant === 'UR' || quadrant === 'LR') {
        // 右側: 既に「数字+記号」で終わっている場合、記号の前に数字を挿入（例: 6┛ -> 65┛）
        const regex = new RegExp(`(\\d+)(${symbol})$`);
        if (regex.test(trimmed)) {
          return trimmed.replace(regex, `$1${number}$2`) + ' ';
        }
      } else {
        // 左側: 既に「記号+数字」で終わっている場合、数字の後に数字を挿入（例: ┗1 -> ┗12）
        const regex = new RegExp(`(${symbol})(\\d+)$`);
        if (regex.test(trimmed)) {
          return trimmed.replace(regex, `$1$2${number}`) + ' ';
        }
      }

      // 新規ブロックとして追加
      const textToAdd = (quadrant === 'UR' || quadrant === 'LR') 
        ? `${number}${symbol}` 
        : `${symbol}${number}`;
        
      // 直前がスペースでなければスペースを挟む
      const prefix = (prev.endsWith(' ') || prev.endsWith('\n') || prev === '') ? '' : ' ';
      return prev + prefix + textToAdd + ' ';
    });
  };

  const renderToothRow = (numbers: number[], quadrant: 'UR' | 'UL' | 'LR' | 'LL') => (
    numbers.map(n => (
      <button 
        key={`${quadrant}-${n}`} 
        onClick={() => handleToothClick(n, quadrant)} 
        className="w-[22px] h-7 sm:w-7 sm:h-8 flex items-center justify-center bg-neutral-800 hover:bg-teal-600 text-neutral-300 rounded active:scale-95 transition-transform text-[11px] sm:text-sm font-bold"
      >
        {n}
      </button>
    ))
  );

  const generateSOAP = async (text: string) => {
    if (!isAuthenticated) {
      if (trialCount >= 5) {
        setShowUnlockModal(true);
        return;
      }
      const newCount = trialCount + 1;
      setTrialCount(newCount);
      localStorage.setItem("dental_os_trial_count", newCount.toString());
    }

    setStatus("formatting");
    const allTerms = [...customTerms, ...globalTerms];
    const termsString = allTerms.map(t => `${t.reading} → ${t.term}`).join(", ");
    try {
      const soapRes = await fetch("/api/soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, customTerms: termsString, outputLength }),
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

  // Native OS dictation does not use processAudio

  const displaySoapText = staffName.trim() && soapText ? `${soapText}\n\n---\n担当: ${staffName}` : soapText;

  const saveToObsidian = async () => {
    if (!isAuthenticated) {
      setShowUnlockModal(true);
      return;
    }

    if (!soapText) return;
    setStatus("saving");
    
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0].replace(/-/g, "").substring(2); 
      const filename = `カルテ_${patientInfo}_${dateStr}.md`;

      if (mdSaveTarget === 'pc' && process.env.NEXT_PUBLIC_APP_MODE === 'local') {
        // バックエンド（Windows PC）に直接保存する
        const saveRes = await fetch("/api/save-md", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, content: displaySoapText }),
        });
        
        if (!saveRes.ok) throw new Error("PCへの保存に失敗しました");
        const saveData = await saveRes.json();
        
        localStorage.setItem("dental_os_staff_name", staffName);
        setStatus("saved");
        setSavedPath(`PCへ保存完了 (${saveData.filePath})`);
        triggerPatientCompleted(patientInfo);
        return;
      }

      // 従来の処理（iPadローカル / File System Access API）
      if (isIOS) {
        const filePath = encodeURIComponent(`カルテ/${filename}`);
        const content = encodeURIComponent(displaySoapText);
        const uri = `obsidian://new?file=${filePath}&content=${content}`;
        window.location.href = uri;
        
        localStorage.setItem("dental_os_staff_name", staffName);
        setStatus("saved");
        setSavedPath(`Obsidianアプリへ転送完了`);
        triggerPatientCompleted(patientInfo);
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
        const doctorInfo = staffName ? `担当者：${staffName}\n` : "";
        await writable.write(doctorInfo + displaySoapText);
        await writable.close();
        
        localStorage.setItem("dental_os_staff_name", staffName);
        
        // 2. 患者ページの更新
        const patientFilename = `${patientInfo}.md`;
        const patientFileHandle = await dirHandle.getFileHandle(patientFilename, { create: true });
        const patientFile = await patientFileHandle.getFile();
        const patientContent = await patientFile.text();
        
        const newPatientContent = patientContent 
          ? patientContent + `\n- ${filename.replace('.md', '')}`
          : `# ${patientInfo}\n\n## 診療記録\n- ${filename.replace('.md', '')}`;

        const patientWritable = await patientFileHandle.createWritable();
        await patientWritable.write(newPatientContent);
        await patientWritable.close();

        setStatus("saved");
        setSavedPath(`${dirHandle.name} / カルテ / ${filename} および ${patientFilename}`);
        triggerPatientCompleted(patientInfo);
      } else {
        const doctorInfo = staffName ? `担当者：${staffName}\n` : "";
        const fallbackText = `患者ページ: #${patientInfo}\n${doctorInfo}${displaySoapText}`;
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
        triggerPatientCompleted(patientInfo);
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

  const handleTabChange = (tab: "input" | "search" | "qr" | "slide" | "technician" | "settings") => {
    // パブリックWeb（Vercelなど）では「AIカルテ入力」以外のタブはデスクトップ版専用とする
    if (isPublicWeb && tab !== "input") {
      setShowDesktopMigrationModal(true);
      return;
    }

    if (!isAuthenticated && tab !== "input") {
      setShowUnlockModal(true);
      return;
    }

    // Cloud Web Version check for Wireless Connect (qr) tab
    if (tab === "qr") {
      const isCloud = typeof window !== 'undefined' && 
                      window.location.hostname !== 'localhost' && 
                      !window.location.hostname.match(/^(192\.168\.|10\.|172\.)/);
      if (isCloud) {
        setShowClinicProUpsell(true);
        return;
      }
    }

    setActiveTab(tab);
    setShowMobileDetail(false);
  };

  // --- Renders ---

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
    <div className="h-[100dvh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/30 via-neutral-950 to-neutral-950 text-neutral-100 font-sans selection:bg-teal-500/30 flex flex-col overflow-hidden">
      
      {/* Unlock Modal Overlay */}
      {showUnlockModal && !isAuthenticated && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowUnlockModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors">✕</button>
            <div className="flex flex-col items-center mb-6">
              <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-teal-900/20 mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">ライセンスキーが必要です</h2>
              <p className="text-sm text-neutral-400 text-center leading-relaxed">
                無料体験（5回）が終了しました。<br/>これ以降のカルテ生成や、他の機能を利用するにはパスワードを入力してください。
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">ライセンスキー（Stripe決済時のメールアドレス または マスターパスワード）</label>
                <input
                  type="text"
                  required
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="doctor@example.com または パスワード"
                />
              </div>
              {authError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{authError}</div>}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-white text-black font-bold rounded-xl py-4 mt-4 hover:bg-neutral-200 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "ロックを解除して全機能を使う"}
              </button>
              
              <div className="pt-4 mt-4 border-t border-neutral-800 text-center">
                <a href="https://buy.stripe.com/dRmdR9fLB2mIb5yfv633W00" target="_blank" rel="noopener noreferrer" onClick={() => setShowUnlockModal(false)} className="text-teal-400 text-sm font-semibold hover:text-teal-300">
                  まだライセンスをお持ちでない方はこちら
                </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* App Update Modal */}
      {showUpdateModal && updateInfo && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center mb-6">
              <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-teal-900/20 mb-4">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">アップデートのお知らせ</h2>
              <p className="text-sm text-neutral-400 text-center leading-relaxed mb-4">
                新しいバージョン（{updateInfo.latestVersion}）がリリースされました。
              </p>
              {updateInfo.releaseNotes && (
                <div className="w-full bg-black/40 p-3 rounded-lg border border-neutral-800 text-xs text-neutral-300 text-left mb-6">
                  {updateInfo.releaseNotes}
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <a 
                href={updateInfo.downloadUrl} 
                target="_blank" rel="noopener noreferrer"
                onClick={() => setShowUpdateModal(false)}
                className="w-full bg-teal-500 text-white font-bold rounded-xl py-3.5 hover:bg-teal-400 transition-colors flex items-center justify-center shadow-lg shadow-teal-500/25"
              >
                新しいバージョンをダウンロード
              </a>
              <button 
                onClick={() => setShowUpdateModal(false)}
                className="w-full bg-neutral-800 text-neutral-400 font-bold rounded-xl py-3 hover:bg-neutral-700 hover:text-neutral-300 transition-colors"
              >
                あとで更新する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Migration Modal */}
      {showDesktopMigrationModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200 my-8">
            <button 
              onClick={() => setShowDesktopMigrationModal(false)} 
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors z-20"
            >
              ✕
            </button>

            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-teal-500 via-blue-500 to-teal-500 rounded-t-3xl"></div>
            
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4">
                <Download className="w-8 h-8 text-black" />
              </div>
              
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
                Windowsデスクトップ版専用機能
              </h2>
              <p className="text-teal-400 font-bold mt-1 text-xs md:text-sm px-3 py-1 bg-teal-500/10 rounded-full border border-teal-500/20">
                ライセンス認証・移行のご案内
              </p>
            </div>

            <div className="space-y-5 text-neutral-300 text-xs md:text-sm leading-relaxed max-h-[60dvh] overflow-y-auto pr-1">
              <p className="text-center font-medium text-white">
                この機能（カルテ検索、Wireless Connect、スライド生成、技工指示書、設定）は、**「PC専用デスクトップアプリ版（Windows版）」専用**となっております。
              </p>
              
              <div className="p-4 bg-neutral-950/50 border border-neutral-800 rounded-2xl">
                <p className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                  PCデスクトップ版の強力なメリット
                </p>
                <ul className="space-y-1.5 text-neutral-400 text-xs pl-4 list-disc">
                  <li><strong>Obsidianフォルダ全自動連携</strong>: ブラウザのセキュリティ制限なく、電子カルテフォルダと全自動でファイル同期。</li>
                  <li><strong>院内Wireless Connect</strong>: 同一Wi-Fi上のスマホ/iPadから撮影画像をPCへ瞬時に自動転送。</li>
                  <li><strong>オフライン高速動作</strong>: 院内クローズド環境でも軽快かつ安全に稼働。</li>
                </ul>
              </div>

              <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
                <p className="font-bold text-teal-400 text-sm mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                  すでにクーポン・お試しコードをお持ちの方
                </p>
                <p className="text-neutral-300 text-xs leading-relaxed">
                  お手元のコードを入力することで、Windowsデスクトップ版インストーラーのダウンロードリンクが表示されます。移行に伴う追加料金等は一切発生しません。
                </p>
              </div>
              
              <div className="pt-4 border-t border-neutral-800 w-full">
                {!isCodeUnlocked ? (
                  <div className="space-y-5">
                    <form onSubmit={handleUnlockDownload} className="space-y-3">
                      <label className="block text-xs font-medium text-neutral-300 text-center">
                        ライセンスキーまたはクーポンコードを入力
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={downloadCode}
                          onChange={(e) => setDownloadCode(e.target.value)}
                          placeholder="例: クーポンコードを入力"
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors text-center text-xs"
                        />
                        <button
                          type="submit"
                          className="bg-teal-500 hover:bg-teal-400 text-black font-extrabold px-5 rounded-xl text-xs transition-colors flex items-center justify-center whitespace-nowrap"
                        >
                          認証する
                        </button>
                      </div>
                      {codeError && (
                        <p className="text-[11px] text-red-400 text-center mt-1">
                          {codeError}
                        </p>
                      )}
                    </form>

                    <div className="bg-neutral-950/40 border border-neutral-800/60 rounded-2xl p-4 text-center space-y-2">
                      <p className="text-xs font-bold text-neutral-300">
                        ライセンスをお持ちでない新規の方・無料体験のご案内
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        OralNote デスクトップ版の新規ご利用・無料お試しをご希望の先生は、お手数ですが開発代表の松島まで直接ご連絡いただくか、以下よりお問い合わせください。
                      </p>
                      <a
                        href="mailto:order@nostalgista.co.jp?subject=OralNotePC版の利用申込みについて"
                        className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-bold bg-teal-500/10 px-3.5 py-2 rounded-xl border border-teal-500/20 transition-colors mt-1"
                      >
                        松島へ直接問い合わせる
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl px-4 py-2 text-teal-400 text-xs font-bold flex items-center gap-2 mb-1 w-full justify-center">
                      <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></span>
                      認証に成功しました！ダウンロードリンクが解除されました。
                    </div>
                    <a
                      href="https://drive.google.com/drive/folders/1Y9FkzWJG28WG65s7SHqQDw2W48VYrSbf?usp=sharing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-black font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/10 hover:shadow-teal-500/25 transition-all text-center hover:scale-[1.01]"
                    >
                      <Download className="w-4 h-4" />
                      Windowsデスクトップ版（v1.2.0）をダウンロード
                    </a>
                    <p className="text-[11px] text-neutral-500 text-center">
                      ※Windows 10/11対応。ダウンロード後、インストーラーを実行してください。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinic Pro Upsell Modal */}
      {showClinicProUpsell && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowClinicProUpsell(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors">✕</button>
            <div className="flex flex-col items-center mb-6">
              <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-teal-900/20 mb-4">
                <Wifi className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">Clinic Pro 専用機能です</h2>
              <p className="text-sm text-neutral-400 text-center leading-relaxed">
                「Wireless Connect（カメラ画像自動転送）」をご利用いただくには、PCインストール版アプリを提供する<strong className="text-teal-400">Clinic Proプラン</strong>へのご加入が必要です。
              </p>
            </div>
            
            <div className="space-y-4">
              <a 
                href="https://os.nostalgista.co.jp/wireless-connect" 
                target="_blank" rel="noopener noreferrer"
                className="w-full bg-teal-500 text-white font-bold rounded-xl py-4 hover:bg-teal-400 transition-colors flex items-center justify-center shadow-lg shadow-teal-500/25"
              >
                Wireless Connect の詳細を見る
              </a>
              <button 
                onClick={() => setShowClinicProUpsell(false)}
                className="w-full bg-neutral-800 text-neutral-300 font-bold rounded-xl py-3 hover:bg-neutral-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iPad QR Code Connect Modal Overlay */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col items-center">
            <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors">✕</button>
            <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-teal-900/20 mb-4">
              <Tablet className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 text-center">iPad連携（ローカル接続）</h2>
            <p className="text-sm text-neutral-400 text-center leading-relaxed mb-6">
              同一Wi-Fiに接続されたiPadのカメラで<br/>以下のQRコードを読み取ってください。
            </p>
            <div className="bg-white p-4 rounded-2xl mb-4">
              {localIP ? (
                <QRCodeSVG value={`http://${localIP}:3000`} size={200} />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-neutral-400">取得中...</div>
              )}
            </div>
            {localIP && (
              <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-center">
                <span className="text-xs text-neutral-500 block mb-1">直接入力する場合のURL</span>
                <span className="text-sm text-teal-400 font-mono select-all">http://{localIP}:3000</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Navigation (Desktop/iPad) */}
      <nav className="hidden md:flex bg-neutral-900/60 backdrop-blur-xl border-b border-white/5 px-6 py-4 items-center justify-between z-10 shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 mr-4">
            <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-teal-900/50 border border-teal-400/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-100 to-neutral-400">
                OralNote
              </h1>
              <span className="text-[10px] text-teal-500/50 font-mono tracking-wider">v1.2.0 (App)</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            <button
              onClick={() => handleTabChange("search")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "search" ? "bg-white/10 text-white shadow-lg shadow-black/50" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
              }`}
            >
              <Search className="w-4 h-4" />
              患者
            </button>
            <button
              onClick={() => handleTabChange("input")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "input" ? "bg-white/10 text-white shadow-lg shadow-black/50" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
              }`}
            >
              <Mic className="w-4 h-4" />
              カルテ
            </button>
            <button
              onClick={() => handleTabChange("qr")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "qr" ? "bg-white/10 text-white shadow-lg shadow-black/50" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
              }`}
            >
              <Camera className="w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col text-left leading-tight text-[11px] sm:text-[13px]">
                <span>Wireless</span>
                <span>Connect</span>
              </div>
            </button>
            <button
              onClick={() => handleTabChange("slide")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "slide" ? "bg-white/10 text-white shadow-lg shadow-black/50" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
              }`}
            >
              <Presentation className="w-4 h-4" />
              スライド生成
            </button>
            <button
              onClick={() => handleTabChange("technician")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === "technician" ? "bg-white/10 text-white shadow-lg shadow-black/50" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
              }`}
            >
              <Clipboard className="w-4 h-4 flex-shrink-0" />
              <div className="flex flex-col text-left leading-tight text-[11px] sm:text-[13px]">
                <span>技工</span>
                <span>指示書</span>
              </div>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {isPublicWeb && (
            <button 
              onClick={() => setShowDesktopMigrationModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 text-teal-400 border border-teal-500/20 bg-teal-500/10 hover:bg-teal-500/20"
            >
              <Download className="w-4 h-4" />
              Windows版移行・DL
            </button>
          )}
          {process.env.NEXT_PUBLIC_APP_MODE === 'local' && (
            <button 
              onClick={() => {
                fetchLocalIP();
                setShowQRModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
            >
              <Tablet className="w-4 h-4" />
              iPad連携
            </button>
          )}
          <button 
            onClick={() => handleTabChange("settings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === "settings" ? "bg-white/10 text-white shadow-lg shadow-black/50" : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
            }`}
          >
            <Settings className="w-4 h-4" />
            設定
          </button>
          {isAuthenticated && (
            <div className="flex items-center gap-3 border-l border-neutral-800 pl-6">
              <User className="w-4 h-4 text-neutral-500" />
              <div className="text-xs text-neutral-400 truncate max-w-[120px]">{authEmail}</div>
              <button onClick={() => handleLogout()} className="text-xs text-red-400 hover:text-red-300 ml-2">
                ログアウト
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {isPublicWeb && (
            <div className="w-full bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-teal-500/10 border border-teal-500/20 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-teal-500/20 p-2 rounded-xl text-teal-400">
                  <Download className="w-5 h-5 flex-shrink-0" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">より快適に使えるWindowsデスクトップ版のご案内</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    電子カルテ連携（Obsidian自動保存）やiPadからのワイヤレス撮影画像転送にはPCインストール版が必要です。
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDesktopMigrationModal(true)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black text-xs font-extrabold rounded-xl transition-colors whitespace-nowrap"
              >
                移行・ダウンロード手順を見る
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          {/* === WIRELESS CONNECT TAB === */}
          {activeTab === "qr" && (
            <CameraMode activePatient={patientInfo} />
          )}

          {/* === INPUT TAB === */}
          {activeTab === "input" && (
            <div className="flex flex-col md:grid md:grid-cols-12 gap-6 md:gap-8 min-h-[calc(100dvh-200px)] md:h-[600px]">
              <div className="md:col-span-4 flex flex-col items-center justify-center p-6 md:p-8 bg-neutral-900/50 border border-neutral-800 rounded-3xl backdrop-blur-sm relative flex-shrink-0 order-1">
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-950/50 border border-neutral-800 text-xs font-medium">
                  {status === "idle" && <span className="text-neutral-400">準備完了</span>}
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

                {/* 文字数（出力長）切り替えトグル */}
                <div className="flex w-full items-center justify-center gap-4 text-xs font-semibold px-4 py-2 bg-black/40 rounded-full border border-white/5 mt-4">
                  <span className="text-neutral-400">出力の長さ:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="outputLength" 
                      checked={outputLength === 'short'} 
                      onChange={() => setOutputLength('short')} 
                      className="accent-teal-500" 
                    />
                    <span className={outputLength === 'short' ? 'text-white' : 'text-neutral-500'}>短め(要約)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="outputLength" 
                      checked={outputLength === 'long'} 
                      onChange={() => setOutputLength('long')} 
                      className="accent-teal-500" 
                    />
                    <span className={outputLength === 'long' ? 'text-white' : 'text-neutral-500'}>長め(詳細)</span>
                  </label>
                </div>

                <div className="mt-8 w-full p-6 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center mb-4">
                    <Mic className="w-6 h-6 text-teal-400" />
                  </div>
                  <h3 className="text-teal-400 font-bold mb-2">音声入力のご案内</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    iPadやiPhoneの<br/>
                    <strong className="text-neutral-200">キーボードのマイク機能（音声認識）</strong><br/>
                    を使用して右側のテキストエリアに入力してください。
                  </p>

                </div>
              </div>

              <div className="md:col-span-8 space-y-6 flex flex-col flex-1 order-2 min-h-[500px] md:min-h-0">
                {/* Active Patient Target Banner */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  patientInfo 
                    ? "bg-teal-500/10 border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.05)] animate-in fade-in slide-in-from-top-2" 
                    : "bg-neutral-900/40 border-neutral-800"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex items-center justify-center">
                        <span className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${patientInfo ? 'bg-teal-400 opacity-75 animate-ping' : 'bg-neutral-600'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${patientInfo ? 'bg-teal-500' : 'bg-neutral-500'}`}></span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">カルテ記載対象</span>
                        {patientInfo ? (
                          <span className="text-sm font-black text-teal-300 font-sans tracking-wide">
                            {patientInfo.includes('_') ? `ID: ${patientInfo.split('_')[0]} | ${patientInfo.split('_')[1]} 様` : `${patientInfo} 様`}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-neutral-400">患者が指定されていません（リストから選択するか下記に入力してください）</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Patient Input Field */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={patientInfo}
                        onChange={e => {
                          const val = e.target.value;
                          setPatientInfo(val);
                          if (val.includes('_')) {
                            setWirelessPatientId(val.split('_')[0]);
                          } else {
                            setWirelessPatientId(val);
                          }
                        }}
                        placeholder="例: 1234_ヤマダ"
                        className="bg-neutral-950 border border-neutral-800 focus:border-teal-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none w-full sm:w-44 transition-colors"
                      />
                      {patientInfo && (
                        <button
                          onClick={() => {
                            setPatientInfo("");
                            setWirelessPatientId("");
                          }}
                          className="text-[10px] text-neutral-500 hover:text-red-400 px-2 py-1 bg-black/20 rounded-lg border border-neutral-800 transition-colors"
                        >
                          解除
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 flex-shrink-0">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pl-2 flex justify-between w-full pr-2">
                    <span>メモ入力 / 音声文字起こし</span>
                    {!isAuthenticated && <span className="text-teal-500">無料体験: 残り {Math.max(0, 5 - trialCount)}回</span>}
                  </label>
                  
                  {/* Tooth Selector UI */}
                  <div className="flex flex-col items-center font-mono text-sm gap-[2px] bg-black/40 p-2 sm:p-3 rounded-xl border border-white/5 mb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <div className="flex items-center min-w-max">
                      <div className="flex gap-[2px] sm:gap-1 pr-1 border-r-2 border-neutral-600">
                        {renderToothRow([8,7,6,5,4,3,2,1], 'UR')}
                      </div>
                      <div className="flex gap-[2px] sm:gap-1 pl-1 border-b-2 border-transparent">
                        {renderToothRow([1,2,3,4,5,6,7,8], 'UL')}
                      </div>
                    </div>
                    <div className="w-full h-[2px] bg-neutral-600 min-w-max" />
                    <div className="flex items-center min-w-max">
                      <div className="flex gap-[2px] sm:gap-1 pr-1 border-r-2 border-neutral-600">
                        {renderToothRow([8,7,6,5,4,3,2,1], 'LR')}
                      </div>
                      <div className="flex gap-[2px] sm:gap-1 pl-1">
                        {renderToothRow([1,2,3,4,5,6,7,8], 'LL')}
                      </div>
                    </div>
                  </div>

                  <textarea
                    value={transcribedText}
                    onChange={(e) => setTranscribedText(e.target.value)}
                    placeholder="ここをタップして、キーボードのマイクボタンを押して録音してください... (例: CR充填)"
                    className="w-full h-32 p-4 bg-neutral-900 border border-neutral-700/50 focus:border-teal-500/50 rounded-2xl text-sm text-neutral-200 outline-none resize-none leading-relaxed transition-colors shadow-inner"
                  />
                  <button
                    onClick={() => generateSOAP(transcribedText)}
                    disabled={!transcribedText || status === "formatting" || status === "saving"}
                    className="w-full mt-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FileText className="w-5 h-5" />
                    🪄 AIカルテ生成 (SOAP化)
                  </button>
                  <button
                    onClick={() => {
                      setTranscribedText("");
                      localStorage.removeItem("dental_os_draft_text");
                    }}
                    disabled={!transcribedText}
                    className="w-full mt-2 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    入力内容をクリア
                  </button>
                </div>

                <div className="space-y-2 flex-1 flex flex-col min-h-[250px]">
                  <label className="text-xs font-semibold text-purple-400/80 uppercase tracking-wider flex items-center justify-between pl-2">
                    <span>AI カルテ生成 (SOAP)</span>
                  </label>
                  <textarea
                    value={soapText}
                    onChange={(e) => setSoapText(e.target.value)}
                    placeholder="ここにSOAP形式に整形されたカルテが表示されます。修正も可能です。"
                    className="flex-1 w-full p-4 bg-neutral-900 border border-neutral-700/50 focus:border-purple-500/50 rounded-2xl text-base md:text-sm text-neutral-200 outline-none resize-none leading-relaxed transition-colors font-mono shadow-inner"
                  />
                  {soapText && (
                    <div className={`mt-2 p-3 sm:p-4 border rounded-xl animate-in fade-in slide-in-from-bottom-2 ${isMaster ? 'bg-amber-500/10 border-amber-500/30' : 'bg-teal-500/10 border-teal-500/30'}`}>
                      <div className={`text-[10px] sm:text-xs font-bold mb-2 flex items-center gap-1 sm:gap-2 ${isMaster ? 'text-amber-500' : 'text-teal-400'}`}>
                        <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                        {isMaster ? "【管理者専用】誤字・専門用語を辞書へスピード登録" : "【AI学習】誤字があれば、あなた専用のローカル辞書に登録できます"}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                          type="text"
                          value={reportReading}
                          onChange={e => setReportReading(e.target.value)}
                          placeholder="よみ（誤変換された音）"
                          className={`flex-1 bg-neutral-950 border rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none ${isMaster ? 'border-amber-500/30 focus:border-amber-500' : 'border-teal-500/30 focus:border-teal-500'}`}
                        />
                        <input 
                          type="text"
                          value={reportNotation}
                          onChange={e => setReportNotation(e.target.value)}
                          placeholder="正しい表記"
                          className={`flex-1 bg-neutral-950 border rounded-lg px-3 py-2 text-xs sm:text-sm text-white outline-none ${isMaster ? 'border-amber-500/30 focus:border-amber-500' : 'border-teal-500/30 focus:border-teal-500'}`}
                        />
                        <button
                          onClick={async () => {
                            if (!reportReading || !reportNotation) return;
                            const newTerm = { id: Math.random().toString(36).substr(2, 9), reading: reportReading, term: reportNotation };
                            
                            // ローカル
                            const newTerms = [...customTerms, newTerm];
                            setCustomTerms(newTerms);
                            try {
                              fetch('/api/settings/terms', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(newTerms)
                              });
                            } catch(e) {}
                            
                            // グローバル (管理者のみ)
                            if (isMaster) {
                              try {
                                await supabase.from('global_terms').insert([{ reading: reportReading, term: reportNotation }]);
                                const { data } = await supabase.from('global_terms').select('*');
                                if (data) {
                                  setGlobalTerms(data.map((item: any) => ({
                                    id: item.id, reading: item.reading, term: item.term
                                  })));
                                }
                              } catch (e) {}
                            }

                            setReportReading("");
                            setReportNotation("");
                            alert("辞書に登録しました！次回から正しく変換されやすくなります。");
                          }}
                          className={`${isMaster ? 'bg-amber-600 hover:bg-amber-500' : 'bg-teal-600 hover:bg-teal-500'} text-white font-bold px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap active:scale-95`}
                        >
                          登録
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between pt-2 flex-shrink-0 gap-4 mb-4 md:mb-0">
                  <div className="text-xs text-neutral-500 w-full md:max-w-xs text-center md:text-left order-2 md:order-1 flex flex-col gap-1">
                    {status === "saved" && (
                      <>
                        <span className="truncate block">保存先: {savedPath}</span>
                        {isPublicWeb && (
                          <button
                            onClick={() => setShowDesktopMigrationModal(true)}
                            className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold text-center md:text-left transition-colors flex items-center gap-1 mt-0.5 justify-center md:justify-start"
                          >
                            <span>💡 Windowsデスクトップ版ならObsidian等へ完全自動保存 ➔</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto order-1 md:order-2">
                    {process.env.NEXT_PUBLIC_APP_MODE === 'local' && !isIOS && (
                      <div className="flex flex-col gap-1 items-center md:items-end mr-2">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">保存先</span>
                        <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden p-0.5">
                          <button
                            onClick={() => setMdSaveTarget('pc')}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors rounded-md ${mdSaveTarget === 'pc' ? 'bg-teal-500 text-black' : 'text-neutral-400 hover:text-white'}`}
                          >
                            PC本体
                          </button>
                          <button
                            onClick={() => setMdSaveTarget('ipad')}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors rounded-md ${mdSaveTarget === 'ipad' ? 'bg-teal-500 text-black' : 'text-neutral-400 hover:text-white'}`}
                          >
                            この端末
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <User className="w-4 h-4 text-teal-500 hidden md:block" />
                      <input 
                        type="text" 
                        value={staffName}
                        onChange={e => setStaffName(e.target.value)}
                        placeholder="担当スタッフ名 (任意)"
                        className="bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 md:py-2 text-base md:text-sm text-white focus:border-teal-500 outline-none w-full md:w-40"
                      />
                    </div>
                    <div className="flex w-full md:w-auto gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(displaySoapText);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        disabled={!soapText || status === "saving" || status === "formatting"}
                        className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-4 md:py-3 bg-neutral-800 text-white font-bold rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Clipboard className="w-5 h-5" />}
                        <span className="text-base md:text-sm">{copied ? "コピー済" : "コピー"}</span>
                      </button>
                      <button
                        onClick={saveToObsidian}
                        disabled={!soapText || status === "saving" || status === "formatting"}
                        className="flex-[2] md:flex-none flex justify-center items-center gap-2 px-6 py-4 md:py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <Save className="w-5 h-5" />
                        <span className="text-base md:text-sm">
                          {mdSaveTarget === 'pc' ? 'PCへ保存' : (isIOS ? "Obsidianへ転送" : (isFSApiSupported ? "データを保存" : "ダウンロード"))}
                        </span>
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
              {(!isFSApiSupported && process.env.NEXT_PUBLIC_APP_MODE !== 'local') ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <AlertTriangle className="w-16 h-16 text-amber-500/50 mb-6" />
                  <h2 className="text-2xl font-bold text-neutral-200 mb-4">iPad等のモバイルブラウザでは利用できません</h2>
                  <p className="text-neutral-400 max-w-lg leading-relaxed">
                    セキュリティ制限のため、ブラウザから直接パソコンのフォルダを検索・閲覧する機能はPC版のChromeやEdge専用となっております。
                    <br/><br/>過去のカルテを閲覧する場合は、お使いの端末の「Obsidian」などのファイル管理アプリをご利用ください。
                  </p>
                </div>
              ) : (!hasDirectory && isFSApiSupported) ? (
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
                  {/* Master-Detail Wrapper */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar: Patient List */}
                    <div className={`w-full md:w-80 border-r border-neutral-800 bg-neutral-950/50 flex-col ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
                      {/* Sidebar Tab Switcher */}
                      <div className="p-3 border-b border-neutral-800">
                        <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                          <button
                            onClick={() => setSidebarTab("today")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                              sidebarTab === "today"
                                ? "bg-teal-600 text-white shadow-lg shadow-teal-950/50"
                                : "text-neutral-400 hover:text-neutral-200"
                            }`}
                          >
                            本日の診療 ({todayQueue.length})
                          </button>
                          <button
                            onClick={() => setSidebarTab("history")}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                              sidebarTab === "history"
                                ? "bg-teal-600 text-white shadow-lg shadow-teal-950/50"
                                : "text-neutral-400 hover:text-neutral-200"
                            }`}
                          >
                            過去のカルテ
                          </button>
                        </div>
                      </div>

                      {/* Content Area */}
                      {sidebarTab === "today" ? (
                        <div className="flex-1 flex flex-col overflow-hidden p-3">
                          {/* Add Patient UI */}
                          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 mb-3 space-y-2">
                            <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">患者を本日の予定に追加</div>
                            <div className="flex gap-1.5">
                              <input 
                                type="text" 
                                value={inputPatientId}
                                onChange={e => setInputPatientId(e.target.value)}
                                placeholder="ID"
                                className="w-16 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-teal-500"
                              />
                              <input 
                                type="text" 
                                value={inputPatientName}
                                onChange={e => setInputPatientName(e.target.value)}
                                placeholder="苗字 (カタカナ自動)"
                                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-teal-500"
                              />
                              <button 
                                onClick={() => handleAddTodayPatient(inputPatientId, inputPatientName)}
                                className="p-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors flex-shrink-0 active:scale-95"
                                title="追加"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Queue List */}
                          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                            {(() => {
                              const sortedQueue = [...todayQueue].sort((a, b) => {
                                if (a.completed === b.completed) {
                                  return a.addedAt - b.addedAt;
                                }
                                return a.completed ? 1 : -1;
                              });

                              if (sortedQueue.length === 0) {
                                return (
                                  <div className="text-center text-xs text-neutral-500 py-10 border border-dashed border-neutral-800 rounded-2xl">
                                    診療予定はありません
                                  </div>
                                );
                              }

                              return sortedQueue.map(p => {
                                const isCurrent = wirelessPatientId === p.id || patientInfo === p.name || patientInfo.startsWith(p.id);
                                return (
                                  <div
                                    key={p.id}
                                    className={`flex items-center justify-between p-3 rounded-xl transition-all border ${
                                      isCurrent 
                                        ? "bg-teal-500/10 border-teal-500/30 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.1)]" 
                                        : p.completed 
                                          ? "bg-neutral-950/20 border-transparent text-neutral-500 opacity-40" 
                                          : "bg-neutral-900/40 border-transparent text-neutral-300 hover:bg-neutral-800"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      {/* Circle Toggle Checkbox */}
                                      <button 
                                        onClick={() => handleToggleTodayPatientComplete(p.id)}
                                        className="flex-shrink-0 focus:outline-none transition-transform active:scale-90"
                                      >
                                        {p.completed ? (
                                          <CheckCircle2 className="w-5 h-5 text-teal-500 fill-teal-500/10" />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full border-2 border-neutral-600 hover:border-teal-500 transition-colors" />
                                        )}
                                      </button>
                                      
                                      <div className="min-w-0 flex-1">
                                        <div className={`text-[10px] text-neutral-500 font-mono leading-none ${p.completed ? 'line-through' : ''}`}>
                                          ID: {p.id}
                                        </div>
                                        <div className={`text-sm font-bold truncate leading-snug ${p.completed ? 'line-through' : ''}`}>
                                          {p.name.includes('_') ? p.name.split('_')[1] : p.name}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {!p.completed ? (
                                        <button
                                          onClick={() => handleSelectTodayPatient(p)}
                                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                                            isCurrent
                                              ? "bg-teal-500 text-neutral-950 shadow-md scale-95"
                                              : "bg-neutral-800 hover:bg-teal-600 hover:text-white"
                                          }`}
                                        >
                                          {isCurrent ? "診療中" : "開始"}
                                        </button>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[9px] text-neutral-600 font-bold rounded">
                                          記載済
                                        </span>
                                      )}
                                      
                                      <button
                                        onClick={() => handleDeleteTodayPatient(p.id)}
                                        className="p-1 hover:text-red-400 text-neutral-600 transition-colors"
                                        title="予定から削除"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <div className="p-3 border-b border-neutral-800">
                            <div className="relative">
                              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input 
                                type="text" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="患者名やIDで検索..."
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-xs text-neutral-200 focus:outline-none focus:border-teal-500"
                              />
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-1 pr-1 scrollbar-thin">
                            {filteredPatients.length === 0 ? (
                              <div className="text-center text-sm text-neutral-500 mt-10">患者が見つかりません</div>
                            ) : (
                              filteredPatients.map(p => (
                                <button
                                  key={p}
                                  onClick={() => selectPatient(p)}
                                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors mb-1 ${
                                    selectedPatient === p ? "bg-teal-500/20 text-teal-300" : "text-neutral-300 hover:bg-neutral-800"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 opacity-70" />
                                    <span className="truncate text-xs font-medium">{p}</span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Content: Patient History */}
                    <div className={`flex-1 bg-neutral-900/30 flex-col ${!showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
                      {!selectedPatient ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 p-8 text-center">
                          <User className="w-16 h-16 opacity-20 mb-4" />
                          <p>リストから患者を選択してください</p>
                        </div>
                      ) : isSearching ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                          <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-4" />
                          <p>カルテ履歴を読み込み中...</p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto relative">
                          <div className="sticky top-0 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 px-6 py-4 md:px-8 md:py-6 z-10">
                            <button 
                              onClick={() => setShowMobileDetail(false)} 
                              className="md:hidden flex items-center gap-1 text-teal-400 font-bold mb-4 py-1 px-2 -ml-2 rounded-lg hover:bg-teal-900/30 active:bg-teal-900/50 transition-colors"
                            >
                              <ChevronLeft className="w-5 h-5" /> 戻る
                            </button>
                            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                              <User className="w-6 h-6 text-teal-500" />
                              {selectedPatient}
                            </h2>
                            <p className="text-sm text-neutral-400 mt-1">{patientHistory.length} 件の診療記録</p>
                          </div>
                          
                          <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
                            {patientHistory.length === 0 ? (
                              <div className="text-center text-neutral-500 py-10 bg-neutral-900 rounded-2xl border border-neutral-800 border-dashed">
                                診療記録が見つかりません
                              </div>
                            ) : (
                              <div className="relative border-l-2 border-neutral-800 ml-4 space-y-12 pb-24 md:pb-12">
                                {patientHistory.map((record, idx) => (
                                  <div key={idx} className="relative pl-6 md:pl-8">
                                    {/* Timeline Dot */}
                                    <div className="absolute w-4 h-4 bg-teal-500 rounded-full -left-[9px] top-1 ring-4 ring-neutral-950" />
                                    
                                    <div className="flex items-center gap-2 mb-4">
                                      <Clock className="w-4 h-4 text-teal-500" />
                                      <h3 className="text-lg font-bold text-teal-400">{record.date}</h3>
                                    </div>
                                    
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 shadow-xl relative group">
                                      <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-300 leading-relaxed font-medium">
                                        {record.soap}
                                      </pre>
                                      
                                      {appendingChart === record.filename ? (
                                        <div className="mt-6 pt-6 border-t border-neutral-800">
                                          <div className="mb-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-2">
                                            <div className="flex items-center gap-2">
                                              <User className="w-4 h-4 text-teal-500" />
                                              <input 
                                                type="text" 
                                                value={staffName}
                                                onChange={e => setStaffName(e.target.value)}
                                                placeholder="担当スタッフ名"
                                                className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500 outline-none w-full md:w-48"
                                              />
                                            </div>
                                          </div>
                                          <textarea
                                            value={appendContent}
                                            onChange={e => setAppendContent(e.target.value)}
                                            placeholder="※追記内容を入力してください。元の記録は上書きされず、末尾に追記されます。"
                                            className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-sm text-white focus:border-teal-500 outline-none resize-none mb-3 font-mono leading-relaxed"
                                          />
                                          <div className="flex flex-col-reverse md:flex-row gap-2 justify-end">
                                            <button 
                                              onClick={() => setAppendingChart(null)}
                                              className="px-4 py-3 md:py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors font-bold"
                                            >
                                              キャンセル
                                            </button>
                                            <button 
                                              onClick={() => record.filename && handleAppendSave(record.filename)}
                                              className="px-6 py-3 md:py-2 text-sm bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
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
                                          className="mt-4 md:absolute md:top-4 md:right-4 md:mt-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-neutral-800 hover:bg-neutral-700 text-neutral-300 w-full md:w-auto px-4 py-3 md:px-3 md:py-1.5 rounded-xl md:rounded-lg text-sm md:text-xs font-bold md:font-medium flex items-center justify-center gap-2 border border-neutral-700"
                                        >
                                          <FileText className="w-4 h-4 md:w-3 md:h-3" /> 追記する
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
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "slide" && <SlideGenerator />}

          {/* === TECHNICIAN ORDER TAB === */}
          {activeTab === "technician" && <TechnicianOrder />}

          {/* === SETTINGS TAB === */}
          {activeTab === "settings" && (
            <div className="max-w-4xl mx-auto py-4 md:py-8 mb-20 md:mb-0 space-y-6 md:space-y-8 px-2 md:px-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2">設定 (Settings)</h2>
                  <p className="text-xs md:text-sm text-neutral-400">アプリの動作や連携機能のカスタマイズを行います。</p>
                </div>
                <div className="text-[10px] md:text-xs text-teal-400 font-mono bg-teal-500/10 px-2 py-1 rounded-md border border-teal-500/20 shadow-inner">
                  v1.2.0 (App)
                </div>
              </div>

              {/* Data Connection */}
              <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-xl p-5 md:p-6 shadow-2xl">
                <h3 className="text-base md:text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-teal-500" />
                  データ保存・連携設定
                </h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                    <div>
                      <div className="font-semibold text-neutral-200 mb-1">Obsidian保存先フォルダ</div>
                      <div className="text-xs md:text-sm text-neutral-400">カルテや画像を保存するローカルフォルダを指定します。</div>
                      {!isFSApiSupported && (
                        <div className="mt-2 text-[10px] md:text-xs text-amber-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          ご利用のブラウザ・端末ではフォルダ連携機能がサポートされていません。
                        </div>
                      )}
                    </div>
                    {isFSApiSupported && (
                      <div className="flex-shrink-0 w-full md:w-auto">
                        {hasDirectory ? (
                          <div className="flex items-center justify-between md:justify-end gap-3 w-full">
                            <span className="text-sm text-teal-400 font-medium truncate max-w-[150px]">{directoryName}</span>
                            <button onClick={pickDirectory} className="px-4 py-3 md:py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl md:rounded-lg transition-colors border border-white/10 active:scale-95">
                              変更する
                            </button>
                          </div>
                        ) : (
                          <button onClick={pickDirectory} className="w-full md:w-auto px-6 py-3 md:py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold rounded-xl md:rounded-lg transition-colors shadow-lg active:scale-95">
                            フォルダを選択
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* PC保存先フォルダ絶対パス (同期用) */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex-1">
                      <div className="font-semibold text-neutral-200 mb-1">PC保存先フォルダ絶対パス (同期用)</div>
                      <div className="text-xs md:text-sm text-neutral-400">
                        PC上のカルテ保存フォルダ（Obsidian Vaultなど）の絶対パスを指定します。iPad連携時にこのフォルダが使われます。
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-full md:w-auto">
                      <input 
                        type="text" 
                        value={vaultPath}
                        onChange={(e) => {
                          setVaultPath(e.target.value);
                          saveVaultPath(e.target.value);
                        }}
                        placeholder="例: C:\Users\Username\Desktop\OralNote_Data"
                        className="w-full md:w-80 bg-neutral-950 border border-neutral-700 focus:border-teal-500 rounded-xl md:rounded-lg px-4 py-3 md:py-2 text-sm text-white outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dictionary Settings */}
              <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-xl p-5 md:p-6 shadow-2xl">
                <div className="mb-4">
                  <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    カスタム辞書・専門用語ルール
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="mb-4">
                      <div className="font-semibold text-neutral-200 mb-1">よく使う略語・専門用語</div>
                      <div className="text-xs md:text-sm text-neutral-400">
                        「よみ」と「表記」をセットで登録することで、AIの文字起こし精度が向上します。<br/>
                        <span className="text-teal-500 font-medium">※ここに登録した単語は、あなたのクリニック専用（ローカル）として保存され、他のユーザーには影響しません。</span>
                        {isMaster && <span className="text-amber-500 font-bold ml-1">【管理者モード】あなたが登録した単語は全ユーザー共通の共有辞書にも追加されます。</span>}
                      </div>
                    </div>
                    
                    {/* Add new term */}
                    <div className="flex flex-col md:flex-row gap-3 mb-6 bg-neutral-900/80 p-3 rounded-xl border border-neutral-800">
                      <input 
                        type="text" 
                        value={newTermReading}
                        onChange={(e) => setNewTermReading(e.target.value)}
                        placeholder="よみ（例: いんびざ）"
                        className="flex-1 bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white outline-none"
                      />
                      <input 
                        type="text" 
                        value={newTermNotation}
                        onChange={(e) => setNewTermNotation(e.target.value)}
                        placeholder="表記（例: インビザライン）"
                        className="flex-1 bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-white outline-none"
                      />
                      <button 
                        onClick={async () => {
                          if (!newTermReading || !newTermNotation) return;
                          
                          // 1. ローカル保存
                          const newTerm = { id: Math.random().toString(36).substr(2, 9), reading: newTermReading, term: newTermNotation };
                          const newTerms = [...customTerms, newTerm];
                          setCustomTerms(newTerms);
                          try {
                            fetch('/api/settings/terms', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(newTerms)
                            });
                          } catch(e) {}
                          
                          // 2. サーバー共有（グローバル辞書） - 管理者のみ登録可能
                          if (isMaster) {
                            try {
                              await supabase.from('global_terms').insert([{ reading: newTermReading, term: newTermNotation }]);
                              // 最新のグローバル辞書を取得し直す
                              const { data } = await supabase.from('global_terms').select('*');
                              if (data) {
                                setGlobalTerms(data.map((item: any) => ({
                                  id: item.id,
                                  reading: item.reading,
                                  term: item.term
                                })));
                              }
                            } catch (err) {
                              console.error("Failed to add to global terms", err);
                            }
                          }

                          setNewTermReading("");
                          setNewTermNotation("");
                        }}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg transition-colors whitespace-nowrap"
                      >
                        追加
                      </button>
                    </div>

                    {/* List of terms */}
                    <div className="space-y-6">
                      {/* Local Terms */}
                      <div>
                        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">ローカル辞書（あなた専用）</div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                          {customTerms.length === 0 ? (
                            <div className="text-center py-6 text-neutral-500 text-sm border-2 border-dashed border-neutral-800 rounded-xl">
                              登録されている用語はありません
                            </div>
                          ) : (
                            customTerms.map(t => (
                              <div key={t.id} className="flex items-center justify-between bg-neutral-800/50 p-3 rounded-lg border border-neutral-700/50 hover:border-neutral-600 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 flex-1">
                                  <span className="text-xs text-neutral-400 min-w-[80px]">よみ: <span className="text-neutral-300">{t.reading}</span></span>
                                  <span className="text-sm font-bold text-teal-400">表記: {t.term}</span>
                                </div>
                                <button 
                                  onClick={() => {
                                    const newTerms = customTerms.filter(item => item.id !== t.id);
                                    setCustomTerms(newTerms);
                                    try {
                                      fetch('/api/settings/terms', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(newTerms)
                                      });
                                    } catch(e) {}
                                  }}
                                  className="text-neutral-500 hover:text-red-400 p-2 transition-colors ml-2"
                                  title="削除"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Global Terms */}
                      <div className="pt-4 border-t border-white/5">
                        <div 
                          className="flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 p-2 -mx-2 rounded-lg transition-colors group"
                          onClick={() => setShowGlobalTerms(!showGlobalTerms)}
                        >
                          <div className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider flex items-center gap-2">
                            <span>共有辞書（全ユーザー共通・自動学習）</span>
                            <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded text-amber-500">{globalTerms.length}件</span>
                          </div>
                          <span className="text-[10px] text-neutral-500 group-hover:text-amber-500/80 transition-colors bg-black/40 px-2 py-1 rounded border border-white/5">
                            {showGlobalTerms ? "閉じる ▲" : "詳細を見る ▼"}
                          </span>
                        </div>
                        
                        {showGlobalTerms && (
                          <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-700">
                            {globalTerms.length === 0 ? (
                              <div className="text-center py-6 text-neutral-500 text-sm border-2 border-dashed border-neutral-800 rounded-xl">
                                共有辞書の読み込み中、または登録がありません
                              </div>
                            ) : (
                              globalTerms.map((t, idx) => (
                                <div key={t.id || idx} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-neutral-800/50">
                                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 flex-1">
                                    <span className="text-xs text-neutral-500 min-w-[80px]">よみ: <span className="text-neutral-400">{t.reading}</span></span>
                                    <span className="text-sm font-bold text-amber-500/80">表記: {t.term}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Settings */}
              <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-xl p-5 md:p-6 shadow-2xl">
                <h3 className="text-base md:text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  ユーザー・クリニック情報
                </h3>
                
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex-1">
                      <div className="font-semibold text-neutral-200 mb-1">デフォルト担当スタッフ名</div>
                      <div className="text-xs md:text-sm text-neutral-400">カルテ入力時に自動的にセットされるスタッフ名です。</div>
                    </div>
                    <div className="flex-shrink-0 w-full md:w-auto">
                      <input 
                        type="text" 
                        value={defaultStaffName}
                        onChange={(e) => {
                          setDefaultStaffName(e.target.value);
                          setStaffName(e.target.value);
                          localStorage.setItem("dental_os_staff_name", e.target.value);
                        }}
                        placeholder="例: 山田 太郎"
                        className="w-full md:w-64 bg-neutral-950 border border-neutral-700 focus:border-blue-500 rounded-xl md:rounded-lg px-4 py-3 md:py-2 text-sm text-white outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Floating Help Button */}
      <button
        onClick={() => setShowHelpPanel(true)}
        className="fixed bottom-20 md:bottom-8 right-6 w-14 h-14 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-40"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Help Panel (Slide-in) */}
      {showHelpPanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
          <div 
            className="w-full md:w-[400px] h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-white">
                <HelpCircle className="w-5 h-5 text-teal-400" />
                <h2 className="font-bold">ヘルプ・導入サポート</h2>
              </div>
              <button 
                onClick={() => setShowHelpPanel(false)}
                className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-5 mb-6">
                <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5 text-teal-400" />
                </div>
                <h3 className="text-white font-bold mb-2">Wireless Connect 導入マニュアル<br/><span className="text-xs text-neutral-400 font-normal">（専用AIサポート）</span></h3>
                <p className="text-sm text-neutral-300 leading-relaxed mb-4">
                  カメラ設定からネットワーク構築までの完全な手順は、専用のAIサポート環境（NotebookLM）にて提供しております。
                </p>
                <div className="space-y-2 mb-6">
                  <p className="text-xs text-neutral-400 flex items-start gap-1.5">
                    <span className="text-teal-500 font-bold">1.</span>
                    <span>以下のボタンからアクセス権をリクエストしてください。（※承認制のため、お待ちいただく場合がございます）</span>
                  </p>
                  <p className="text-xs text-neutral-400 flex items-start gap-1.5">
                    <span className="text-teal-500 font-bold">2.</span>
                    <span>承認後、画面右側の「Studio」欄にステップごとのマニュアルが格納されています。</span>
                  </p>
                  <p className="text-xs text-neutral-400 flex items-start gap-1.5">
                    <span className="text-teal-500 font-bold">3.</span>
                    <span>マニュアルを読んでも分からない点は、AIへ直接質問することで即座に解決策を提示します。</span>
                  </p>
                </div>
                
                <a 
                  href="https://notebooklm.google.com/notebook/b6cb1303-04fa-4831-b8d4-cd806c57d239?authuser=1"
                  target="_blank" rel="noreferrer"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  マニュアルを開く
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden flex bg-neutral-900/80 backdrop-blur-xl border-t border-white/5 pb-safe z-50">
        <button
          onClick={() => handleTabChange("search")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
            activeTab === "search" ? "text-teal-400" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-bold">患者</span>
        </button>
        <button
          onClick={() => handleTabChange("input")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
            activeTab === "input" ? "text-teal-400" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Mic className="w-6 h-6" />
          <span className="text-[10px] font-bold">カルテ</span>
        </button>
        <button
          onClick={() => handleTabChange("qr")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
            activeTab === "qr" ? "text-teal-400" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Camera className="w-6 h-6" />
          <span className="text-[10px] font-bold">ワイヤレス</span>
        </button>
        <button
          onClick={() => handleTabChange("slide")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
            activeTab === "slide" ? "text-teal-400" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Presentation className="w-6 h-6" />
          <span className="text-[10px] font-bold">スライド生成</span>
        </button>
        <button
          onClick={() => handleTabChange("technician")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
            activeTab === "technician" ? "text-teal-400" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Clipboard className="w-6 h-6" />
          <span className="text-[10px] font-bold text-center leading-tight">技工<br/>指示書</span>
        </button>
        <button
          onClick={() => handleTabChange("settings")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
            activeTab === "settings" ? "text-teal-400" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold">設定</span>
        </button>
      </nav>
    </div>
  );
}
