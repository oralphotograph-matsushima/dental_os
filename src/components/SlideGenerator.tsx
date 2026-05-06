"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileDown, FlipHorizontal, FlipVertical, Trash2, Move } from "lucide-react";
import pptxgen from "pptxgenjs";

interface ImageData {
  id: string;
  file: File;
  previewUrl: string;
  flipH: boolean;
  flipV: boolean;
}

export default function SlideGenerator() {
  const [intraoralImages, setIntraoralImages] = useState<(ImageData | null)[]>(Array(9).fill(null));
  const [panoImage, setPanoImage] = useState<ImageData | null>(null);
  const [facialImage, setFacialImage] = useState<ImageData | null>(null);
  
  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(null);
  const [uploadTargetIndex, setUploadTargetIndex] = useState<number | null>(null);
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
      });
    } else if (type === "facial") {
      const file = files[0];
      setFacialImage({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
        flipH: false,
        flipV: false,
      });
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
    } else if (type === "facial" && facialImage) {
      setFacialImage({ ...facialImage, [direction === "H" ? "flipH" : "flipV"]: !facialImage[direction === "H" ? "flipH" : "flipV"] });
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
    } else if (type === "facial") {
      setFacialImage(null);
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

      // Slide 1: 9 Intraoral photos
      // Layout 3x3 on 10x5.625 inch slide
      // Let's make each image roughly 3x1.8 inches
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
          const x = marginX + col * (w + gapX);
          const y = marginY + row * (h + gapY);
          
          const base64 = await fileToBase64(imgData.file);
          intraoralSlide.addImage({
            data: base64,
            x, y, w, h,
            sizing: { type: "contain", w, h },
            flipH: imgData.flipH,
            flipV: imgData.flipV,
          });
        }
      }

      // Slide 2: Pano
      if (panoImage) {
        const panoSlide = pptx.addSlide();
        const base64 = await fileToBase64(panoImage.file);
        panoSlide.addImage({
          data: base64,
          x: 0.5, y: 1, w: 9, h: 3.6,
          sizing: { type: "contain", w: 9, h: 3.6 },
          flipH: panoImage.flipH,
          flipV: panoImage.flipV,
        });
      }

      // Slide 3: Facial
      if (facialImage) {
        const facialSlide = pptx.addSlide();
        const base64 = await fileToBase64(facialImage.file);
        facialSlide.addImage({
          data: base64,
          x: 2.5, y: 0.5, w: 5, h: 4.6,
          sizing: { type: "contain", w: 5, h: 4.6 },
          flipH: facialImage.flipH,
          flipV: facialImage.flipV,
        });
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
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">プレゼン自動生成（スライド）</h2>
          <p className="text-neutral-400">画像を入れて「出力」を押すだけで.pptxファイルが作成されます。</p>
        </div>
        <button
          onClick={generateSlide}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? <Move className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
          スライド（.pptx）を出力
        </button>
      </div>

      <div className="space-y-8">
        {/* 9-shots Grid */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
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
                        transform: `scaleX(${img.flipH ? -1 : 1}) scaleY(${img.flipV ? -1 : 1})` 
                      }}
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
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

        <div className="grid grid-cols-2 gap-8">
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
                    style={{ transform: `scaleX(${panoImage.flipH ? -1 : 1}) scaleY(${panoImage.flipV ? -1 : 1})` }}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
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
            <h3 className="text-lg font-semibold text-white mb-4">顔貌写真</h3>
            <div 
              onClick={() => !facialImage && fileInputRefFacial.current?.click()}
              onDrop={(e) => handleDrop(e, "facial")}
              onDragOver={handleDragOver}
              className={`relative aspect-[3/4] max-h-48 mx-auto rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                ${facialImage ? 'border-neutral-700 bg-black' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-950'}`}
            >
              <input 
                type="file" accept="image/*" className="hidden" ref={fileInputRefFacial}
                onChange={(e) => handleFiles(e.target.files, "facial")}
              />
              {facialImage ? (
                <>
                  <img 
                    src={facialImage.previewUrl} 
                    alt="Facial"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ transform: `scaleX(${facialImage.flipH ? -1 : 1}) scaleY(${facialImage.flipV ? -1 : 1})` }}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button onClick={(e) => toggleFlip("facial", null, "H", e)} className="p-2 bg-black/70 rounded text-white hover:bg-blue-600" title="左右反転">
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => toggleFlip("facial", null, "V", e)} className="p-2 bg-black/70 rounded text-white hover:bg-blue-600" title="上下反転">
                      <FlipVertical className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => removeImage("facial", null, e)} className="p-2 bg-black/70 rounded text-red-400 hover:bg-red-600 hover:text-white" title="削除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-neutral-500 mb-2" />
                  <span className="text-neutral-400 text-sm text-center">ドロップして追加</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
