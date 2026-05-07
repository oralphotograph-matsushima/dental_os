"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileDown, FlipHorizontal, FlipVertical, RotateCw, Trash2, Move, Sliders } from "lucide-react";
import pptxgen from "pptxgenjs";

interface ImageData {
  id: string;
  file: File;
  previewUrl: string;
  flipH: boolean;
  flipV: boolean;
  rotate: number;
  zoom?: number;
}

export default function SlideGenerator() {
  const [intraoralImages, setIntraoralImages] = useState<(ImageData | null)[]>(Array(9).fill(null));
  const [panoImage, setPanoImage] = useState<ImageData | null>(null);
  const [facialImages, setFacialImages] = useState<(ImageData | null)[]>(Array(3).fill(null));
  
  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(null);
  const [uploadTargetIndex, setUploadTargetIndex] = useState<number | null>(null);
  const [facialSwapIndex, setFacialSwapIndex] = useState<number | null>(null);
  const [facialUploadIndex, setFacialUploadIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingImage, setEditingImage] = useState<{
    type: "intraoral" | "pano" | "facial";
    index: number | null;
    img: ImageData;
  } | null>(null);

  const fileInputRef9 = useRef<HTMLInputElement>(null);
  const fileInputRefPano = useRef<HTMLInputElement>(null);
  const fileInputRefFacial = useRef<HTMLInputElement>(null);

  // File handling
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
          newImages[i] = {
            id: Math.random().toString(36).substring(7),
            file,
            previewUrl: URL.createObjectURL(file),
            flipH: false,
            flipV: false,
            rotate: 0,
          };
        }
      }
      
      // If we still have files left, wrap around to fill empty slots from the beginning
      for (let i = 0; i < startIndex; i++) {
        if (!newImages[i] && fileIndex < files.length) {
          const file = files[fileIndex++];
          newImages[i] = {
            id: Math.random().toString(36).substring(7),
            file,
            previewUrl: URL.createObjectURL(file),
            flipH: false,
            flipV: false,
            rotate: 0,
          };
        }
      }

      setIntraoralImages(newImages);
      setUploadTargetIndex(null);
    } else if (type === "pano") {
      const file = files[0];
      setPanoImage({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
        flipH: false,
        flipV: false,
        rotate: 0,
      });
    } else if (type === "facial") {
      const newImages = [...facialImages];
      let fileIndex = 0;
      
      const startIndex = facialUploadIndex !== null ? facialUploadIndex : 0;
      
      for (let i = startIndex; i < 3; i++) {
        if (!newImages[i] && fileIndex < files.length) {
          const file = files[fileIndex++];
          newImages[i] = {
            id: Math.random().toString(36).substring(7),
            file,
            previewUrl: URL.createObjectURL(file),
            flipH: false,
            flipV: false,
            rotate: 0,
          };
        }
      }
      
      for (let i = 0; i < startIndex; i++) {
        if (!newImages[i] && fileIndex < files.length) {
          const file = files[fileIndex++];
          newImages[i] = {
            id: Math.random().toString(36).substring(7),
            file,
            previewUrl: URL.createObjectURL(file),
            flipH: false,
            flipV: false,
            rotate: 0,
          };
        }
      }

      setFacialImages(newImages);
      setFacialUploadIndex(null);
    }
  };

  // Drag and drop events
  const handleDrop = (e: React.DragEvent, type: "intraoral" | "pano" | "facial") => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files, type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Swap logic
  const handleGridClick = (index: number) => {
    if (selectedSwapIndex === null) {
      // Select first item to swap or open file picker if empty
      if (intraoralImages[index]) {
        setSelectedSwapIndex(index);
      } else {
        setUploadTargetIndex(index);
        fileInputRef9.current?.click();
      }
    } else {
      // Swap with second item
      if (selectedSwapIndex === index) {
        setSelectedSwapIndex(null); // Deselect if clicked same
        return;
      }
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
      if (facialImages[index]) {
        setFacialSwapIndex(index);
      } else {
        setFacialUploadIndex(index);
        fileInputRefFacial.current?.click();
      }
    } else {
      if (facialSwapIndex === index) {
        setFacialSwapIndex(null);
        return;
      }
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
      if (img) {
        newImages[index] = { ...img, [direction === "H" ? "flipH" : "flipV"]: !img[direction === "H" ? "flipH" : "flipV"] };
        setIntraoralImages(newImages);
      }
    } else if (type === "pano" && panoImage) {
      setPanoImage({ ...panoImage, [direction === "H" ? "flipH" : "flipV"]: !panoImage[direction === "H" ? "flipH" : "flipV"] });
    } else if (type === "facial" && index !== null) {
      const newImages = [...facialImages];
      const img = newImages[index];
      if (img) {
        newImages[index] = { ...img, [direction === "H" ? "flipH" : "flipV"]: !img[direction === "H" ? "flipH" : "flipV"] };
        setFacialImages(newImages);
      }
    }
  };

  const rotateImage = (type: "intraoral" | "pano" | "facial", index: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === "intraoral" && index !== null) {
      const newImages = [...intraoralImages];
      const img = newImages[index];
      if (img) {
        newImages[index] = { ...img, rotate: (img.rotate + 90) % 360 };
        setIntraoralImages(newImages);
      }
    } else if (type === "pano" && panoImage) {
      setPanoImage({ ...panoImage, rotate: (panoImage.rotate + 90) % 360 });
    } else if (type === "facial" && index !== null) {
      const newImages = [...facialImages];
      const img = newImages[index];
      if (img) {
        newImages[index] = { ...img, rotate: (img.rotate + 90) % 360 };
        setFacialImages(newImages);
      }
    }
  };

  const removeImage = (type: "intraoral" | "pano" | "facial", index: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === "intraoral" && index !== null) {
      const newImages = [...intraoralImages];
      newImages[index] = null;
      setIntraoralImages(newImages);
    } else if (type === "pano") {
      setPanoImage(null);
    } else if (type === "facial" && index !== null) {
      const newImages = [...facialImages];
      newImages[index] = null;
      setFacialImages(newImages);
    }
  };

  const generateSlide = async () => {
    setIsGenerating(true);
    try {
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_16x9";

      // Function to bake transforms into a final image
      const bakeImage = async (imgData: ImageData): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            // Swap width and height if rotated 90 or 270 degrees
            const isRightAngle = Math.abs(imgData.rotate) % 180 === 90;
            canvas.width = isRightAngle ? img.height : img.width;
            canvas.height = isRightAngle ? img.width : img.height;
            
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#000000"; // Fill background just in case
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(imgData.flipH ? -1 : 1, imgData.flipV ? -1 : 1);
            ctx.rotate((imgData.rotate || 0) * Math.PI / 180);
            const z = imgData.zoom || 1.0;
            ctx.scale(z, z);
            
            ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
          };
          img.onerror = reject;
          img.src = imgData.previewUrl;
        });
      };

      // Function to get original image dimensions
      const getImageDimensions = (base64: string): Promise<{width: number, height: number}> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.src = base64;
        });
      };

      // Function to calculate perfect fit (contain) dimensions to prevent Keynote stretching
      const calculateContainFit = (imgW: number, imgH: number, boxX: number, boxY: number, boxW: number, boxH: number, rotate: number) => {
        const isRotated = rotate === 90 || rotate === 270;
        const actualImgW = isRotated ? imgH : imgW;
        const actualImgH = isRotated ? imgW : imgH;
        
        const imgRatio = actualImgW / actualImgH;
        const boxRatio = boxW / boxH;
        
        let finalW = boxW;
        let finalH = boxH;
        
        if (imgRatio > boxRatio) {
          finalH = boxW / imgRatio;
        } else {
          finalW = boxH * imgRatio;
        }
        
        const outputW = isRotated ? finalH : finalW;
        const outputH = isRotated ? finalW : finalH;
        
        const cx = boxX + boxW / 2;
        const cy = boxY + boxH / 2;
        const outputX = cx - outputW / 2;
        const outputY = cy - outputH / 2;

        return { x: outputX, y: outputY, w: outputW, h: outputH };
      };

      // Slide 1: 9 Intraoral photos
      const intraoralSlide = pptx.addSlide();
      const marginX = 0.5;
      const marginY = 0.2;
      const w = 3;
      const h = 1.6;
      const gapX = 0.1;
      const gapY = 0.1;

      for (let i = 0; i < 9; i++) {
        const imgData = intraoralImages[i];
        if (imgData) {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const boxX = marginX + col * (w + gapX);
          const boxY = marginY + row * (h + gapY);
          
          const base64 = await bakeImage(imgData);
          const dims = await getImageDimensions(base64);
          const fit = calculateContainFit(dims.width, dims.height, boxX, boxY, w, h, 0);
          
          intraoralSlide.addImage({
            data: base64,
            x: fit.x, y: fit.y, w: fit.w, h: fit.h,
          });
        }
      }

      // Slide 2: Pano
      if (panoImage) {
        const panoSlide = pptx.addSlide();
        const base64 = await bakeImage(panoImage);
        const dims = await getImageDimensions(base64);
        const fit = calculateContainFit(dims.width, dims.height, 0.5, 1, 9, 3.6, 0);
        
        panoSlide.addImage({
          data: base64,
          x: fit.x, y: fit.y, w: fit.w, h: fit.h,
        });
      }

      // Slide 3: Facial (3 images side by side)
      const hasFacial = facialImages.some(img => img !== null);
      if (hasFacial) {
        const facialSlide = pptx.addSlide();
        const fMarginX = 0.5;
        const fW = 2.8;
        const fH = 3.73; // approx 3:4 ratio
        const fGap = 0.2;
        
        for (let i = 0; i < 3; i++) {
          const imgData = facialImages[i];
          if (imgData) {
            const boxX = fMarginX + i * (fW + fGap);
            const boxY = 0.8;
            const base64 = await bakeImage(imgData);
            const dims = await getImageDimensions(base64);
            const fit = calculateContainFit(dims.width, dims.height, boxX, boxY, fW, fH, 0);
            
            facialSlide.addImage({
              data: base64,
              x: fit.x, y: fit.y, w: fit.w, h: fit.h,
            });
          }
        }
      }

      await pptx.writeFile({ fileName: "Dental_Presentation.pptx" });
    } catch (e) {
      console.error("PPTX Error", e);
      alert("スライドの生成中にエラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-2 md:py-8 mb-20 md:mb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8 px-2 md:px-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">プレゼン自動生成</h2>
          <p className="text-xs md:text-sm text-neutral-400">画像を配置して「出力」を押すだけで.pptxが作成されます。</p>
        </div>
        <button
          onClick={generateSlide}
          disabled={isGenerating}
          className="w-full md:w-auto bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white px-6 py-4 md:py-3 rounded-xl md:rounded-lg font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
        >
          {isGenerating ? <Move className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
          スライド（.pptx）を出力
        </button>
      </div>

      <div className="space-y-6 md:space-y-8 px-2 md:px-0">
        {/* 9-shots Grid */}
        <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-xl p-4 md:p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-white">口腔内9枚法</h3>
            <button 
              onClick={() => fileInputRef9.current?.click()}
              className="text-xs md:text-sm bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 md:py-2 rounded-lg w-full sm:w-auto border border-white/10"
            >
              画像を追加 (複数可)
            </button>
            <input 
              type="file" multiple accept="image/*" className="hidden" ref={fileInputRef9}
              onChange={(e) => handleFiles(e.target.files, "intraoral")}
            />
          </div>
          
          <div className="text-[10px] md:text-xs text-amber-500 mb-4 bg-amber-500/10 p-2 md:p-3 rounded-lg border border-amber-500/20">
            💡 ヒント：画像をタップして、別の画像（または空枠）をタップすると場所を入れ替えられます。
          </div>

          <div 
            className="grid grid-cols-3 gap-1.5 md:gap-2 bg-black/40 p-1.5 md:p-3 rounded-xl border border-white/5 shadow-inner"
            onDrop={(e) => handleDrop(e, "intraoral")}
            onDragOver={handleDragOver}
          >
            {intraoralImages.map((img, idx) => (
              <div 
                key={idx}
                onClick={() => handleGridClick(idx)}
                className={`relative aspect-[4/3] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                  ${selectedSwapIndex === idx ? 'border-teal-500 bg-teal-500/20 scale-95' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-600'}`}
              >
                {img ? (
                  <>
                    <img 
                      src={img.previewUrl} 
                      alt={`Intraoral ${idx}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ 
                        transform: `scaleX(${(img.flipH ? -1 : 1) * (img.zoom || 1)}) scaleY(${(img.flipV ? -1 : 1) * (img.zoom || 1)}) rotate(${img.rotate}deg)` 
                      }}
                    />
                    <div className="absolute top-1 right-1 flex flex-col md:flex-row gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setEditingImage({ type: "intraoral", index: idx, img }); }} className="p-1.5 md:p-1 bg-black/60 backdrop-blur-sm rounded text-white hover:bg-teal-600 active:scale-90 transition-transform" title="詳細調整">
                        <Sliders className="w-3 h-3 md:w-3 md:h-3" />
                      </button>
                      <button onClick={(e) => rotateImage("intraoral", idx, e)} className="p-1.5 md:p-1 bg-black/60 backdrop-blur-sm rounded text-white hover:bg-blue-600 active:scale-90 transition-transform" title="90度回転">
                        <RotateCw className="w-3 h-3 md:w-3 md:h-3" />
                      </button>
                      <button onClick={(e) => toggleFlip("intraoral", idx, "H", e)} className="p-1.5 md:p-1 bg-black/60 backdrop-blur-sm rounded text-white hover:bg-blue-600 active:scale-90 transition-transform" title="左右反転">
                        <FlipHorizontal className="w-3 h-3 md:w-3 md:h-3" />
                      </button>
                      <button onClick={(e) => removeImage("intraoral", idx, e)} className="p-1.5 md:p-1 bg-black/60 backdrop-blur-sm rounded text-red-400 hover:bg-red-600 hover:text-white active:scale-90 transition-transform" title="削除">
                        <Trash2 className="w-3 h-3 md:w-3 md:h-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-neutral-600 text-[10px] md:text-sm font-medium">枠 {idx + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Panoramic */}
          <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-xl p-4 md:p-6 shadow-2xl">
            <h3 className="text-base md:text-lg font-semibold text-white mb-4">パノラマレントゲン</h3>
            <div 
              onClick={() => !panoImage && fileInputRefPano.current?.click()}
              onDrop={(e) => handleDrop(e, "pano")}
              onDragOver={handleDragOver}
              className={`relative aspect-[2.5/1] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                ${panoImage ? 'border-neutral-700 bg-black/50' : 'border-neutral-700 hover:border-neutral-500 bg-black/20 shadow-inner'}`}
            >
              <input 
                type="file" accept="image/*" className="hidden" ref={fileInputRefPano}
                onChange={(e) => handleFiles(e.target.files, "pano")}
              />
              {panoImage ? (
                <>
                  <img 
                    src={panoImage.previewUrl} 
                    alt="Panoramic"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ 
                      transform: `scaleX(${(panoImage.flipH ? -1 : 1) * (panoImage.zoom || 1)}) scaleY(${(panoImage.flipV ? -1 : 1) * (panoImage.zoom || 1)}) rotate(${panoImage.rotate}deg)` 
                    }}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setEditingImage({ type: "pano", index: null, img: panoImage }); }} className="p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-teal-600 active:scale-90 transition-transform" title="詳細調整">
                      <Sliders className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button onClick={(e) => rotateImage("pano", null, e)} className="p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-blue-600 active:scale-90 transition-transform" title="90度回転">
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => toggleFlip("pano", null, "H", e)} className="p-2 md:p-2 bg-black/70 backdrop-blur-sm rounded-lg text-white hover:bg-blue-600 active:scale-90 transition-transform" title="左右反転">
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => removeImage("pano", null, e)} className="p-2 md:p-2 bg-black/70 backdrop-blur-sm rounded-lg text-red-400 hover:bg-red-600 hover:text-white active:scale-90 transition-transform" title="削除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-neutral-500 mb-2" />
                  <span className="text-neutral-500 text-xs md:text-sm">タップしてアップロード</span>
                </>
              )}
            </div>
          </div>

          {/* Facial */}
          <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-xl p-4 md:p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
              <h3 className="text-base md:text-lg font-semibold text-white">顔貌写真 (3枚)</h3>
              <button 
                onClick={() => fileInputRefFacial.current?.click()}
                className="text-xs md:text-sm bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 md:py-2 rounded-lg w-full sm:w-auto border border-white/10"
              >
                画像を追加
              </button>
              <input 
                type="file" multiple accept="image/*" className="hidden" ref={fileInputRefFacial}
                onChange={(e) => handleFiles(e.target.files, "facial")}
              />
            </div>
            
            <div 
              className="grid grid-cols-3 gap-1.5 md:gap-2 bg-black/40 p-1.5 md:p-3 rounded-xl border border-white/5 shadow-inner"
              onDrop={(e) => handleDrop(e, "facial")}
              onDragOver={handleDragOver}
            >
              {facialImages.map((img, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleFacialGridClick(idx)}
                  className={`relative aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                    ${facialSwapIndex === idx ? 'border-teal-500 bg-teal-500/20 scale-95' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-600'}`}
                >
                  {img ? (
                    <>
                      <img 
                        src={img.previewUrl} 
                        alt={`Facial ${idx}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ 
                          transform: `scaleX(${(img.flipH ? -1 : 1) * (img.zoom || 1)}) scaleY(${(img.flipV ? -1 : 1) * (img.zoom || 1)}) rotate(${img.rotate}deg)` 
                        }}
                      />
                      <div className="absolute top-1 right-1 flex flex-col gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditingImage({ type: "facial", index: idx, img }); }} className="p-1.5 md:p-1 bg-black/60 backdrop-blur-sm rounded text-white hover:bg-teal-600 active:scale-90 transition-transform" title="詳細調整">
                          <Sliders className="w-3 h-3 md:w-3 md:h-3" />
                        </button>
                        <button onClick={(e) => rotateImage("facial", idx, e)} className="p-1.5 md:p-1 bg-black/60 backdrop-blur-sm rounded text-white hover:bg-blue-600 active:scale-90 transition-transform" title="90度回転">
                          <RotateCw className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => toggleFlip("facial", idx, "H", e)} className="p-1.5 md:p-1 bg-black/60 backdrop-blur-sm rounded text-white hover:bg-blue-600 active:scale-90 transition-transform" title="左右反転">
                          <FlipHorizontal className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => removeImage("facial", idx, e)} className="p-1.5 md:p-1 bg-black/60 backdrop-blur-sm rounded text-red-400 hover:bg-red-600 hover:text-white active:scale-90 transition-transform" title="削除">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <span className="text-neutral-600 text-[10px] md:text-sm font-medium">枠 {idx + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">画像の詳細調整</h3>
              <button onClick={() => setEditingImage(null)} className="text-neutral-400 hover:text-white p-2">✕</button>
            </div>
            
            <div className="relative w-full aspect-video bg-black/50 rounded-xl overflow-hidden mb-8 border border-white/10 flex items-center justify-center">
              <img 
                src={editingImage.img.previewUrl} 
                className="max-w-full max-h-full object-contain"
                style={{ 
                  transform: `scaleX(${editingImage.img.flipH ? -1 : 1}) scaleY(${editingImage.img.flipV ? -1 : 1}) rotate(${editingImage.img.rotate}deg) scale(${editingImage.img.zoom || 1})`,
                  transition: 'transform 0.1s ease-out'
                }}
                alt="Preview"
              />
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-neutral-300">角度 (Rotate)</label>
                  <span className="text-sm text-teal-400">{editingImage.img.rotate}°</span>
                </div>
                <input 
                  type="range" min="-180" max="180" step="1" 
                  value={editingImage.img.rotate}
                  onChange={(e) => {
                    const newImg = { ...editingImage.img, rotate: parseInt(e.target.value) };
                    setEditingImage({ ...editingImage, img: newImg });
                  }}
                  className="w-full accent-teal-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-neutral-300">拡大 (Zoom)</label>
                  <span className="text-sm text-teal-400">{(editingImage.img.zoom || 1).toFixed(2)}x</span>
                </div>
                <input 
                  type="range" min="1" max="3" step="0.01" 
                  value={editingImage.img.zoom || 1}
                  onChange={(e) => {
                    const newImg = { ...editingImage.img, zoom: parseFloat(e.target.value) };
                    setEditingImage({ ...editingImage, img: newImg });
                  }}
                  className="w-full accent-teal-500"
                />
              </div>
            </div>
            
            <div className="mt-8 flex gap-4">
              <button onClick={() => setEditingImage(null)} className="flex-1 bg-neutral-800 text-white font-bold py-3 rounded-xl hover:bg-neutral-700 transition-colors">キャンセル</button>
              <button 
                onClick={() => {
                  // Save changes back to state
                  if (editingImage.type === "intraoral" && editingImage.index !== null) {
                    const newImages = [...intraoralImages];
                    newImages[editingImage.index] = editingImage.img;
                    setIntraoralImages(newImages);
                  } else if (editingImage.type === "pano") {
                    setPanoImage(editingImage.img);
                  } else if (editingImage.type === "facial" && editingImage.index !== null) {
                    const newImages = [...facialImages];
                    newImages[editingImage.index] = editingImage.img;
                    setFacialImages(newImages);
                  }
                  setEditingImage(null);
                }} 
                className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-500 transition-colors"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
