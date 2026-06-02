import React, { useState, useRef, useEffect } from 'react';
import { Send, UploadCloud, AlertCircle, CheckCircle2, Loader2, FileImage, Trash2, Camera, Settings, Plus } from 'lucide-react';

// 画像圧縮用のユーティリティ関数
const compressImage = (file: File, maxWidth = 1600, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    // 画像でない場合はそのまま返す
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

        // 最大幅を超えている場合はアスペクト比を維持して縮小
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file); // コンテキストが取得できない場合はフォールバック
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file); // 失敗時は元のファイルを返す
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

export default function TechnicianOrder() {
  const [labName, setLabName] = useState('');
  const [labEmail, setLabEmail] = useState('');
  const [patientId, setPatientId] = useState('');
  const [subject, setSubject] = useState(''); // 追加: 件名
  const [shadeDetails, setShadeDetails] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  
  const [shadePhotos, setShadePhotos] = useState<File[]>([]);
  const [shadePhotoPreviews, setShadePhotoPreviews] = useState<string[]>([]);
  
  const [instructionPhoto, setInstructionPhoto] = useState<File | null>(null);
  const [instructionPhotoPreview, setInstructionPhotoPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 技工所設定用ステート
  const [presetLabs, setPresetLabs] = useState<{name: string, email: string}[]>([]);
  const [showLabSettings, setShowLabSettings] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabEmail, setNewLabEmail] = useState('');

  const shadeInputRef = useRef<HTMLInputElement>(null);
  const instructionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // サーバーから技工所設定を取得（複数端末で同期）
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

      // APIから取得できなかった場合（Vercelウェブ版など）はローカルストレージから読み込む
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
    
    // サーバーから医院情報を取得（複数端末で同期）
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

  const saveLab = async () => {
    if(!newLabName || !newLabEmail) return;
    const updated = [...presetLabs, { name: newLabName, email: newLabEmail }];
    setPresetLabs(updated);
    setNewLabName('');
    setNewLabEmail('');
    
    localStorage.setItem('dental_os_preset_labs', JSON.stringify(updated));
    
    // サーバーに保存
    try {
      await fetch('/api/settings/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch(e) { console.error(e); }
  };

  const removeLab = async (index: number) => {
    const updated = presetLabs.filter((_, i) => i !== index);
    setPresetLabs(updated);
    
    localStorage.setItem('dental_os_preset_labs', JSON.stringify(updated));
    
    // サーバーに保存
    try {
      await fetch('/api/settings/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch(e) { console.error(e); }
  };

  // バリデーション状態の計算（新人がパッと見て「穴が空いている」と気づくためのロジック）
  const isLabNameMissing = labName.trim() === '';
  const isLabEmailMissing = labEmail.trim() === '';
  const isPatientIdMissing = patientId.trim() === '';
  const isSubjectMissing = subject.trim() === '';
  const isShadeDetailsMissing = shadeDetails.trim() === '';
  const isShadePhotoMissing = shadePhotos.length === 0;
  const isInstructionPhotoMissing = instructionPhoto === null;
  const isClinicNameMissing = clinicName.trim() === '';

  // isFormValidはUIの警告表示用として残すが、送信ボタンのdisable条件からは外す
  const isFormValid = !isLabNameMissing && !isLabEmailMissing && !isSubjectMissing && !isShadeDetailsMissing && !isShadePhotoMissing && !isInstructionPhotoMissing && !isClinicNameMissing;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'shade' | 'instruction') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    if (type === 'shade') {
      if (shadePhotos.length >= 4) {
        alert("シェード写真は最大4枚まで添付可能です。");
        return;
      }
      setShadePhotos(prev => [...prev, file]);
      setShadePhotoPreviews(prev => [...prev, previewUrl]);
      if (shadeInputRef.current) shadeInputRef.current.value = '';
    } else {
      setInstructionPhoto(file);
      setInstructionPhotoPreview(previewUrl);
    }
  };

  const removeShadeFile = (index: number) => {
    setShadePhotos(prev => prev.filter((_, i) => i !== index));
    setShadePhotoPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeFile = (type: 'shade' | 'instruction') => {
    if (type === 'shade') {
      shadePhotoPreviews.forEach(url => URL.revokeObjectURL(url));
      setShadePhotos([]);
      setShadePhotoPreviews([]);
      if (shadeInputRef.current) shadeInputRef.current.value = '';
    } else {
      if (instructionPhotoPreview) URL.revokeObjectURL(instructionPhotoPreview);
      setInstructionPhoto(null);
      setInstructionPhotoPreview(null);
      if (instructionInputRef.current) instructionInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 最低限の必須チェック（宛先と件名）
    if (isLabNameMissing || isLabEmailMissing || isSubjectMissing || isClinicNameMissing) {
      alert("技工所名、送信先メールアドレス、件名、クリニック名は必須です。入力内容を確認してください。");
      return;
    }

    // 写真がない場合の確認ダイアログ
    if (isShadePhotoMissing || isInstructionPhotoMissing) {
      const confirmSend = window.confirm("写真（シェードまたは指示書）が添付されていません。\nこのまま写真を添付せずに送信してもよろしいですか？");
      if (!confirmSend) {
        return; // キャンセルした場合は送信しない
      }
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
      
      // 送信前に画像を圧縮
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
      // 成功したらフォームをリセット
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

  return (
    <div className="w-full max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Send className="w-6 h-6 text-teal-400" />
          技工指示書の送信
        </h2>
        <p className="text-neutral-400 mt-2 text-sm">
          技工所への発注と画像データを直接メールで送信します。送信の控えは自動的に医院のアドレスにもCC送信されます。
        </p>
      </div>

      {submitStatus === 'success' && (
        <div className="mb-6 p-4 bg-teal-500/10 border border-teal-500/50 rounded-xl flex items-center gap-3 text-teal-400 animate-in fade-in">
          <CheckCircle2 className="w-6 h-6" />
          <p className="font-bold">技工指示書の送信が完了しました！</p>
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
              <button
                type="button"
                onClick={() => setShowLabSettings(!showLabSettings)}
                className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1 bg-teal-500/10 px-4 py-2.5 rounded-xl border border-teal-500/20 transition-colors"
              >
                <Settings className="w-4 h-4" />
                技工所の登録・編集
              </button>
            </div>
          </div>

          {/* 技工所設定パネル */}
          {showLabSettings && (
            <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-2">
              <h4 className="text-white font-bold mb-3">登録済みの技工所（ローカル保存）</h4>
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {presetLabs.map((lab, i) => (
                  <div key={i} className="flex items-center justify-between bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800">
                    <div>
                      <span className="text-white font-bold text-sm block">{lab.name}</span>
                      <span className="text-neutral-400 text-xs">{lab.email}</span>
                    </div>
                    <button type="button" onClick={() => removeLab(i)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {presetLabs.length === 0 && <p className="text-xs text-neutral-500">登録されていません</p>}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="技工所名" 
                  value={newLabName} 
                  onChange={e => setNewLabName(e.target.value)} 
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white"
                />
                <input 
                  type="email" 
                  placeholder="メールアドレス" 
                  value={newLabEmail} 
                  onChange={e => setNewLabEmail(e.target.value)} 
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button type="button" onClick={saveLab} className="bg-teal-500 hover:bg-teal-400 text-black font-bold px-3 py-2 rounded-lg text-sm flex items-center gap-1 transition-colors">
                  <Plus className="w-4 h-4" /> 追加
                </button>
              </div>
            </div>
          )}

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
                <span>患者ID / 氏名</span>
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  // 件名が空の場合、自動的に補完する工夫（オプション）
                  if (subject === '') {
                     setSubject(`〇〇歯科_${e.target.value}`);
                  }
                }}
                placeholder="例: 12345 山田太郎"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
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
                placeholder="シェード、形態についての希望や注意点などを詳しく記載してください。※4枚を超える多数の写真や動画を送る場合は、Google Drive等の共有フォルダリンクをこちらに貼り付けてください。"
                rows={4}
                className={`w-full bg-neutral-950 border ${isShadeDetailsMissing ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-teal-500'} rounded-xl px-4 py-3 text-white focus:outline-none transition-colors resize-none`}
              />
              <p className="text-[11px] text-teal-400 mt-1.5 flex items-center gap-1 bg-teal-500/5 p-2 rounded-lg border border-teal-500/10">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span><strong>💡 4枚を超える大量の写真を送る場合</strong>: Google Drive等の共有フォルダリンクを上記の指示内容欄に貼り付けていただくとスムーズです。</span>
              </p>
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
          <p className="text-sm text-neutral-400 mb-4">送信漏れを防ぐため、写真は指示書および必要枚数のシェード写真（最大4枚）を添付してください。</p>
          <p className="text-xs text-teal-400 mb-6 bg-teal-500/5 p-2.5 rounded-lg border border-teal-500/10 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span><strong>💡 5枚以上の大量のシェード画像がある場合</strong>: Google Driveなどのクラウド共有フォルダリンクを『STEP 2：指示内容詳細』の欄にご入力ください。</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 指示書画像 (左側に配置) */}
            <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${isInstructionPhotoMissing ? 'border-red-500/50 bg-red-500/5' : 'border-neutral-700 bg-neutral-950/50'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-teal-400" />
                  手書き指示書の写真 <span className="text-neutral-500 text-xs font-normal">（任意）</span>
                </h4>
                {isInstructionPhotoMissing && <span className="text-xs text-amber-500 flex items-center gap-1 font-bold"><AlertCircle className="w-3 h-3"/>添付なし</span>}
              </div>
              
              {!instructionPhotoPreview ? (
                <button
                  type="button"
                  onClick={() => instructionInputRef.current?.click()}
                  className="w-full h-56 flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-teal-400 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <UploadCloud className="w-8 h-8" />
                  <span className="text-sm">クリックして指示書をスキャン/撮影</span>
                </button>
              ) : (
                <div className="relative group h-56 w-full">
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

            {/* シェード写真 (右側に配置、4枚まで添付可能) */}
            <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${isShadePhotoMissing ? 'border-red-500/50 bg-red-500/5' : 'border-neutral-700 bg-neutral-950/50'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal-400" />
                  シェード写真 <span className="text-teal-500 text-xs font-bold font-mono">({shadePhotos.length}/4枚)</span>
                </h4>
                {isShadePhotoMissing && <span className="text-xs text-amber-500 flex items-center gap-1 font-bold"><AlertCircle className="w-3 h-3"/>添付なし</span>}
              </div>
              
              <div className="grid grid-cols-2 gap-3 min-h-[224px]">
                {shadePhotoPreviews.map((preview, idx) => (
                  <div key={idx} className="relative group aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                    <img src={preview} alt={`シェード_${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeShadeFile(idx)}
                      className="absolute top-1 right-1 bg-black/70 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                      title="削除"
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
                    <span className="text-xs">シェード追加</span>
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

        {/* 送信元（クリニック）設定 */}
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
              赤枠の未入力項目や、写真が添付されていない項目があります（送信は可能です）
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
                上記内容で技工所に発注メールを送信する
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
