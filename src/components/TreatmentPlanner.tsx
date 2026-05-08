"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, FileDown, UploadCloud, RotateCw, FlipHorizontal, FlipVertical, Trash2, Maximize2, MoveRight, MoveLeft, RefreshCw, Circle, Droplet, Loader2 } from "lucide-react";
import pptxgen from "pptxgenjs";
import { getApproximateCoordinates } from "@/lib/dentalGridMap";

// --- Types ---
export type AnnotationType = 'implant' | 'arrow_mesial' | 'arrow_distal' | 'rotation' | 'caries' | 'bone_graft' | 'polygon';

export interface Point { x: number; y: number; }

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number; // Percentage 0-100 relative to image container width
  y: number; // Percentage 0-100 relative to image container height
  size?: number; // Scaling factor (default 1.0)
  rotate?: number; // Rotation in degrees (default 0)
  points?: Point[]; // For polygons
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
export const MarkerIcon = ({ type, className = "", points, isStatic = false }: { type: AnnotationType, className?: string, points?: Point[], isStatic?: boolean }) => {
  switch (type) {
    case 'implant':
      return (
        <svg viewBox="0 0 60 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} drop-shadow-md`} style={isStatic ? {} : { width: '100%', height: '100%' }}>
          {/* Collar */}
          <rect x="15" y="10" width="30" height="20" fill="url(#metalGrad)" stroke="#374151" strokeWidth="1.5" />
          <rect x="10" y="30" width="40" height="15" fill="url(#metalGrad)" stroke="#374151" strokeWidth="1.5" rx="2" />
          {/* Body */}
          <path d="M15 45 L45 45 L40 160 Q30 180 20 160 Z" fill="url(#metalGrad)" stroke="#374151" strokeWidth="1.5" />
          {/* Threads */}
          <path d="M14 60 L46 65 M13 75 L47 80 M12 90 L48 95 M12 105 L48 110 M14 120 L46 125 M15 135 L45 140 M17 150 L43 155" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
          <defs>
            <linearGradient id="metalGrad" x1="0" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9CA3AF" />
              <stop offset="30%" stopColor="#F3F4F6" />
              <stop offset="50%" stopColor="#D1D5DB" />
              <stop offset="80%" stopColor="#6B7280" />
              <stop offset="100%" stopColor="#4B5563" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'arrow_mesial': // Red arrow pointing left
      return <MoveLeft className={`text-red-400/80 stroke-[1.5] ${className}`} />;
    case 'arrow_distal': // Blue arrow pointing right
      return <MoveRight className={`text-blue-400/80 stroke-[1.5] ${className}`} />;
    case 'rotation': // Curved arrow
      return <RefreshCw className={`text-orange-400/80 stroke-[1.5] ${className}`} />;
    case 'caries': // Red circle outline
      return <Circle className={`text-red-500/80 stroke-[1.5] ${className}`} style={isStatic ? {} : { width: '100%', height: '100%' }} />;
    case 'bone_graft': // Semi-transparent teal blob
      return <Droplet className={`text-teal-500 fill-teal-500/50 stroke-[2] ${className}`} style={isStatic ? {} : { width: '100%', height: '100%' }} />;
    case 'polygon': // For custom drawn shapes
      if (isStatic) return <span className={`text-teal-500 ${className}`}>⬡</span>;
      if (!points || points.length === 0) return null;
      // Convert points to SVG polygon string
      const ptsString = points.map(p => `${p.x},${p.y}`).join(' ');
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <polygon points={ptsString} className="fill-teal-500/40 stroke-teal-500 stroke-2" />
        </svg>
      );
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
          const size = 0.5 * (a.size || 1.0);
          const rot = a.rotate || 0;

          switch (a.type) {
            case 'arrow_mesial':
              slide.addShape(pptx.ShapeType.leftArrow, { x: x - size/2, y: y - size/2, w: size, h: size, rotate: rot, fill: { color: 'FF0000' } });
              break;
            case 'arrow_distal':
              slide.addShape(pptx.ShapeType.rightArrow, { x: x - size/2, y: y - size/2, w: size, h: size, rotate: rot, fill: { color: '0000FF' } });
              break;
            case 'caries':
              slide.addShape(pptx.ShapeType.ellipse, { x: x - size/2, y: y - size/2, w: size, h: size, rotate: rot, fill: { transparency: 100 }, line: { color: 'FF0000', width: 2 } });
              break;
            case 'bone_graft':
              slide.addShape(pptx.ShapeType.ellipse, { x: x - size, y: y - size, w: size*2, h: size*2, rotate: rot, fill: { color: '008080', transparency: 50 } });
              break;
            case 'implant':
              // Using a cylinder shape to represent an implant
              slide.addShape(pptx.ShapeType.can, { x: x - 0.15 * (a.size || 1), y: y - 0.3 * (a.size || 1), w: 0.3 * (a.size || 1), h: 0.6 * (a.size || 1), rotate: rot, fill: { color: 'A0A0A0' }, line: { color: '404040' } });
              break;
            case 'rotation':
              slide.addShape(pptx.ShapeType.curvedDownArrow, { x: x - size/2, y: y - size/2, w: size, h: size, rotate: rot, fill: { color: 'FFA500' } });
              break;
            case 'polygon':
              // Native PPTX freeform polygons are complex, so we represent the area roughly as a semitransparent rectangle for now.
              slide.addShape(pptx.ShapeType.rect, { x: x - size, y: y - size, w: size*2, h: size*2, rotate: rot, fill: { color: '008080', transparency: 70 } });
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleAddMarker = (type: AnnotationType, x = 50, y = 50) => {
    setIsDrawingPolygon(false);
    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substring(7),
      type,
      x,
      y,
      size: 1.0,
      rotate: 0
    };
    setImage(prev => ({ ...prev, annotations: [...prev.annotations, newAnnotation] }));
    setSelectedId(newAnnotation.id);
  };

  const handleUpdateSize = (val: number) => {
    if (!selectedId) return;
    setImage(prev => ({
      ...prev,
      annotations: prev.annotations.map(a => a.id === selectedId ? { ...a, size: val } : a)
    }));
  };

  const handleUpdateRotate = (val: number) => {
    if (!selectedId) return;
    setImage(prev => ({
      ...prev,
      annotations: prev.annotations.map(a => a.id === selectedId ? { ...a, rotate: val } : a)
    }));
  };

  const finishDrawingPolygon = () => {
    if (drawingPoints.length > 2) {
      const newAnnotation: Annotation = {
        id: Math.random().toString(36).substring(7),
        type: 'polygon',
        x: 0, y: 0, // Absolute positioning for polygon is tricky, we'll store relative to 0,0
        points: drawingPoints
      };
      setImage(prev => ({ ...prev, annotations: [...prev.annotations, newAnnotation] }));
    }
    setIsDrawingPolygon(false);
    setDrawingPoints([]);
  };

  const handleCanvasClick = (e: React.PointerEvent) => {
    if (!isDrawingPolygon || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDrawingPoints(prev => [...prev, { x: px, y: py }]);
  };

  const handleRemoveMarker = (id: string) => {
    setImage(prev => ({ ...prev, annotations: prev.annotations.filter(a => a.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (isDrawingPolygon) return;
    setDraggingId(id);
    setSelectedId(id);
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
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore if it fails to release
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col md:flex-row overflow-hidden border border-white/10 shadow-2xl">
        
        {/* Left Toolbar */}
        <div className="w-full md:w-64 bg-neutral-950 p-6 flex flex-col gap-6 overflow-y-auto border-r border-white/5">
          <h3 className="text-white font-bold">ツール</h3>
          
          <div className="space-y-3">
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">マーカー追加</p>
            <button onClick={() => handleAddMarker('implant')} className={`w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5`}>
              <MarkerIcon type="implant" className="w-4 h-6" isStatic /> インプラント
            </button>
            <button onClick={() => handleAddMarker('arrow_mesial')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="arrow_mesial" className="w-5 h-5" isStatic /> 近心移動
            </button>
            <button onClick={() => handleAddMarker('arrow_distal')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="arrow_distal" className="w-5 h-5" isStatic /> 遠心移動
            </button>
            <button onClick={() => handleAddMarker('rotation')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="rotation" className="w-5 h-5" isStatic /> 回転
            </button>
            <button onClick={() => handleAddMarker('caries')} className="w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5">
              <MarkerIcon type="caries" className="w-5 h-5" isStatic /> 虫歯
            </button>
            <button 
              onClick={() => {
                if (isDrawingPolygon) { finishDrawingPolygon(); }
                else { setIsDrawingPolygon(true); setSelectedId(null); }
              }} 
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-white transition-colors border border-white/5 ${isDrawingPolygon ? "bg-teal-600 border-teal-500 animate-pulse" : "bg-neutral-900 hover:bg-neutral-800"}`}
            >
              <MarkerIcon type="polygon" className="w-5 h-5" isStatic /> {isDrawingPolygon ? "描画を完了する" : "エリア自由描画"}
            </button>
          </div>
          
          {/* Size & Rotation Sliders for Selected Item */}
          {selectedId && !isDrawingPolygon && (
            <div className="space-y-4 p-4 bg-neutral-800/50 rounded-xl border border-white/5">
              <div className="space-y-2">
                <p className="text-xs text-neutral-400 font-bold">サイズ調整</p>
                <input 
                  type="range" min="0.3" max="3" step="0.1" 
                  value={image.annotations.find(a => a.id === selectedId)?.size || 1.0}
                  onChange={(e) => handleUpdateSize(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-neutral-400 font-bold">回転</p>
                <input 
                  type="range" min="0" max="360" step="1" 
                  value={image.annotations.find(a => a.id === selectedId)?.rotate || 0}
                  onChange={(e) => handleUpdateRotate(parseInt(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>
          )}

          <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
            <button 
              onClick={async () => {
                if (isRecording) {
                  mediaRecorderRef.current?.stop();
                } else {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mr = new MediaRecorder(stream);
                    mediaRecorderRef.current = mr; // FIX: Assigned to ref so it can be stopped!
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
            className={`w-full max-w-4xl max-h-[70vh] aspect-auto relative bg-black rounded-xl overflow-hidden border-2 border-dashed border-neutral-700 touch-none select-none ${isDrawingPolygon ? 'cursor-crosshair' : ''}`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerDown={handleCanvasClick}
          >
            <img 
              src={image.previewUrl} 
              className="w-full h-full object-contain pointer-events-none" 
              style={{
                transform: `rotate(${image.rotate}deg) scaleX(${image.flipH ? -1 : 1}) scaleY(${image.flipV ? -1 : 1})`,
              }}
            />

            {/* Active Drawing Polygon */}
            {isDrawingPolygon && drawingPoints.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-50">
                <polygon 
                  points={drawingPoints.map(p => `${p.x}%,${p.y}%`).join(' ')} 
                  className="fill-teal-500/40 stroke-teal-500 stroke-2" 
                />
                {drawingPoints.map((p, i) => (
                  <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="4" fill="white" />
                ))}
              </svg>
            )}

            {/* Draggable Annotations */}
            {image.annotations.map(a => (
              <div 
                key={a.id} 
                className={`absolute transition-all ${
                  a.type === 'polygon' ? 'inset-0' : 'cursor-move'
                } ${selectedId === a.id ? 'ring-2 ring-teal-500 ring-offset-2 ring-offset-black' : ''}`}
                style={a.type === 'polygon' ? { zIndex: 10 } : { 
                  left: `${a.x}%`, 
                  top: `${a.y}%`, 
                  zIndex: draggingId === a.id ? 50 : 10, 
                  width: `${(a.size || 1)*3}rem`, 
                  height: `${(a.size || 1)*3}rem`,
                  transform: `translate(-50%, -50%) rotate(${a.rotate || 0}deg) scale(${selectedId === a.id && draggingId !== a.id ? 1.05 : 1})`
                }}
                onPointerDown={(e) => handlePointerDown(e, a.id)}
              >
                {a.type === 'polygon' ? (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <polygon 
                      points={a.points?.map(p => `${p.x}%,${p.y}%`).join(' ')} 
                      className="fill-teal-500/40 stroke-teal-500 stroke-2" 
                    />
                  </svg>
                ) : (
                  <MarkerIcon type={a.type} />
                )}
                
                {/* Delete Button (shows on select) */}
                {selectedId === a.id && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveMarker(a.id); }}
                    className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors z-50 pointer-events-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-neutral-500 mt-6 text-sm text-center">
            {isDrawingPolygon 
              ? "画面をクリックしてエリアの頂点を打っていきます。もう一度ボタンを押して完了します。" 
              : "マーカーをドラッグ＆ドロップして位置を調整できます。クリックしてサイズ変更・削除。"}
          </p>
        </div>
      </div>
    </div>
  );
}
