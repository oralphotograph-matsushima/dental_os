"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileDown, FlipHorizontal, FlipVertical, RotateCw, Trash2, Sliders, Edit3, Mic, Loader2, Maximize2, MoveRight, MoveLeft, RefreshCw, Circle, Droplet } from "lucide-react";
import pptxgen from "pptxgenjs";
import html2canvas from "html2canvas";
import { getApproximateCoordinates } from "@/lib/dentalGridMap";

export type AnnotationType = 'implant' | 'arrow_mesial' | 'arrow_distal' | 'rotation' | 'caries' | 'bone_graft' | 'polygon';

export interface Point { x: number; y: number; }

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  size?: number;
  rotate?: number;
  points?: Point[];
}

export interface ImageData {
  id: string;
  file: File;
  previewUrl: string;
  flipH: boolean;
  flipV: boolean;
  rotate: number;
  zoom?: number;
}

export const MarkerIcon = ({ type, className = "", points, isStatic = false }: { type: AnnotationType, className?: string, points?: Point[], isStatic?: boolean }) => {
  switch (type) {
    case 'implant':
      return (
        <svg viewBox="0 0 60 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} drop-shadow-md`} style={isStatic ? {} : { width: '100%', height: '100%' }}>
          <rect x="15" y="10" width="30" height="20" fill="url(#metalGrad)" stroke="#374151" strokeWidth="1.5" />
          <rect x="10" y="30" width="40" height="15" fill="url(#metalGrad)" stroke="#374151" strokeWidth="1.5" rx="2" />
          <path d="M15 45 L45 45 L40 160 Q30 180 20 160 Z" fill="url(#metalGrad)" stroke="#374151" strokeWidth="1.5" />
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
    case 'arrow_mesial': return <MoveLeft className={`text-red-400/80 stroke-[1.5] ${className}`} style={isStatic ? {} : { width: '100%', height: '100%' }} />;
    case 'arrow_distal': return <MoveRight className={`text-blue-400/80 stroke-[1.5] ${className}`} style={isStatic ? {} : { width: '100%', height: '100%' }} />;
    case 'rotation': return <RefreshCw className={`text-orange-400/80 stroke-[1.5] ${className}`} style={isStatic ? {} : { width: '100%', height: '100%' }} />;
    case 'caries': return <Circle className={`text-red-500/80 stroke-[1.5] ${className}`} style={isStatic ? {} : { width: '100%', height: '100%' }} />;
    case 'bone_graft': return <Droplet className={`text-teal-500 fill-teal-500/50 stroke-[2] ${className}`} style={isStatic ? {} : { width: '100%', height: '100%' }} />;
    case 'polygon':
      if (isStatic) return <span className={`text-teal-500 ${className}`}>⬡</span>;
      if (!points || points.length === 0) return null;
      const ptsString = points.map(p => `${p.x},${p.y}`).join(' ');
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <polygon points={ptsString} className="fill-teal-500/40 stroke-teal-500 stroke-2" />
        </svg>
      );
  }
};

export default function SlideGenerator() {
  const [intraoralImages, setIntraoralImages] = useState<(ImageData | null)[]>(Array(9).fill(null));
  const [panoImage, setPanoImage] = useState<ImageData | null>(null);
  const [facialImages, setFacialImages] = useState<(ImageData | null)[]>(Array(3).fill(null));
  
  const [intraoralAnnotations, setIntraoralAnnotations] = useState<Annotation[]>([]);
  const [panoAnnotations, setPanoAnnotations] = useState<Annotation[]>([]);
  const [facialAnnotations, setFacialAnnotations] = useState<Annotation[]>([]);

  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(null);
  const [uploadTargetIndex, setUploadTargetIndex] = useState<number | null>(null);
  const [facialSwapIndex, setFacialSwapIndex] = useState<number | null>(null);
  const [facialUploadIndex, setFacialUploadIndex] = useState<number | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeEditor, setActiveEditor] = useState<"pano" | "intraoral" | "facial" | null>(null);
  const [editingImage, setEditingImage] = useState<{ type: "intraoral" | "pano" | "facial"; index: number | null; img: ImageData; } | null>(null);

  const fileInputRef9 = useRef<HTMLInputElement>(null);
  const fileInputRefPano = useRef<HTMLInputElement>(null);
  const fileInputRefFacial = useRef<HTMLInputElement>(null);

  const intraoralRef = useRef<HTMLDivElement>(null);
  const panoRef = useRef<HTMLDivElement>(null);
  const facialRef = useRef<HTMLDivElement>(null);

  const handleFiles = (files: FileList | null, type: "intraoral" | "pano" | "facial") => {
    if (!files || files.length === 0) {
      setUploadTargetIndex(null);
      return;
    }
    if (type === "intraoral") {
      const newImages = [...intraoralImages];
      let fileIndex = 0;
      const startIndex = uploadTargetIndex !== null ? uploadTargetIndex : 0;
      for (let i = startIndex; i < 9; i++) {
        if (!newImages[i] && fileIndex < files.length) {
          const file = files[fileIndex++];
          newImages[i] = { id: Math.random().toString(36).substring(7), file, previewUrl: URL.createObjectURL(file), flipH: false, flipV: false, rotate: 0 };
        }
      }
      for (let i = 0; i < startIndex; i++) {
        if (!newImages[i] && fileIndex < files.length) {
          const file = files[fileIndex++];
          newImages[i] = { id: Math.random().toString(36).substring(7), file, previewUrl: URL.createObjectURL(file), flipH: false, flipV: false, rotate: 0 };
        }
      }
      setIntraoralImages(newImages);
      setUploadTargetIndex(null);
    } else if (type === "pano") {
      const file = files[0];
      setPanoImage({ id: Math.random().toString(36).substring(7), file, previewUrl: URL.createObjectURL(file), flipH: false, flipV: false, rotate: 0 });
    } else if (type === "facial") {
      const newImages = [...facialImages];
      let fileIndex = 0;
      const startIndex = facialUploadIndex !== null ? facialUploadIndex : 0;
      for (let i = startIndex; i < 3; i++) {
        if (!newImages[i] && fileIndex < files.length) {
          const file = files[fileIndex++];
          newImages[i] = { id: Math.random().toString(36).substring(7), file, previewUrl: URL.createObjectURL(file), flipH: false, flipV: false, rotate: 0 };
        }
      }
      for (let i = 0; i < startIndex; i++) {
        if (!newImages[i] && fileIndex < files.length) {
          const file = files[fileIndex++];
          newImages[i] = { id: Math.random().toString(36).substring(7), file, previewUrl: URL.createObjectURL(file), flipH: false, flipV: false, rotate: 0 };
        }
      }
      setFacialImages(newImages);
      setFacialUploadIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, type: "intraoral" | "pano" | "facial") => { e.preventDefault(); handleFiles(e.dataTransfer.files, type); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleGridClick = (index: number) => {
    if (selectedSwapIndex === null) {
      if (intraoralImages[index]) { setSelectedSwapIndex(index); } 
      else { setUploadTargetIndex(index); fileInputRef9.current?.click(); }
    } else {
      if (selectedSwapIndex === index) { setSelectedSwapIndex(null); return; }
      const newImages = [...intraoralImages];
      const temp = newImages[selectedSwapIndex];
      newImages[selectedSwapIndex] = newImages[index];
      newImages[index] = temp;
      setIntraoralImages(newImages);
      setSelectedSwapIndex(null);
    }
  };

  const handleFacialGridClick = (index: number) => {
    if (facialSwapIndex === null) {
      if (facialImages[index]) { setFacialSwapIndex(index); } 
      else { setFacialUploadIndex(index); fileInputRefFacial.current?.click(); }
    } else {
      if (facialSwapIndex === index) { setFacialSwapIndex(null); return; }
      const newImages = [...facialImages];
      const temp = newImages[facialSwapIndex];
      newImages[facialSwapIndex] = newImages[index];
      newImages[index] = temp;
      setFacialImages(newImages);
      setFacialSwapIndex(null);
    }
  };

  const toggleFlip = (type: "intraoral" | "pano" | "facial", index: number | null, direction: "H" | "V", e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === "intraoral" && index !== null) {
      const newImages = [...intraoralImages];
      const img = newImages[index];
      if (img) { newImages[index] = { ...img, [direction === "H" ? "flipH" : "flipV"]: !img[direction === "H" ? "flipH" : "flipV"] }; setIntraoralImages(newImages); }
    } else if (type === "pano" && panoImage) {
      setPanoImage({ ...panoImage, [direction === "H" ? "flipH" : "flipV"]: !panoImage[direction === "H" ? "flipH" : "flipV"] });
    } else if (type === "facial" && index !== null) {
      const newImages = [...facialImages];
      const img = newImages[index];
      if (img) { newImages[index] = { ...img, [direction === "H" ? "flipH" : "flipV"]: !img[direction === "H" ? "flipH" : "flipV"] }; setFacialImages(newImages); }
    }
  };

  const rotateImage = (type: "intraoral" | "pano" | "facial", index: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === "intraoral" && index !== null) {
      const newImages = [...intraoralImages];
      const img = newImages[index];
      if (img) { newImages[index] = { ...img, rotate: (img.rotate + 90) % 360 }; setIntraoralImages(newImages); }
    } else if (type === "pano" && panoImage) {
      setPanoImage({ ...panoImage, rotate: (panoImage.rotate + 90) % 360 });
    } else if (type === "facial" && index !== null) {
      const newImages = [...facialImages];
      const img = newImages[index];
      if (img) { newImages[index] = { ...img, rotate: (img.rotate + 90) % 360 }; setFacialImages(newImages); }
    }
  };

  const removeImage = (type: "intraoral" | "pano" | "facial", index: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === "intraoral" && index !== null) {
      const newImages = [...intraoralImages]; newImages[index] = null; setIntraoralImages(newImages);
    } else if (type === "pano") { setPanoImage(null);
    } else if (type === "facial" && index !== null) {
      const newImages = [...facialImages]; newImages[index] = null; setFacialImages(newImages);
    }
  };

  const generateSlide = async () => {
    setIsGenerating(true);
    try {
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_16x9";

      const captureAndAddSlide = async (ref: React.RefObject<HTMLDivElement | null>) => {
        if (!ref.current) return;
        
        // Remove styling that might mess up capture
        const originalBorder = ref.current.style.border;
        ref.current.style.border = 'none';

        const canvas = await html2canvas(ref.current, { 
          backgroundColor: '#000000', 
          scale: 2,
          useCORS: true,
          logging: false
        });
        
        ref.current.style.border = originalBorder;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const slide = pptx.addSlide();
        
        // Center the image on the 16x9 slide
        slide.addImage({ data: dataUrl, x: 0.5, y: 0.5, w: 9, h: 4.5, sizing: { type: 'contain', w: 9, h: 4.5 } });
      };

      if (panoImage) await captureAndAddSlide(panoRef);
      if (intraoralImages.some(img => img !== null)) await captureAndAddSlide(intraoralRef);
      if (facialImages.some(img => img !== null)) await captureAndAddSlide(facialRef);

      await pptx.writeFile({ fileName: `Dental_Presentation_${new Date().getTime()}.pptx` });
    } catch (e) {
      console.error("PPTX Error", e);
      alert("スライドの生成中にエラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to render annotations over the grid thumbnails
  const renderAnnotations = (annotations: Annotation[]) => {
    return annotations.map(a => (
      <div 
        key={a.id} 
        className="absolute drop-shadow-md pointer-events-none" 
        style={{ 
          left: `${a.x}%`, 
          top: `${a.y}%`,
          width: `${(a.size || 1)*2.5}rem`, 
          height: `${(a.size || 1)*2.5}rem`,
          transform: `translate(-50%, -50%) rotate(${a.rotate || 0}deg)`,
          zIndex: 40
        }}
      >
        {a.type === 'polygon' ? (
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <polygon points={a.points?.map(p => `${p.x}%,${p.y}%`).join(' ')} className="fill-teal-500/40 stroke-teal-500 stroke-[2]" />
          </svg>
        ) : (
          <MarkerIcon type={a.type} />
        )}
      </div>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto py-2 md:py-8 mb-20 md:mb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8 px-2 md:px-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2 flex items-center gap-2">
            <span className="bg-teal-500/20 text-teal-400 p-2 rounded-xl"><Sliders className="w-5 h-5" /></span>
            プレゼンテーション生成 & 計画エディタ
          </h2>
          <p className="text-xs md:text-sm text-neutral-400">各グリッドに「アノテーション」で全体に書き込みができます。出力ボタンで美しい1枚のスライド（PDF/画像）になります。</p>
        </div>
        <button onClick={generateSlide} disabled={isGenerating} className="w-full md:w-auto bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white px-6 py-4 md:py-3 rounded-xl md:rounded-lg font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95">
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
          スライド（PDF/画像）として出力
        </button>
      </div>

      <div className="grid md:grid-cols-12 gap-8 px-2 md:px-0">
        <div className="col-span-12 md:col-span-9 space-y-8">
          
          {/* Pano */}
          <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-xl p-4 md:p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base md:text-lg font-semibold text-white">パノラマレントゲン</h3>
              <button onClick={() => setActiveEditor("pano")} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-900/30 transition-all">
                <Edit3 className="w-4 h-4" /> アノテーション
              </button>
            </div>
            
            <div 
              ref={panoRef}
              onClick={() => !panoImage && fileInputRefPano.current?.click()}
              onDrop={(e) => handleDrop(e, "pano")}
              onDragOver={handleDragOver}
              className={`relative aspect-[21/9] rounded-xl border flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all bg-black
                ${panoImage ? 'border-neutral-800' : 'border-dashed border-neutral-700 hover:border-neutral-500 shadow-inner'}`}
            >
              <input type="file" accept="image/*" className="hidden" ref={fileInputRefPano} onChange={(e) => handleFiles(e.target.files, "pano")} />
              {panoImage ? (
                <>
                  <img 
                    src={panoImage.previewUrl} 
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ transform: `scaleX(${(panoImage.flipH ? -1 : 1) * (panoImage.zoom || 1)}) scaleY(${(panoImage.flipV ? -1 : 1) * (panoImage.zoom || 1)}) rotate(${panoImage.rotate}deg)` }}
                  />
                  {renderAnnotations(panoAnnotations)}
                  <div className="absolute top-2 right-2 flex gap-2 z-50">
                    <button onClick={(e) => { e.stopPropagation(); setEditingImage({ type: "pano", index: null, img: panoImage }); }} className="p-2 bg-black/60 rounded-lg text-white hover:bg-teal-600" title="詳細調整"><Sliders className="w-4 h-4" /></button>
                    <button onClick={(e) => rotateImage("pano", null, e)} className="p-2 bg-black/60 rounded-lg text-white hover:bg-blue-600"><RotateCw className="w-4 h-4" /></button>
                    <button onClick={(e) => toggleFlip("pano", null, "H", e)} className="p-2 bg-black/70 rounded-lg text-white hover:bg-blue-600"><FlipHorizontal className="w-4 h-4" /></button>
                    <button onClick={(e) => removeImage("pano", null, e)} className="p-2 bg-black/70 rounded-lg text-red-400 hover:bg-red-600 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </>
              ) : (
                <><UploadCloud className="w-8 h-8 text-neutral-500 mb-2" /><span className="text-neutral-500 text-sm">タップしてアップロード</span></>
              )}
            </div>
          </div>

          {/* Intraoral 9-grid */}
          <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-xl p-4 md:p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-base md:text-lg font-semibold text-white">口腔内9枚法</h3>
                <button onClick={() => fileInputRef9.current?.click()} className="text-xs md:text-sm bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg border border-white/10">
                  画像を追加
                </button>
              </div>
              <button onClick={() => setActiveEditor("intraoral")} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-900/30 transition-all">
                <Edit3 className="w-4 h-4" /> アノテーション
              </button>
            </div>
            
            {selectedSwapIndex !== null && (
              <div className="text-[10px] md:text-xs text-amber-500 mb-4 bg-amber-500/10 p-2 md:p-3 rounded-lg border border-amber-500/20 animate-pulse">
                💡 入れ替え先の画像（または空枠）をタップしてください。
              </div>
            )}
            
            <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef9} onChange={(e) => handleFiles(e.target.files, "intraoral")} />
            
            <div 
              ref={intraoralRef}
              className="relative grid grid-cols-3 gap-1.5 md:gap-2 bg-black p-1.5 md:p-3 rounded-xl border border-neutral-800 shadow-inner"
              onDrop={(e) => handleDrop(e, "intraoral")} onDragOver={handleDragOver}
            >
              {renderAnnotations(intraoralAnnotations)}
              
              {intraoralImages.map((img, idx) => (
                <div 
                  key={idx} onClick={() => handleGridClick(idx)}
                  className={`relative aspect-[4/3] rounded-lg flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all z-10
                    ${selectedSwapIndex === idx ? 'border-2 border-teal-500 bg-teal-500/20 scale-95' : 'border border-neutral-800 bg-neutral-900/50 hover:border-neutral-600'}`}
                >
                  {img ? (
                    <>
                      <img src={img.previewUrl} className="absolute inset-0 w-full h-full object-cover" style={{ transform: `scaleX(${(img.flipH ? -1 : 1) * (img.zoom || 1)}) scaleY(${(img.flipV ? -1 : 1) * (img.zoom || 1)}) rotate(${img.rotate}deg)` }} />
                      <div className="absolute top-1 right-1 flex gap-1 z-50">
                        <button onClick={(e) => { e.stopPropagation(); setEditingImage({ type: "intraoral", index: idx, img }); }} className="p-1.5 bg-black/60 rounded text-white hover:bg-teal-600"><Sliders className="w-3 h-3" /></button>
                        <button onClick={(e) => rotateImage("intraoral", idx, e)} className="p-1.5 bg-black/60 rounded text-white hover:bg-blue-600"><RotateCw className="w-3 h-3" /></button>
                        <button onClick={(e) => toggleFlip("intraoral", idx, "H", e)} className="p-1.5 bg-black/60 rounded text-white hover:bg-blue-600"><FlipHorizontal className="w-3 h-3" /></button>
                        <button onClick={(e) => removeImage("intraoral", idx, e)} className="p-1.5 bg-black/60 rounded text-red-400 hover:bg-red-600 hover:text-white"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </>
                  ) : <span className="text-neutral-600 text-xs font-medium">枠 {idx + 1}</span>}
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="col-span-12 md:col-span-3 space-y-8">
          {/* Facial */}
          <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-xl p-4 md:p-6 shadow-2xl">
            <div className="flex flex-col gap-3 mb-4">
              <h3 className="text-base md:text-lg font-semibold text-white">顔貌写真</h3>
              <div className="flex justify-between items-center">
                <button onClick={() => fileInputRefFacial.current?.click()} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-lg border border-white/10">画像を追加</button>
                <button onClick={() => setActiveEditor("facial")} className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"><Edit3 className="w-3 h-3" /> アノテーション</button>
              </div>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRefFacial} onChange={(e) => handleFiles(e.target.files, "facial")} />
            </div>
            
            <div ref={facialRef} className="relative grid grid-cols-1 gap-2 bg-black p-2 rounded-xl border border-neutral-800 shadow-inner" onDrop={(e) => handleDrop(e, "facial")} onDragOver={handleDragOver}>
              {renderAnnotations(facialAnnotations)}
              {facialImages.map((img, idx) => (
                <div key={idx} onClick={() => handleFacialGridClick(idx)} className={`relative aspect-[3/4] rounded-lg flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all z-10 ${facialSwapIndex === idx ? 'border-2 border-teal-500 bg-teal-500/20 scale-95' : 'border border-neutral-800 bg-neutral-900/50 hover:border-neutral-600'}`}>
                  {img ? (
                    <>
                      <img src={img.previewUrl} className="absolute inset-0 w-full h-full object-cover" style={{ transform: `scaleX(${(img.flipH ? -1 : 1) * (img.zoom || 1)}) scaleY(${(img.flipV ? -1 : 1) * (img.zoom || 1)}) rotate(${img.rotate}deg)` }} />
                      <div className="absolute top-1 right-1 flex flex-col gap-1 z-50">
                        <button onClick={(e) => { e.stopPropagation(); setEditingImage({ type: "facial", index: idx, img }); }} className="p-1.5 bg-black/60 rounded text-white hover:bg-teal-600"><Sliders className="w-3 h-3" /></button>
                        <button onClick={(e) => rotateImage("facial", idx, e)} className="p-1.5 bg-black/60 rounded text-white hover:bg-blue-600"><RotateCw className="w-3 h-3" /></button>
                        <button onClick={(e) => toggleFlip("facial", idx, "H", e)} className="p-1.5 bg-black/60 rounded text-white hover:bg-blue-600"><FlipHorizontal className="w-3 h-3" /></button>
                        <button onClick={(e) => removeImage("facial", idx, e)} className="p-1.5 bg-black/60 rounded text-red-400 hover:bg-red-600 hover:text-white"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </>
                  ) : <span className="text-neutral-600 text-[10px] font-medium">枠 {idx + 1}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">画像の詳細調整</h3>
              <button onClick={() => setEditingImage(null)} className="text-neutral-400 hover:text-white p-2">✕</button>
            </div>
            <div className="relative w-full aspect-video bg-black/50 rounded-xl overflow-hidden mb-8 border border-white/10 flex items-center justify-center">
              <img src={editingImage.img.previewUrl} className="max-w-full max-h-full object-contain" style={{ transform: `scaleX(${editingImage.img.flipH ? -1 : 1}) scaleY(${editingImage.img.flipV ? -1 : 1}) rotate(${editingImage.img.rotate}deg) scale(${editingImage.img.zoom || 1})`, transition: 'transform 0.1s ease-out' }} />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2"><label className="text-sm font-semibold text-neutral-300">角度 (Rotate)</label><span className="text-sm text-teal-400">{editingImage.img.rotate}°</span></div>
                <input type="range" min="-180" max="180" step="1" value={editingImage.img.rotate} onChange={(e) => setEditingImage({ ...editingImage, img: { ...editingImage.img, rotate: parseInt(e.target.value) } })} className="w-full accent-teal-500" />
              </div>
              <div>
                <div className="flex justify-between mb-2"><label className="text-sm font-semibold text-neutral-300">拡大 (Zoom)</label><span className="text-sm text-teal-400">{(editingImage.img.zoom || 1).toFixed(2)}x</span></div>
                <input type="range" min="1" max="3" step="0.01" value={editingImage.img.zoom || 1} onChange={(e) => setEditingImage({ ...editingImage, img: { ...editingImage.img, zoom: parseFloat(e.target.value) } })} className="w-full accent-teal-500" />
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setEditingImage(null)} className="flex-1 bg-neutral-800 text-white font-bold py-3 rounded-xl hover:bg-neutral-700">キャンセル</button>
              <button onClick={() => {
                if (editingImage.type === "intraoral" && editingImage.index !== null) {
                  const newImages = [...intraoralImages]; newImages[editingImage.index] = editingImage.img; setIntraoralImages(newImages);
                } else if (editingImage.type === "pano") { setPanoImage(editingImage.img);
                } else if (editingImage.type === "facial" && editingImage.index !== null) {
                  const newImages = [...facialImages]; newImages[editingImage.index] = editingImage.img; setFacialImages(newImages);
                }
                setEditingImage(null);
              }} className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-500">保存する</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Annotation Editor Modal */}
      {activeEditor && (
        <AnnotationEditor 
          category={activeEditor}
          panoImage={panoImage}
          intraoralImages={intraoralImages}
          facialImages={facialImages}
          initialAnnotations={
            activeEditor === "pano" ? panoAnnotations :
            activeEditor === "intraoral" ? intraoralAnnotations : facialAnnotations
          }
          onSave={(annos: Annotation[]) => {
            if (activeEditor === "pano") setPanoAnnotations(annos);
            else if (activeEditor === "intraoral") setIntraoralAnnotations(annos);
            else if (activeEditor === "facial") setFacialAnnotations(annos);
            setActiveEditor(null);
          }}
          onClose={() => setActiveEditor(null)}
        />
      )}
    </div>
  );
}

// --- Global Annotation Editor Component ---
function AnnotationEditor({ category, panoImage, intraoralImages, facialImages, initialAnnotations, onSave, onClose }: any) {
  const [annotations, setAnnotations] = useState<Annotation[]>([...initialAnnotations]);
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
    const newAnnotation: Annotation = { id: Math.random().toString(36).substring(7), type, x, y, size: 1.0, rotate: 0 };
    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedId(newAnnotation.id);
  };

  const handleUpdateSize = (val: number) => setAnnotations(prev => prev.map(a => a.id === selectedId ? { ...a, size: val } : a));
  const handleUpdateRotate = (val: number) => setAnnotations(prev => prev.map(a => a.id === selectedId ? { ...a, rotate: val } : a));

  const finishDrawingPolygon = () => {
    if (drawingPoints.length > 2) {
      setAnnotations(prev => [...prev, { id: Math.random().toString(36).substring(7), type: 'polygon', x: 0, y: 0, points: drawingPoints }]);
    }
    setIsDrawingPolygon(false); setDrawingPoints([]);
  };

  const handleCanvasClick = (e: React.PointerEvent) => {
    if (!isDrawingPolygon || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDrawingPoints(prev => [...prev, { x: px, y: py }]);
  };

  const handleRemoveMarker = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (isDrawingPolygon) return;
    setDraggingId(id); setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setAnnotations(prev => prev.map(a => a.id === draggingId ? { ...a, x, y } : a));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingId(null);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col md:flex-row items-center justify-center p-4">
      {/* Left Toolbar */}
      <div className="w-full md:w-64 bg-neutral-950 p-6 flex flex-col gap-4 overflow-y-auto border border-white/10 rounded-2xl md:mr-4 md:h-[90vh]">
        <h3 className="text-white font-bold text-lg">書き込みツール</h3>
        
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 font-bold uppercase">追加</p>
          <button onClick={() => handleAddMarker('implant')} className={`w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5`}><MarkerIcon type="implant" className="w-4 h-6" isStatic /> インプラント</button>
          <button onClick={() => handleAddMarker('arrow_mesial')} className={`w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5`}><MarkerIcon type="arrow_mesial" className="w-5 h-5" isStatic /> 近心移動</button>
          <button onClick={() => handleAddMarker('arrow_distal')} className={`w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5`}><MarkerIcon type="arrow_distal" className="w-5 h-5" isStatic /> 遠心移動</button>
          <button onClick={() => handleAddMarker('rotation')} className={`w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5`}><MarkerIcon type="rotation" className="w-5 h-5" isStatic /> 回転</button>
          <button onClick={() => handleAddMarker('caries')} className={`w-full flex items-center gap-3 p-3 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white transition-colors border border-white/5`}><MarkerIcon type="caries" className="w-5 h-5" isStatic /> 虫歯</button>
          <button onClick={() => { if (isDrawingPolygon) finishDrawingPolygon(); else { setIsDrawingPolygon(true); setSelectedId(null); } }} className={`w-full flex items-center gap-3 p-3 rounded-xl text-white transition-colors border border-white/5 ${isDrawingPolygon ? "bg-teal-600 border-teal-500 animate-pulse" : "bg-neutral-900 hover:bg-neutral-800"}`}><MarkerIcon type="polygon" className="w-5 h-5" isStatic /> {isDrawingPolygon ? "完了する" : "エリア描画"}</button>
        </div>
        
        {selectedId && !isDrawingPolygon && (
          <div className="space-y-4 p-4 bg-neutral-800/50 rounded-xl border border-white/5">
            <div className="space-y-2"><p className="text-xs text-neutral-400 font-bold">サイズ</p><input type="range" min="0.3" max="3" step="0.1" value={annotations.find(a => a.id === selectedId)?.size || 1.0} onChange={(e) => handleUpdateSize(parseFloat(e.target.value))} className="w-full accent-teal-500" /></div>
            <div className="space-y-2"><p className="text-xs text-neutral-400 font-bold">回転</p><input type="range" min="-180" max="180" step="1" value={annotations.find(a => a.id === selectedId)?.rotate || 0} onChange={(e) => handleUpdateRotate(parseInt(e.target.value))} className="w-full accent-orange-500" /></div>
          </div>
        )}

        <div className="mt-auto space-y-4 pt-4 border-t border-white/10">
          <button onClick={async () => {
              if (isRecording) { mediaRecorderRef.current?.stop(); } else {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  const mr = new MediaRecorder(stream); mediaRecorderRef.current = mr; audioChunksRef.current = [];
                  mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                  mr.onstop = async () => {
                    setIsRecording(false); setIsAiProcessing(true); stream.getTracks().forEach(t => t.stop());
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const formData = new FormData(); formData.append("file", audioBlob, "recording.webm");
                    try {
                      const trRes = await fetch("/api/transcribe", { method: "POST", body: formData });
                      const trData = await trRes.json();
                      if (trData.text) {
                        const aiRes = await fetch("/api/annotate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: trData.text }) });
                        const aiData = await aiRes.json();
                        if (aiData.actions) {
                          aiData.actions.forEach((action: any) => {
                            const coords = getApproximateCoordinates(action.region || "center");
                            handleAddMarker(action.type, coords.x, coords.y);
                          });
                        }
                      }
                    } catch (e) { alert("AI処理に失敗しました。"); } finally { setIsAiProcessing(false); }
                  };
                  mr.start(); setIsRecording(true);
                } catch(e) { alert("マイクが許可されていません。"); }
              }
            }}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-colors ${isRecording ? "bg-red-500/20 text-red-500 border-red-500/30 animate-pulse" : isAiProcessing ? "bg-neutral-800 text-neutral-400 border-white/10" : "bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 border-teal-500/30"}`}
          >
            {isAiProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            {isRecording ? "録音中 (タップで完了)" : isAiProcessing ? "解析中..." : "音声で配置 (AI)"}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 w-full max-w-5xl flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {category === "pano" ? "パノラマ キャンバス編集" : category === "intraoral" ? "口腔内9枚 キャンバス編集" : "顔貌3枚 キャンバス編集"}
          </h2>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-colors">キャンセル</button>
            <button onClick={() => onSave(annotations)} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold transition-colors shadow-lg shadow-teal-900/20">完了</button>
          </div>
        </div>

        {/* The Actual Canvas Container */}
        <div 
          ref={canvasRef}
          className={`w-full bg-black relative rounded-xl overflow-hidden touch-none select-none border border-neutral-800 ${isDrawingPolygon ? 'cursor-crosshair' : ''}`}
          onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onPointerCancel={handlePointerUp} onPointerDown={handleCanvasClick}
        >
          {/* Render the background grid based on category */}
          {category === "pano" && (
            <div className="w-full aspect-[21/9]">
              {panoImage && <img src={panoImage.previewUrl} className="w-full h-full object-contain pointer-events-none" style={{ transform: `scaleX(${(panoImage.flipH ? -1 : 1) * (panoImage.zoom || 1)}) scaleY(${(panoImage.flipV ? -1 : 1) * (panoImage.zoom || 1)}) rotate(${panoImage.rotate}deg)` }} />}
            </div>
          )}
          {category === "intraoral" && (
            <div className="grid grid-cols-3 gap-1.5 p-1.5">
              {intraoralImages.map((img: ImageData | null, i: number) => (
                <div key={i} className="aspect-[4/3] bg-neutral-900 rounded-lg overflow-hidden relative">
                  {img && <img src={img.previewUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ transform: `scaleX(${(img.flipH ? -1 : 1) * (img.zoom || 1)}) scaleY(${(img.flipV ? -1 : 1) * (img.zoom || 1)}) rotate(${img.rotate}deg)` }} />}
                </div>
              ))}
            </div>
          )}
          {category === "facial" && (
            <div className="grid grid-cols-1 gap-2 p-2 max-w-sm mx-auto">
              {facialImages.map((img: ImageData | null, i: number) => (
                <div key={i} className="aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden relative">
                  {img && <img src={img.previewUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ transform: `scaleX(${(img.flipH ? -1 : 1) * (img.zoom || 1)}) scaleY(${(img.flipV ? -1 : 1) * (img.zoom || 1)}) rotate(${img.rotate}deg)` }} />}
                </div>
              ))}
            </div>
          )}

          {/* Active Drawing Polygon */}
          {isDrawingPolygon && drawingPoints.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100]">
              <polygon points={drawingPoints.map(p => `${p.x}%,${p.y}%`).join(' ')} className="fill-teal-500/40 stroke-teal-500 stroke-2" />
              {drawingPoints.map((p, i) => <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="4" fill="white" />)}
            </svg>
          )}

          {/* Draggable Annotations */}
          {annotations.map(a => (
            <div 
              key={a.id} 
              className={`absolute ${draggingId === a.id ? '' : 'transition-all'} ${a.type === 'polygon' ? 'inset-0' : 'cursor-move'} ${selectedId === a.id ? 'ring-2 ring-teal-500 ring-offset-2 ring-offset-black' : ''}`}
              style={a.type === 'polygon' ? { zIndex: 100 } : { 
                left: `${a.x}%`, top: `${a.y}%`, zIndex: draggingId === a.id ? 150 : 100, 
                width: `${(a.size || 1)*4}rem`, height: `${(a.size || 1)*4}rem`,
                transform: `translate(-50%, -50%) rotate(${a.rotate || 0}deg) scale(${selectedId === a.id && draggingId !== a.id ? 1.05 : 1})`
              }}
              onPointerDown={(e) => handlePointerDown(e, a.id)}
            >
              {a.type === 'polygon' ? (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"><polygon points={a.points?.map(p => `${p.x}%,${p.y}%`).join(' ')} className="fill-teal-500/40 stroke-teal-500 stroke-2" /></svg>
              ) : <MarkerIcon type={a.type} />}
              
              {selectedId === a.id && (
                <button onClick={(e) => { e.stopPropagation(); handleRemoveMarker(a.id); }} className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors z-50 pointer-events-auto">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-neutral-500 mt-4 text-sm">背景の画像をまたいで自由にマーカーを配置・描画できます。</p>
      </div>
    </div>
  );
}
