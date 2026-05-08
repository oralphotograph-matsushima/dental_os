"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, FileDown, UploadCloud, RotateCw, FlipHorizontal, FlipVertical, Trash2, Maximize2, MoveRight, MoveLeft, RefreshCw, Circle, Droplet, Loader2 } from "lucide-react";
import pptxgen from "pptxgenjs";
import { getApproximateCoordinates } from "@/lib/dentalGridMap";

// --- Types ---
export type AnnotationType = 'implant' | 'arrow_mesial' | 'arrow_distal' | 'rotation' | 'caries' | 'bone_graft';

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number; // Percentage 0-100 relative to image container width
  y: number; // Percentage 0-100 relative to image container height
}

export interface ImageData {
  id: string;
  file: File;
  previewUrl: string;
  flipH: boolean;
  flipV: boolean;
  rotate: number;
  zoom?: number;
  annotations: Annotation[];
}

// --- Marker Icons ---
export const MarkerIcon = ({ type, className = "" }: { type: AnnotationType, className?: string }) => {
  switch (type) {
    case 'implant':
      return (
        <div className={`w-6 h-10 bg-gradient-to-b from-gray-300 to-gray-500 rounded-t-md rounded-b-xl border-2 border-gray-600 shadow-sm flex flex-col items-center justify-evenly ${className}`}>
           <div className="w-full h-px bg-gray-600"></div>
           <div className="w-full h-px bg-gray-600"></div>
           <div className="w-full h-px bg-gray-600"></div>
        </div>
      );
    case 'arrow_mesial': // Red arrow pointing left
      return <MoveLeft className={`text-red-500 stroke-[3] ${className}`} />;
    case 'arrow_distal': // Blue arrow pointing right
      return <MoveRight className={`text-blue-500 stroke-[3] ${className}`} />;
    case 'rotation': // Curved arrow
      return <RefreshCw className={`text-orange-500 stroke-[3] ${className}`} />;
    case 'caries': // Red circle outline
      return <Circle className={`text-red-600 stroke-[3] ${className}`} />;
    case 'bone_graft': // Semi-transparent teal blob
      return <Droplet className={`text-teal-500 fill-teal-500/50 stroke-[2] ${className}`} />;
  }
};

export default function TreatmentPlanner() {
  const [panoImage, setPanoImage] = useState<ImageData | null>(null);
  const [intraoralImages, setIntraoralImages] = useState<(ImageData | null)[]>(Array(9).fill(null));
  const [facialImages, setFacialImages] = useState<(ImageData | null)[]>(Array(3).fill(null));

  const [activeEditor, setActiveEditor] = useState<{
    category: 'pano' | 'intraoral' | 'facial';
    index: number;
    image: ImageData;
  } | null>(null);

  // File Inputs
  const handleFiles = (files: FileList | null, category: 'pano' | 'intraoral' | 'facial', index: number = 0) => {
    if (!files || files.length === 0) return;
    
    if (category === 'pano') {
      const file = files[0];
      setPanoImage({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
        flipH: false, flipV: false, rotate: 0, annotations: []
      });
    } else if (category === 'intraoral') {
      const newImages = [...intraoralImages];
      let fileIdx = 0;
      for (let i = index; i < 9 && fileIdx < files.length; i++) {
        if (!newImages[i]) {
          const file = files[fileIdx++];
          newImages[i] = {
            id: Math.random().toString(36).substring(7),
            file, previewUrl: URL.createObjectURL(file),
            flipH: false, flipV: false, rotate: 0, annotations: []
          };
        }
      }
      setIntraoralImages(newImages);
    } else if (category === 'facial') {
      const newImages = [...facialImages];
      let fileIdx = 0;
      for (let i = index; i < 3 && fileIdx < files.length; i++) {
        if (!newImages[i]) {
          const file = files[fileIdx++];
          newImages[i] = {
            id: Math.random().toString(36).substring(7),
            file, previewUrl: URL.createObjectURL(file),
            flipH: false, flipV: false, rotate: 0, annotations: []
          };
        }
      }
      setFacialImages(newImages);
    }
  };

  const openEditor = (category: 'pano' | 'intraoral' | 'facial', index: number, image: ImageData) => {
    setActiveEditor({ category, index, image });
  };

  const saveEditedImage = (updatedImage: ImageData) => {
    if (!activeEditor) return;
    if (activeEditor.category === 'pano') {
      setPanoImage(updatedImage);
    } else if (activeEditor.category === 'intraoral') {
      const newArr = [...intraoralImages];
      newArr[activeEditor.index] = updatedImage;
      setIntraoralImages(newArr);
    } else if (activeEditor.category === 'facial') {
      const newArr = [...facialImages];
      newArr[activeEditor.index] = updatedImage;
      setFacialImages(newArr);
    }
    setActiveEditor(null);
  };

  const generatePowerPoint = async () => {
    try {
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';

      // Function to add a slide with image and annotations
      const addAnnotatedSlide = (img: ImageData, title: string) => {
        const slide = pptx.addSlide();
        slide.addText(title, { x: 0.5, y: 0.5, fontSize: 18, color: '363636', bold: true });

        // Add base image (assuming 16:9 bounds for simplicity)
        // In a real app, we'd calculate aspect ratios exactly
        const imgX = 1;
        const imgY = 1.5;
        const imgW = 8;
        const imgH = 4.5;
        
        slide.addImage({ 
          data: img.previewUrl, 
          x: imgX, 
          y: imgY, 
          w: imgW, 
          h: imgH,
          sizing: { type: 'contain', w: imgW, h: imgH }
        });

        // Add Annotations as native PPT shapes
        img.annotations.forEach(a => {
          // Convert percentage (0-100) to inches relative to image bounds
          const x = imgX + (a.x / 100) * imgW;
          const y = imgY + (a.y / 100) * imgH;
          const size = 0.5; // default size

          switch (a.type) {
            case 'arrow_mesial':
              slide.addShape(pptx.ShapeType.leftArrow, { x: x - size/2, y: y - size/2, w: size, h: size, fill: { color: 'FF0000' } });
              break;
            case 'arrow_distal':
              slide.addShape(pptx.ShapeType.rightArrow, { x: x - size/2, y: y - size/2, w: size, h: size, fill: { color: '0000FF' } });
              break;
            case 'caries':
              slide.addShape(pptx.ShapeType.ellipse, { x: x - size/2, y: y - size/2, w: size, h: size, fill: { transparency: 100 }, line: { color: 'FF0000', width: 2 } });
              break;
            case 'bone_graft':
              slide.addShape(pptx.ShapeType.ellipse, { x: x - size, y: y - size, w: size*2, h: size*2, fill: { color: '008080', transparency: 50 } });
              break;
            case 'implant':
              // Using a cylinder shape to represent an implant
              slide.addShape(pptx.ShapeType.can, { x: x - 0.15, y: y - 0.3, w: 0.3, h: 0.6, fill: { color: 'A0A0A0' }, line: { color: '404040' } });
              break;
            case 'rotation':
              slide.addShape(pptx.ShapeType.curvedDownArrow, { x: x - size/2, y: y - size/2, w: size, h: size, fill: { color: 'FFA500' } });
              break;
          }
        });
      };

      if (panoImage) addAnnotatedSlide(panoImage, "パノラマX線");
      
      intraoralImages.forEach((img, i) => {
        if (img) addAnnotatedSlide(img, `口腔内写真 ${i + 1}`);
      });

      facialImages.forEach((img, i) => {
        if (img) addAnnotatedSlide(img, `顔貌写真 ${i + 1}`);
      });

      await pptx.writeFile({ fileName: `TreatmentPlan_${new Date().getTime()}.pptx` });
    } catch (err) {
      console.error(err);
      alert("PowerPointの生成中にエラーが発生しました。");
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 p-6 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="bg-teal-500/20 text-teal-400 p-2 rounded-xl">
              <Mic className="w-6 h-6" />
            </span>
            治療計画エディタ
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            パノラマ・口腔内写真にインプラントや矢印を配置し、診断用プレゼンテーションを作成します。
          </p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={generatePowerPoint} className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-900/20">
            <FileDown className="w-5 h-5" />
            PowerPoint出力
          </button>
        </div>
      </div>

      {/* Grid Layouts */}
      <div className="grid md:grid-cols-12 gap-8">
        
        {/* Main Pano & Intraoral */}
        <div className="col-span-12 md:col-span-9 space-y-8">
          
          {/* Pano */}
          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">パノラマX線</h3>
            <div className="w-full aspect-[21/9] bg-neutral-900 rounded-2xl border border-white/10 overflow-hidden relative group">
              {panoImage ? (
                <>
                  <img src={panoImage.previewUrl} className="w-full h-full object-contain" />
                  {/* Render Annotations Read-only */}
                  {panoImage.annotations.map(a => (
                    <div key={a.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" style={{ left: `${a.x}%`, top: `${a.y}%` }}>
                      <MarkerIcon type={a.type} className="w-8 h-8 md:w-12 md:h-12" />
                    </div>
                  ))}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button onClick={() => openEditor('pano', 0, panoImage)} className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold flex items-center gap-2">
                      <Maximize2 className="w-5 h-5" /> 編集・アノテーション
                    </button>
                  </div>
                </>
              ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-800 transition-colors">
                  <UploadCloud className="w-10 h-10 text-neutral-600 mb-2" />
                  <span className="text-sm text-neutral-500">クリックしてアップロード</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files, 'pano')} />
                </label>
              )}
            </div>
          </div>

          {/* Intraoral Grid 9 */}
          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">口腔内写真（9枚法）</h3>
            <div className="grid grid-cols-3 gap-2 p-4 bg-neutral-900 rounded-2xl border border-white/10">
              {intraoralImages.map((img, i) => (
                <div key={i} className="aspect-[4/3] bg-neutral-950 rounded-xl overflow-hidden relative group border border-white/5">
                  {img ? (
                    <>
                      <img src={img.previewUrl} className="w-full h-full object-cover" />
                      {img.annotations.map(a => (
                        <div key={a.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 drop-shadow-md" style={{ left: `${a.x}%`, top: `${a.y}%` }}>
                          <MarkerIcon type={a.type} className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                      ))}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => openEditor('intraoral', i, img)} className="p-3 bg-teal-500 hover:bg-teal-400 text-white rounded-full">
                          <Maximize2 className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors">
                      <UploadCloud className="w-6 h-6 text-neutral-700" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files, 'intraoral', i)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Sidebar Facial Images */}
        <div className="col-span-12 md:col-span-3 space-y-8">
          <div>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">顔貌写真</h3>
            <div className="flex flex-col gap-4 p-4 bg-neutral-900 rounded-2xl border border-white/10">
              {facialImages.map((img, i) => (
                <div key={i} className="aspect-[3/4] bg-neutral-950 rounded-xl overflow-hidden relative group border border-white/5">
                  {img ? (
                    <>
                      <img src={img.previewUrl} className="w-full h-full object-cover" />
                      {img.annotations.map(a => (
                        <div key={a.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 drop-shadow-md" style={{ left: `${a.x}%`, top: `${a.y}%` }}>
                          <MarkerIcon type={a.type} className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                      ))}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => openEditor('facial', i, img)} className="p-3 bg-teal-500 hover:bg-teal-400 text-white rounded-full">
                          <Maximize2 className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors">
                      <UploadCloud className="w-6 h-6 text-neutral-700" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files, 'facial', i)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Editor Modal */}
      {activeEditor && (
        <AnnotationEditor 
          initialImage={activeEditor.image} 
          onSave={saveEditedImage} 
          onClose={() => setActiveEditor(null)} 
        />
      )}
    </div>
  );
}

// --- Annotation Editor Modal Component ---
function AnnotationEditor({ initialImage, onSave, onClose }: { initialImage: ImageData, onSave: (img: ImageData) => void, onClose: () => void }) {
  const [image, setImage] = useState<ImageData>({ ...initialImage, annotations: [...initialImage.annotations] });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleAddMarker = (type: AnnotationType, x = 50, y = 50) => {
    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substring(7),
      type,
      x,
      y
    };
    setImage(prev => ({ ...prev, annotations: [...prev.annotations, newAnnotation] }));
  };

  const handleRemoveMarker = (id: string) => {
    setImage(prev => ({ ...prev, annotations: prev.annotations.filter(a => a.id !== id) }));
  };

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setImage(prev => ({
      ...prev,
      annotations: prev.annotations.map(a => a.id === draggingId ? { ...a, x, y } : a)
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingId(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col md:flex-row overflow-hidden border border-white/10 shadow-2xl">
        
        {/* Left Toolbar */}
        <div className="w-full md:w-64 bg-neutral-950 p-6 flex flex-col gap-6 overflow-y-auto border-r border-white/5">
          <h3 className="text-white font-bold">ツール</h3>
          
          <div className="space-y-3">
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">マーカー追加</p>
            <button onClick={() => handleAddMarker('implant')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="implant" className="w-6 h-6" /> インプラント
            </button>
            <button onClick={() => handleAddMarker('arrow_mesial')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="arrow_mesial" className="w-5 h-5" /> 近心移動
            </button>
            <button onClick={() => handleAddMarker('arrow_distal')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="arrow_distal" className="w-5 h-5" /> 遠心移動
            </button>
            <button onClick={() => handleAddMarker('rotation')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="rotation" className="w-5 h-5" /> 回転
            </button>
            <button onClick={() => handleAddMarker('caries')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="caries" className="w-5 h-5" /> 虫歯
            </button>
            <button onClick={() => handleAddMarker('bone_graft')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="bone_graft" className="w-5 h-5" /> 骨造成・歯周病
            </button>
          </div>

          <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
            <button 
              onClick={async () => {
                if (isRecording) {
                  mediaRecorderRef.current?.stop();
                } else {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mr = new MediaRecorder(stream);
                    audioChunksRef.current = [];
                    mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                    mr.onstop = async () => {
                      setIsRecording(false);
                      setIsAiProcessing(true);
                      stream.getTracks().forEach(t => t.stop());
                      
                      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                      const formData = new FormData();
                      formData.append("file", audioBlob, "recording.webm");
                      
                      try {
                        const trRes = await fetch("/api/transcribe", { method: "POST", body: formData });
                        const trData = await trRes.json();
                        if (trData.text) {
                          const aiRes = await fetch("/api/annotate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: trData.text })
                          });
                          const aiData = await aiRes.json();
                          if (aiData.actions) {
                            aiData.actions.forEach((action: any) => {
                              const coords = getApproximateCoordinates(action.region || "center");
                              handleAddMarker(action.type, coords.x, coords.y);
                            });
                          }
                        }
                      } catch (e) {
                        console.error(e);
                        alert("AI処理に失敗しました。");
                      } finally {
                        setIsAiProcessing(false);
                      }
                    };
                    mr.start();
                    setIsRecording(true);
                  } catch(e) {
                    alert("マイクの使用が許可されていません。");
                  }
                }
              }}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-colors ${
                isRecording 
                  ? "bg-red-500/20 text-red-500 border-red-500/30 animate-pulse" 
                  : isAiProcessing
                  ? "bg-neutral-800 text-neutral-400 border-white/10"
                  : "bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 border-teal-500/30"
              }`}
            >
              {isAiProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
              {isRecording ? "録音中 (タップで完了)" : isAiProcessing ? "AI解析中..." : "音声で配置 (AI)"}
            </button>
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-neutral-900 relative p-6 flex flex-col items-center justify-center">
          <div className="absolute top-6 right-6 z-10 flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-colors">
              キャンセル
            </button>
            <button onClick={() => onSave(image)} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold transition-colors shadow-lg shadow-teal-900/20">
              保存
            </button>
          </div>

          {/* Interactive Area */}
          <div 
            ref={canvasRef}
            className="w-full max-w-4xl max-h-[70vh] aspect-auto relative bg-black rounded-xl overflow-hidden border-2 border-dashed border-neutral-700 touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img 
              src={image.previewUrl} 
              className="w-full h-full object-contain pointer-events-none" 
              style={{
                transform: `rotate(${image.rotate}deg) scaleX(${image.flipH ? -1 : 1}) scaleY(${image.flipV ? -1 : 1})`,
              }}
            />

            {/* Draggable Annotations */}
            {image.annotations.map(a => (
              <div 
                key={a.id} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move drop-shadow-xl hover:scale-110 transition-transform active:scale-95 group"
                style={{ left: `${a.x}%`, top: `${a.y}%`, zIndex: draggingId === a.id ? 50 : 10 }}
                onPointerDown={(e) => handlePointerDown(e, a.id)}
              >
                <MarkerIcon type={a.type} className="w-10 h-10 md:w-16 md:h-16" />
                
                {/* Delete Button (shows on hover) */}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemoveMarker(a.id); }}
                  className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-neutral-500 mt-6 text-sm text-center">マーカーをドラッグ＆ドロップして位置を調整できます。</p>
        </div>
      </div>
    </div>
  );
}
