"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileDown, FlipHorizontal, FlipVertical, RotateCw, Trash2, Move } from "lucide-react";
import pptxgen from "pptxgenjs";

interface ImageData {
  id: string;
  file: File;
  previewUrl: string;
  flipH: boolean;
  flipV: boolean;
  rotate: number;
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

      // Function to read file to base64
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
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
          
          const base64 = await fileToBase64(imgData.file);
          const dims = await getImageDimensions(base64);
          const fit = calculateContainFit(dims.width, dims.height, boxX, boxY, w, h, imgData.rotate);
          
          intraoralSlide.addImage({
            data: base64,
            x: fit.x, y: fit.y, w: fit.w, h: fit.h,
            flipH: imgData.flipH,
            flipV: imgData.flipV,
            rotate: imgData.rotate,
          });
        }
      }

      // Slide 2: Pano
      if (panoImage) {
        const panoSlide = pptx.addSlide();
        const base64 = await fileToBase64(panoImage.file);
        const dims = await getImageDimensions(base64);
        const fit = calculateContainFit(dims.width, dims.height, 0.5, 1, 9, 3.6, panoImage.rotate);
        
        panoSlide.addImage({
          data: base64,
          x: fit.x, y: fit.y, w: fit.w, h: fit.h,
          flipH: panoImage.flipH,
          flipV: panoImage.flipV,
          rotate: panoImage.rotate,
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
            const base64 = await fileToBase64(imgData.file);
            const dims = await getImageDimensions(base64);
            const fit = calculateContainFit(dims.width, dims.height, boxX, boxY, fW, fH, imgData.rotate);
            
            facialSlide.addImage({
              data: base64,
              x: fit.x, y: fit.y, w: fit.w, h: fit.h,
              flipH: imgData.flipH,
              flipV: imgData.flipV,
              rotate: imgData.rotate,
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
    <div className="max-w-5xl mx-auto py-4 md:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">プレゼン自動生成（スライド）</h2>
          <p className="text-neutral-400">画像を入れて「出力」を押すだけで.pptxファイルが作成されます。</p>
        </div>
        <button
          onClick={generateSlide}
          disabled={isGenerating}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? <Move className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
          スライド（.pptx）を出力
        </button>
      </div>

      <div className="space-y-8">
        {/* 9-shots Grid */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
            <h3 className="text-lg font-semibold text-white">口腔内9枚法</h3>
            <button 
              onClick={() => fileInputRef9.current?.click()}
              className="text-sm bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded"
            >
              画像を追加 (複数可)
            </button>
            <input 
              type="file" multiple accept="image/*" className="hidden" ref={fileInputRef9}
              onChange={(e) => handleFiles(e.target.files, "intraoral")}
            />
          </div>
          
          <div className="text-xs text-amber-500 mb-4 bg-amber-500/10 p-2 rounded">
            💡 ヒント：画像をタップして、別の画像（または空枠）をタップすると場所を入れ替えられます。
          </div>

          <div 
            className="grid grid-cols-3 gap-2 bg-neutral-950 p-2 rounded-lg"
            onDrop={(e) => handleDrop(e, "intraoral")}
            onDragOver={handleDragOver}
          >
            {intraoralImages.map((img, idx) => (
              <div 
                key={idx}
                onClick={() => handleGridClick(idx)}
                className={`relative aspect-[4/3] rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                  ${selectedSwapIndex === idx ? 'border-blue-500 bg-blue-500/20' : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'}`}
              >
                {img ? (
                  <>
                    <img 
                      src={img.previewUrl} 
                      alt={`Intraoral ${idx}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ 
                        transform: `scaleX(${img.flipH ? -1 : 1}) scaleY(${img.flipV ? -1 : 1}) rotate(${img.rotate}deg)` 
                      }}
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button onClick={(e) => rotateImage("intraoral", idx, e)} className="p-1 bg-black/60 rounded text-white hover:bg-blue-600" title="90度回転">
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => toggleFlip("intraoral", idx, "H", e)} className="p-1 bg-black/60 rounded text-white hover:bg-blue-600" title="左右反転">
                        <FlipHorizontal className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => toggleFlip("intraoral", idx, "V", e)} className="p-1 bg-black/60 rounded text-white hover:bg-blue-600" title="上下反転">
                        <FlipVertical className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => removeImage("intraoral", idx, e)} className="p-1 bg-black/60 rounded text-red-400 hover:bg-red-600 hover:text-white" title="削除">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-neutral-600 text-sm">枠 {idx + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Panoramic */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">パノラマレントゲン</h3>
            <div 
              onClick={() => !panoImage && fileInputRefPano.current?.click()}
              onDrop={(e) => handleDrop(e, "pano")}
              onDragOver={handleDragOver}
              className={`relative aspect-[2.5/1] rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                ${panoImage ? 'border-neutral-700 bg-black' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950'}`}
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
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ transform: `scaleX(${panoImage.flipH ? -1 : 1}) scaleY(${panoImage.flipV ? -1 : 1}) rotate(${panoImage.rotate}deg)` }}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button onClick={(e) => rotateImage("pano", null, e)} className="p-2 bg-black/70 rounded text-white hover:bg-blue-600" title="90度回転">
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => toggleFlip("pano", null, "H", e)} className="p-2 bg-black/70 rounded text-white hover:bg-blue-600" title="左右反転">
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => toggleFlip("pano", null, "V", e)} className="p-2 bg-black/70 rounded text-white hover:bg-blue-600" title="上下反転">
                      <FlipVertical className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => removeImage("pano", null, e)} className="p-2 bg-black/70 rounded text-red-400 hover:bg-red-600 hover:text-white" title="削除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-neutral-500 mb-2" />
                  <span className="text-neutral-400 text-sm">ドラッグ＆ドロップまたはクリック</span>
                </>
              )}
            </div>
          </div>

          {/* Facial */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
              <h3 className="text-lg font-semibold text-white">顔貌写真 (3枚)</h3>
              <button 
                onClick={() => fileInputRefFacial.current?.click()}
                className="text-sm bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded"
              >
                画像を追加
              </button>
              <input 
                type="file" multiple accept="image/*" className="hidden" ref={fileInputRefFacial}
                onChange={(e) => handleFiles(e.target.files, "facial")}
              />
            </div>
            
            <div 
              className="grid grid-cols-3 gap-2 bg-neutral-950 p-2 rounded-lg"
              onDrop={(e) => handleDrop(e, "facial")}
              onDragOver={handleDragOver}
            >
              {facialImages.map((img, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleFacialGridClick(idx)}
                  className={`relative aspect-[3/4] rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                    ${facialSwapIndex === idx ? 'border-blue-500 bg-blue-500/20' : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'}`}
                >
                  {img ? (
                    <>
                      <img 
                        src={img.previewUrl} 
                        alt={`Facial ${idx}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ transform: `scaleX(${img.flipH ? -1 : 1}) scaleY(${img.flipV ? -1 : 1}) rotate(${img.rotate}deg)` }}
                      />
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button onClick={(e) => rotateImage("facial", idx, e)} className="p-1 bg-black/60 rounded text-white hover:bg-blue-600" title="90度回転">
                          <RotateCw className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => toggleFlip("facial", idx, "H", e)} className="p-1 bg-black/60 rounded text-white hover:bg-blue-600" title="左右反転">
                          <FlipHorizontal className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => toggleFlip("facial", idx, "V", e)} className="p-1 bg-black/60 rounded text-white hover:bg-blue-600" title="上下反転">
                          <FlipVertical className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => removeImage("facial", idx, e)} className="p-1 bg-black/60 rounded text-red-400 hover:bg-red-600 hover:text-white" title="削除">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <span className="text-neutral-600 text-sm">枠 {idx + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
