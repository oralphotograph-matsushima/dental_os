import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, UploadCloud, AlertCircle, CheckCircle2, Loader2, FileImage, 
  Trash2, Camera, Settings, Plus, Star, Calendar, User, Eye, Check, FileText 
} from 'lucide-react';

// 画像圧縮用のユーティリティ関数
const compressImage = (file: File, maxWidth = 1600, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return resolve(file);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

interface Evaluation {
  completedAt: string;
  afterShade: string;
  matchScore: number;
  comments: string;
  afterPhotos?: string[];
}

interface Order {
  id: string;
  createdAt: string;
  labName: string;
  labEmail: string;
  patientId: string;
  subject: string;
  shadeDetails: string;
  clinicName: string;
  clinicEmail?: string;
  shadePhotos?: string[];
  instructionPhoto?: string;
  status: 'pending' | 'completed';
  evaluation?: Evaluation;
}

export default function TechnicianOrder({ onGoToSettings }: { onGoToSettings?: () => void }) {
  // タブ切り替え
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // フォーム用ステート
  const [labName, setLabName] = useState('');
  const [labEmail, setLabEmail] = useState('');
  const [patientId, setPatientId] = useState('');
  const [subject, setSubject] = useState('');
  const [shadeDetails, setShadeDetails] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [shadePhotos, setShadePhotos] = useState<File[]>([]);
  const [shadePhotoPreviews, setShadePhotoPreviews] = useState<string[]>([]);
  const [instructionPhoto, setInstructionPhoto] = useState<File | null>(null);
  const [instructionPhotoPreview, setInstructionPhotoPreview] = useState<string | null>(null);

  // 送信中・ステータス表示用
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 履歴用ステート
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // シェード評価フォーム用ステート
  const [evalRating, setEvalRating] = useState(5);
  const [evalAfterShade, setEvalAfterShade] = useState('');
  const [evalComments, setEvalComments] = useState('');
  const [evalPhotos, setEvalPhotos] = useState<File[]>([]);
  const [evalPhotoPreviews, setEvalPhotoPreviews] = useState<string[]>([]);
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);

  // 技工所設定用
  const [presetLabs, setPresetLabs] = useState<{name: string, email: string}[]>([]);

  const shadeInputRef = useRef<HTMLInputElement>(null);
  const instructionInputRef = useRef<HTMLInputElement>(null);
  const evalPhotoInputRef = useRef<HTMLInputElement>(null);

  // データ初期ロード
  useEffect(() => {
    const fetchLabs = async () => {
      let loadedFromApi = false;
      try {
        const res = await fetch('/api/settings/labs');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setPresetLabs(data);
            loadedFromApi = true;
          }
        }
      } catch (e) {
        console.error("Failed to fetch labs:", e);
      }

      if (!loadedFromApi) {
        const localLabs = localStorage.getItem('dental_os_preset_labs');
        if (localLabs) {
          setPresetLabs(JSON.parse(localLabs));
        } else {
          setPresetLabs([
            { name: '〇〇デンタルラボ', email: 'info@example.com' },
            { name: '技工所ABC', email: 'order@abc-lab.example' }
          ]);
        }
      }
    };
    
    const fetchClinicSettings = async () => {
      let loadedFromApi = false;
      try {
        const res = await fetch('/api/settings/clinic');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (data.email) setClinicEmail(data.email);
            if (data.name) {
              setClinicName(data.name);
              localStorage.setItem('dental_os_clinic_name', data.name);
            }
            loadedFromApi = true;
          }
        }
      } catch (e) {
        console.error("Failed to fetch clinic settings:", e);
      }

      if (!loadedFromApi) {
        const localEmail = localStorage.getItem('dental_os_clinic_email');
        if (localEmail) setClinicEmail(localEmail);
        const savedClinicName = localStorage.getItem('dental_os_clinic_name');
        if (savedClinicName) setClinicName(savedClinicName);
      }
    };

    fetchLabs();
    fetchClinicSettings();
  }, []);

  // 履歴のロード
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/technician/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error("Failed to load technician orders:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const saveClinicSettings = async (updatedName: string, updatedEmail: string) => {
    try {
      let currentSettings = {};
      try {
        const getRes = await fetch('/api/settings/clinic');
        if (getRes.ok) currentSettings = await getRes.json();
      } catch(e){}

      await fetch('/api/settings/clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...currentSettings, 
          name: updatedName, 
          email: updatedEmail 
        })
      });
    } catch(e) {
      console.error("Failed to save clinic settings:", e);
    }
  };

  const handleClinicNameBlur = () => {
    localStorage.setItem('dental_os_clinic_name', clinicName);
    saveClinicSettings(clinicName, clinicEmail);
  };

  const handleClinicEmailBlur = () => {
    localStorage.setItem('dental_os_clinic_email', clinicEmail);
    saveClinicSettings(clinicName, clinicEmail);
  };

  // バリデーション状態の計算
  const isLabNameMissing = labName.trim() === '';
  const isLabEmailMissing = labEmail.trim() === '';
  const isPatientIdMissing = patientId.trim() === '';
  const isSubjectMissing = subject.trim() === '';
  const isShadeDetailsMissing = shadeDetails.trim() === '';
  const isShadePhotoMissing = shadePhotos.length === 0;
  const isInstructionPhotoMissing = instructionPhoto === null;
  const isClinicNameMissing = clinicName.trim() === '';

  const isFormValid = !isLabNameMissing && !isLabEmailMissing && !isSubjectMissing && !isShadeDetailsMissing && !isShadePhotoMissing && !isInstructionPhotoMissing && !isClinicNameMissing;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'shade' | 'instruction' | 'eval') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'shade') {
      const file = files[0];
      if (shadePhotos.length >= 4) {
        alert("シェード写真は最大4枚まで添付可能です。");
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setShadePhotos(prev => [...prev, file]);
      setShadePhotoPreviews(prev => [...prev, previewUrl]);
      if (shadeInputRef.current) shadeInputRef.current.value = '';
    } else if (type === 'instruction') {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setInstructionPhoto(file);
      setInstructionPhotoPreview(previewUrl);
    } else if (type === 'eval') {
      if (evalPhotos.length >= 4) {
        alert("写真は最大4枚まで添付可能です。");
        return;
      }
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setEvalPhotos(prev => [...prev, file]);
      setEvalPhotoPreviews(prev => [...prev, previewUrl]);
      if (evalPhotoInputRef.current) evalPhotoInputRef.current.value = '';
    }
  };

  const removeShadeFile = (index: number) => {
    setShadePhotos(prev => prev.filter((_, i) => i !== index));
    setShadePhotoPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeEvalPhotoFile = (index: number) => {
    setEvalPhotos(prev => prev.filter((_, i) => i !== index));
    setEvalPhotoPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeFile = (type: 'shade' | 'instruction' | 'eval') => {
    if (type === 'shade') {
      shadePhotoPreviews.forEach(url => URL.revokeObjectURL(url));
      setShadePhotos([]);
      setShadePhotoPreviews([]);
      if (shadeInputRef.current) shadeInputRef.current.value = '';
    } else if (type === 'instruction') {
      if (instructionPhotoPreview) URL.revokeObjectURL(instructionPhotoPreview);
      setInstructionPhoto(null);
      setInstructionPhotoPreview(null);
      if (instructionInputRef.current) instructionInputRef.current.value = '';
    } else if (type === 'eval') {
      evalPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
      setEvalPhotos([]);
      setEvalPhotoPreviews([]);
      if (evalPhotoInputRef.current) evalPhotoInputRef.current.value = '';
    }
  };

  // 発注書メール送信＆保存
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLabNameMissing || isLabEmailMissing || isSubjectMissing || isClinicNameMissing) {
      alert("技工所名、送信先メールアドレス、件名、クリニック名は必須です。入力内容を確認してください。");
      return;
    }

    if (isShadePhotoMissing || isInstructionPhotoMissing) {
      const confirmSend = window.confirm("写真（シェードまたは指示書）が添付されていません。\nこのまま写真を添付せずに送信してもよろしいですか？");
      if (!confirmSend) return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('labName', labName);
      formData.append('labEmail', labEmail);
      formData.append('patientId', patientId);
      formData.append('subject', subject);
      formData.append('shadeDetails', shadeDetails);
      formData.append('clinicName', clinicName);
      if (clinicEmail) formData.append('clinicEmail', clinicEmail);
      
      if (shadePhotos.length > 0) {
        for (let i = 0; i < shadePhotos.length; i++) {
          const compressedShade = await compressImage(shadePhotos[i]);
          formData.append('shadePhotos', compressedShade);
        }
      }
      if (instructionPhoto) {
        const compressedInstruction = await compressImage(instructionPhoto);
        formData.append('instructionPhoto', compressedInstruction);
      }

      const response = await fetch('/api/technician/send', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'メールの送信に失敗しました');
      }

      setSubmitStatus('success');
      // フォームをリセット
      setLabName('');
      setLabEmail('');
      setPatientId('');
      setSubject('');
      setShadeDetails('');
      removeFile('shade');
      removeFile('instruction');
      
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error: any) {
      console.error(error);
      setSubmitStatus('error');
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // シェード適合評価の送信
  const handleEvaluateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsSubmittingEval(true);
    try {
      const formData = new FormData();
      formData.append('orderId', selectedOrder.id);
      formData.append('matchScore', evalRating.toString());
      formData.append('afterShade', evalAfterShade);
      formData.append('comments', evalComments);

      if (evalPhotos.length > 0) {
        for (let i = 0; i < evalPhotos.length; i++) {
          const compressed = await compressImage(evalPhotos[i]);
          formData.append('afterPhotos', compressed);
        }
      }

      const res = await fetch('/api/technician/evaluate', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '評価の送信に失敗しました');
      }

      alert('評価データを保存し、技工所にフィードバックメールを送信しました！');
      
      // フォーム初期化と詳細閉じる
      setEvalRating(5);
      setEvalAfterShade('');
      setEvalComments('');
      removeFile('eval');
      setSelectedOrder(null);

      // リスト再読み込み
      loadHistory();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmittingEval(false);
    }
  };

  const handleLabSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lab = presetLabs.find(l => l.name === e.target.value);
    if (lab) {
      setLabName(lab.name);
      setLabEmail(lab.email);
    } else {
      setLabName('');
      setLabEmail('');
    }
  };

  // フィルタリングされたオーダー一覧
  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase();
    return (
      order.patientId?.toLowerCase().includes(query) ||
      order.labName?.toLowerCase().includes(query) ||
      order.subject?.toLowerCase().includes(query) ||
      order.shadeDetails?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      {/* タブナビゲーション */}
      <div className="flex border-b border-neutral-800 mb-8 gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all duration-200 ${
            activeTab === 'create' 
              ? 'border-teal-500 text-teal-400 bg-teal-500/5' 
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Send className="w-4 h-4" />
          指示書を作成・送信
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all duration-200 ${
            activeTab === 'history' 
              ? 'border-teal-500 text-teal-400 bg-teal-500/5' 
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          送信履歴とシェード評価
        </button>
      </div>

      {activeTab === 'create' ? (
        // ============================================
        // 1. 指示書作成・送信フォーム
        // ============================================
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Send className="w-6 h-6 text-teal-400" />
              技工指示書の送信
            </h2>
            <p className="text-neutral-400 mt-2 text-sm">
              技工所への発注と画像データを直接メールで送信します。送信履歴と臨床画像は自動的にアプリに保存され、セット後に適合評価メールを送ることができます。
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-teal-500/10 border border-teal-500/50 rounded-xl flex items-center gap-3 text-teal-400 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6" />
              <p className="font-bold">技工指示書の送信と履歴の保存が完了しました！</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">送信エラー</p>
                <p className="text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Step 1: 宛先情報 */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="bg-teal-500 text-black text-xs font-black px-2 py-1 rounded-md">STEP 1</span>
                宛先情報（技工所）
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex justify-between items-center text-neutral-300">
                    <span>よく送る技工所から選択</span>
                  </label>
                  <select 
                    onChange={handleLabSelect}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    <option value="">直接入力する...</option>
                    {presetLabs.map(lab => (
                      <option key={lab.name} value={lab.name}>{lab.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  {onGoToSettings ? (
                    <button
                      type="button"
                      onClick={onGoToSettings}
                      className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1 bg-teal-500/10 px-4 py-2.5 rounded-xl border border-teal-500/20 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      技工所の登録・編集へ
                    </button>
                  ) : (
                    <span className="text-xs text-neutral-400 pb-2.5">
                      ※技工所の登録・編集は「設定」タブで行えます。
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex justify-between items-center text-neutral-300">
                    <span>技工所名 <span className="text-red-400">*</span></span>
                    {isLabNameMissing && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>未入力</span>}
                  </label>
                  <input
                    type="text"
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    placeholder="例: 〇〇デンタルラボ"
                    className={`w-full bg-neutral-950 border ${isLabNameMissing ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500'} rounded-xl px-4 py-3 text-white focus:outline-none transition-colors`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex justify-between items-center text-neutral-300">
                    <span>送信先メールアドレス <span className="text-red-400">*</span></span>
                    {isLabEmailMissing && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>未入力</span>}
                  </label>
                  <input
                    type="email"
                    value={labEmail}
                    onChange={(e) => setLabEmail(e.target.value)}
                    placeholder="lab@example.com"
                    className={`w-full bg-neutral-950 border ${isLabEmailMissing ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500'} rounded-xl px-4 py-3 text-white focus:outline-none transition-colors`}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: 患者・指示内容 */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="bg-teal-500 text-black text-xs font-black px-2 py-1 rounded-md">STEP 2</span>
                件名・患者情報・指示内容
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex justify-between items-center text-neutral-300">
                    <span>メール件名 <span className="text-red-400">*</span></span>
                    {isSubjectMissing && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>未入力</span>}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="例: 〇〇歯科_12345_山田太郎_インレー"
                    className={`w-full bg-neutral-950 border ${isSubjectMissing ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500'} rounded-xl px-4 py-3 text-white focus:outline-none transition-colors`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 flex justify-between items-center text-neutral-300">
                    <span>患者ID / 氏名 <span className="text-red-400">*</span></span>
                    {isPatientIdMissing && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>未入力</span>}
                  </label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => {
                      setPatientId(e.target.value);
                      if (subject === '') {
                         setSubject(`〇〇歯科_${e.target.value}`);
                      }
                    }}
                    placeholder="例: 12345 ヤマダタロウ (カルテに合わせるためカタカナ推奨)"
                    className={`w-full bg-neutral-950 border ${isPatientIdMissing ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500'} rounded-xl px-4 py-3 text-white focus:outline-none transition-colors`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex justify-between items-center text-neutral-300">
                    <span>シェード・形態についての詳細指示 <span className="text-red-400">*</span></span>
                    {isShadeDetailsMissing && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>未入力</span>}
                  </label>
                  <textarea
                    value={shadeDetails}
                    onChange={(e) => setShadeDetails(e.target.value)}
                    placeholder="シェード、形態についての希望や注意点などを詳しく記載してください。※4枚以上の多数のシェード写真や動画を送る場合は、Google Drive等の共有フォルダリンクをこちらに貼り付けてください。"
                    rows={4}
                    className={`w-full bg-neutral-950 border ${isShadeDetailsMissing ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500'} rounded-xl px-4 py-3 text-white focus:outline-none transition-colors resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: 画像添付 */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="bg-teal-500 text-black text-xs font-black px-2 py-1 rounded-md">STEP 3</span>
                画像の添付
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 指示書画像 */}
                <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${isInstructionPhotoMissing ? 'border-red-500/50 bg-red-500/5' : 'border-neutral-700 bg-neutral-950/50'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <FileImage className="w-4 h-4 text-teal-400" />
                      手書き指示書の写真 <span className="text-neutral-500 text-xs font-normal">（任意）</span>
                    </h4>
                  </div>
                  
                  {!instructionPhotoPreview ? (
                    <button
                      type="button"
                      onClick={() => instructionInputRef.current?.click()}
                      className="w-full h-52 flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-teal-400 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <UploadCloud className="w-8 h-8" />
                      <span className="text-sm">クリックして指示書を撮影/アップロード</span>
                    </button>
                  ) : (
                    <div className="relative group h-52 w-full">
                      <img src={instructionPhotoPreview} alt="指示書プレビュー" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeFile('instruction')}
                        className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={instructionInputRef}
                    onChange={(e) => handleFileChange(e, 'instruction')}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* シェード写真 */}
                <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${isShadePhotoMissing ? 'border-red-500/50 bg-red-500/5' : 'border-neutral-700 bg-neutral-950/50'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Camera className="w-4 h-4 text-teal-400" />
                      シェード写真 <span className="text-teal-500 text-xs font-bold font-mono">({shadePhotos.length}/4枚)</span>
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 min-h-[208px]">
                    {shadePhotoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                        <img src={preview} alt={`シェード_${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeShadeFile(idx)}
                          className="absolute top-1 right-1 bg-black/70 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    
                    {shadePhotos.length < 4 && (
                      <button
                        type="button"
                        onClick={() => shadeInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-1 text-neutral-500 hover:text-teal-400 hover:bg-white/5 rounded-lg border border-dashed border-neutral-800 aspect-video transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-xs">写真を追加</span>
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={shadeInputRef}
                    onChange={(e) => handleFileChange(e, 'shade')}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* クリニック情報 */}
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-4">
              <h4 className="text-white font-bold mb-3 text-sm flex items-center gap-2">送信元クリニック情報</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex justify-between items-center text-neutral-400">
                    <span>クリニック名 <span className="text-red-400">*</span></span>
                    {isClinicNameMissing && <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>未入力</span>}
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    onBlur={handleClinicNameBlur}
                    placeholder="例: ○○歯科クリニック"
                    className={`w-full bg-neutral-950 border ${isClinicNameMissing ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500'} rounded-lg px-4 py-2 text-white focus:outline-none transition-colors`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-neutral-400">
                    医院控え・返信用CCアドレス
                  </label>
                  <input
                    type="email"
                    value={clinicEmail}
                    onChange={(e) => setClinicEmail(e.target.value)}
                    onBlur={handleClinicEmailBlur}
                    placeholder="clinic@example.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="pt-4">
              {!isFormValid && (
                <div className="mb-4 flex items-center gap-2 justify-center text-amber-500 text-sm font-bold bg-amber-500/10 py-3 rounded-xl border border-amber-500/20">
                  <AlertCircle className="w-5 h-5" />
                  未入力または画像未添付の項目があります（送信は可能です）
                </div>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                  !isSubmitting
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:scale-[1.02] shadow-xl shadow-teal-500/20'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    指示書メールを送信＆ローカル履歴に保存
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        // ============================================
        // 2. 送信履歴とシェード評価
        // ============================================
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 左側：履歴リスト (5/12カラム) */}
          <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                送信履歴
              </h3>
              <button 
                onClick={loadHistory}
                className="text-xs text-teal-400 hover:text-teal-300 font-bold"
              >
                同期/更新
              </button>
            </div>

            {/* 検索入力 */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="患者ID、技工所名、指示内容で検索..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
            />

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12 gap-2 text-neutral-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>履歴を読み込み中...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-sm">
                履歴が見つかりませんでした。
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredOrders.map(order => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      setSelectedOrder(order);
                      // 評価ステートの初期化
                      setEvalRating(order.evaluation?.matchScore || 5);
                      setEvalAfterShade(order.evaluation?.afterShade || '');
                      setEvalComments(order.evaluation?.comments || '');
                      removeFile('eval');
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedOrder?.id === order.id
                        ? 'bg-teal-500/10 border-teal-500 text-white'
                        : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'completed'
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {order.status === 'completed' ? 'セット完了' : '製作中'}
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm line-clamp-1">{order.subject}</div>
                    <div className="text-xs text-neutral-400 mt-2 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-teal-400" />
                        ID: {order.patientId}
                      </span>
                      <span>To: {order.labName}</span>
                    </div>

                    {order.evaluation && (
                      <div className="mt-2.5 pt-2.5 border-t border-neutral-800 flex items-center gap-1.5 text-xs text-teal-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-teal-400" />
                        <span>シェード評価: {order.evaluation.matchScore}点 ({order.evaluation.afterShade})</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右側：詳細表示 ＆ 評価登録フォーム (7/12カラム) */}
          <div className="lg:col-span-7">
            {!selectedOrder ? (
              <div className="h-[400px] bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center text-neutral-500 p-8 text-center">
                <FileText className="w-12 h-12 text-neutral-700 mb-3" />
                <p className="font-bold text-sm">指示書の詳細</p>
                <p className="text-xs mt-1">左側のリストから、詳細を表示したい指示書を選択してください。</p>
              </div>
            ) : (
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-6">
                
                {/* ヘッダー情報 */}
                <div className="border-b border-neutral-800 pb-4">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      送信日: {new Date(selectedOrder.createdAt).toLocaleString()}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      selectedOrder.status === 'completed'
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {selectedOrder.status === 'completed' ? 'セット完了（適合評価送信済）' : '製作中（未セット）'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedOrder.subject}</h3>
                </div>

                {/* 基本情報 */}
                <div className="grid grid-cols-2 gap-4 text-sm bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
                  <div>
                    <span className="text-neutral-500 block text-xs">患者ID/氏名</span>
                    <span className="text-white font-bold">{selectedOrder.patientId}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-xs">発注先技工所</span>
                    <span className="text-white font-bold">{selectedOrder.labName} ({selectedOrder.labEmail})</span>
                  </div>
                </div>

                {/* 指示内容詳細 */}
                <div>
                  <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-1.5">
                    <FileImage className="w-4 h-4 text-teal-400" />
                    発注指示の詳細
                  </h4>
                  <p className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl text-neutral-300 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedOrder.shadeDetails}
                  </p>
                </div>

                {/* 添付写真 */}
                {((selectedOrder.shadePhotos && selectedOrder.shadePhotos.length > 0) || selectedOrder.instructionPhoto) && (
                  <div>
                    <h4 className="text-white font-bold text-sm mb-3">添付写真</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedOrder.instructionPhoto && (
                        <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                          <img 
                            src={`/api/technician/orders/photos?orderId=${selectedOrder.id}&filename=${selectedOrder.instructionPhoto}`} 
                            alt="指示書" 
                            className="w-full h-full object-cover" 
                          />
                          <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] px-1.5 py-0.5 rounded text-neutral-300">
                            手書き指示書
                          </span>
                        </div>
                      )}
                      
                      {selectedOrder.shadePhotos?.map((photo, i) => (
                        <div key={i} className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                          <img 
                            src={`/api/technician/orders/photos?orderId=${selectedOrder.id}&filename=${photo}`} 
                            alt={`シェード_${i + 1}`} 
                            className="w-full h-full object-cover" 
                          />
                          <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] px-1.5 py-0.5 rounded text-neutral-300">
                            シェード写真 {i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 評価登録 or 評価結果表示 */}
                {selectedOrder.status === 'completed' && selectedOrder.evaluation ? (
                  // ステータス＝完了：評価結果の表示
                  <div className="border-t border-neutral-800 pt-6 space-y-4">
                    <h4 className="text-teal-400 font-bold text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5" />
                      シェード適合再評価の結果（送信済）
                    </h4>
                    
                    <div className="bg-teal-500/5 border border-teal-500/20 p-4 rounded-xl space-y-3">
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-neutral-500 block text-xs">適合スコア</span>
                          <div className="flex items-center gap-1 text-teal-400 font-bold mt-0.5">
                            {'★'.repeat(selectedOrder.evaluation.matchScore)}
                            {'☆'.repeat(5 - selectedOrder.evaluation.matchScore)}
                            <span className="text-xs ml-1">({selectedOrder.evaluation.matchScore}/5点)</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-500 block text-xs">最終決定シェード</span>
                          <span className="text-white font-bold block mt-0.5">{selectedOrder.evaluation.afterShade || '未指定'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-neutral-500 block text-xs">評価メモ・臨床所見</span>
                        <p className="text-neutral-300 text-sm whitespace-pre-wrap mt-1 leading-relaxed">
                          {selectedOrder.evaluation.comments || 'コメントなし'}
                        </p>
                      </div>

                      {selectedOrder.evaluation.afterPhotos && selectedOrder.evaluation.afterPhotos.length > 0 && (
                        <div>
                          <span className="text-neutral-500 block text-xs mb-2">セット後の口腔内写真</span>
                          <div className="grid grid-cols-3 gap-3">
                            {selectedOrder.evaluation.afterPhotos.map((photo, i) => (
                              <div key={i} className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                                <img 
                                  src={`/api/technician/orders/photos?orderId=${selectedOrder.id}&filename=${photo}`} 
                                  alt={`セット後_${i + 1}`} 
                                  className="w-full h-full object-cover" 
                                />
                                <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] px-1.5 py-0.5 rounded text-neutral-300">
                                  セット後 {i + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // ステータス＝製作中：評価登録フォーム
                  <div className="border-t border-neutral-800 pt-6">
                    <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-1.5">
                      <Star className="w-5 h-5 text-amber-400" />
                      シェード適合の再評価（セット時に送信）
                    </h4>

                    <form onSubmit={handleEvaluateSubmit} className="space-y-4">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 適合スコア */}
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1.5">
                            シェード適合度（マッチング精度）
                          </label>
                          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setEvalRating(star)}
                                className="text-neutral-500 hover:scale-110 transition-transform focus:outline-none"
                              >
                                <Star 
                                  className={`w-6 h-6 ${
                                    star <= evalRating 
                                      ? 'fill-amber-400 text-amber-400' 
                                      : 'text-neutral-700'
                                  }`} 
                                />
                              </button>
                            ))}
                            <span className="text-xs text-neutral-400 ml-2 font-bold">{evalRating}/5点</span>
                          </div>
                        </div>

                        {/* アフターシェード */}
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1.5">
                            最終適合シェード（実際に入った色）
                          </label>
                          <input
                            type="text"
                            value={evalAfterShade}
                            onChange={(e) => setEvalAfterShade(e.target.value)}
                            placeholder="例: A2, A3, NW0.5 など"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                          />
                        </div>
                      </div>

                      {/* コメント */}
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1.5">
                          臨床所見・評価のメモ
                        </label>
                        <textarea
                          value={evalComments}
                          onChange={(e) => setEvalComments(e.target.value)}
                          placeholder="色調（彩度、明度、透明感）やマージンの適合、技工士へのメッセージを記載してください。"
                          rows={3}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 transition-colors resize-none text-sm"
                        />
                      </div>

                      {/* 評価用写真添付 */}
                      <div>
                        <label className="block text-xs text-neutral-400 mb-2">
                          セット後の口腔内写真添付（任意、4枚まで）
                        </label>
                        
                        <div className="grid grid-cols-4 gap-3">
                          {evalPhotoPreviews.map((preview, idx) => (
                            <div key={idx} className="relative group aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                              <img src={preview} alt={`セット後_${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeEvalPhotoFile(idx)}
                                className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          
                          {evalPhotos.length < 4 && (
                            <button
                              type="button"
                              onClick={() => evalPhotoInputRef.current?.click()}
                              className="flex flex-col items-center justify-center gap-1 text-neutral-500 hover:text-teal-400 hover:bg-white/5 rounded-lg border border-dashed border-neutral-850 aspect-video transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="text-[10px]">写真を追加</span>
                            </button>
                          )}
                        </div>

                        <input
                          type="file"
                          ref={evalPhotoInputRef}
                          onChange={(e) => handleFileChange(e, 'eval')}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>

                      {/* 決定ボタン */}
                      <button
                        type="submit"
                        disabled={isSubmittingEval}
                        className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                          !isSubmittingEval
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-[1.01] shadow-lg shadow-amber-500/10'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        {isSubmittingEval ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            処理中...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            セット完了（適合評価を保存し技工所に送る）
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
