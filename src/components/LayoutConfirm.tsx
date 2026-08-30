"use client";

import React, { useState } from "react";
import { CheckCircle, FlipHorizontal, FlipVertical, RotateCw, X } from "lucide-react";
import { LayoutSlot, slotBadge, slotTransform } from "@/lib/layoutSlots";

type Props = {
  slots: LayoutSlot[];
  imageUrl: (filename: string) => string;
  confirmed: boolean;
  onChange: (slots: LayoutSlot[]) => void;
  onBack: () => void;
  onConfirm: () => void;
};

export default function LayoutConfirm({ slots, imageUrl, confirmed, onChange, onBack, onConfirm }: Props) {
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateSlot = (index: number, patch: Partial<LayoutSlot>) => {
    const next = slots.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  };

  const handleSlotTap = (index: number) => {
    if (swapIndex === null) {
      setSwapIndex(index);
      return;
    }
    if (swapIndex === index) {
      setEditingIndex(index);
      setSwapIndex(null);
      return;
    }
    const next = [...slots];
    const a = next[swapIndex];
    const b = next[index];
    next[swapIndex] = {
      ...a,
      filename: b.filename,
      flipH: b.flipH,
      flipV: b.flipV,
      rotate: b.rotate,
      mirrorSuspected: b.mirrorSuspected,
    };
    next[index] = {
      ...b,
      filename: a.filename,
      flipH: a.flipH,
      flipV: a.flipV,
      rotate: a.rotate,
      mirrorSuspected: a.mirrorSuspected,
    };
    onChange(next);
    setSwapIndex(null);
  };

  const editing = editingIndex !== null ? slots[editingIndex] : null;
  const cols = slots.length <= 5 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">この配置でよいですか？</h2>
          <p className="text-xs text-neutral-400 mt-1">
            枠をタップして入れ替え。同じ枠をもう一度タップすると反転・回転できます。
          </p>
        </div>
        <button onClick={onBack} className="text-neutral-400 hover:text-white text-sm underline underline-offset-4">
          撮り直しへ戻る
        </button>
      </div>

      {swapIndex !== null && (
        <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          入れ替え先の枠をタップしてください
        </div>
      )}

      <div className={`grid ${cols} gap-2`}>
        {slots.map((slot, index) => {
          const badge = slotBadge(slot);
          const selected = swapIndex === index;
          const tone =
            badge.tone === "gold"
              ? "bg-[#C5A880] text-black"
              : badge.tone === "suggest"
                ? "bg-transparent text-cyan-300 border border-dashed border-cyan-400"
                : "bg-black/70 text-neutral-300";
          const ring =
            badge.tone === "gold"
              ? "ring-2 ring-[#C5A880]"
              : badge.tone === "suggest"
                ? "ring-2 ring-cyan-400/80"
                : "ring-1 ring-neutral-800";
          return (
            <button
              key={`${slot.view}-${index}`}
              type="button"
              onClick={() => handleSlotTap(index)}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-950 text-left ${ring} ${selected ? "scale-95 ring-2 ring-teal-400" : ""}`}
            >
              {slot.filename ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl(slot.filename)}
                  alt={slot.label}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: slotTransform(slot) }}
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-neutral-600 text-xs">{slot.label}</span>
              )}
              <span className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/75 text-[11px] text-white truncate">
                {slot.label}
              </span>
              <span className={`absolute bottom-7 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${tone}`}>
                {badge.text}
              </span>
            </button>
          );
        })}
      </div>

      {!confirmed ? (
        <button
          type="button"
          onClick={onConfirm}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95"
        >
          <CheckCircle className="w-5 h-5" />
          この配置でよい
        </button>
      ) : (
        <p className="text-center text-sm text-emerald-400 font-bold">確定済み。この並びで iPad に出せます。</p>
      )}

      {editing && editingIndex !== null && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white">{editing.label}</h3>
            <button onClick={() => setEditingIndex(null)} className="p-2 text-neutral-400">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="relative flex-1 min-h-[240px] bg-black rounded-2xl overflow-hidden border border-white/10">
            {editing.filename ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(editing.filename)}
                alt={editing.label}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ transform: slotTransform(editing) }}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-neutral-500">写真なし</span>
            )}
            <span className={`absolute bottom-3 left-3 px-2 py-1 rounded text-xs font-bold ${
              slotBadge(editing).tone === "gold"
                ? "bg-[#C5A880] text-black"
                : slotBadge(editing).tone === "suggest"
                  ? "border border-dashed border-cyan-400 text-cyan-300"
                  : "bg-black/70 text-neutral-300"
            }`}>
              {slotBadge(editing).text}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              type="button"
              onClick={() => updateSlot(editingIndex, { flipH: !editing.flipH, mirrorSuspected: false })}
              className="min-h-[56px] bg-neutral-800 text-white font-bold rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95"
            >
              <FlipHorizontal className="w-6 h-6" />
              左右反転
            </button>
            <button
              type="button"
              onClick={() => updateSlot(editingIndex, { flipV: !editing.flipV, mirrorSuspected: false })}
              className="min-h-[56px] bg-neutral-800 text-white font-bold rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95"
            >
              <FlipVertical className="w-6 h-6" />
              上下反転
            </button>
            <button
              type="button"
              onClick={() => updateSlot(editingIndex, { rotate: (editing.rotate + 90) % 360, mirrorSuspected: false })}
              className="min-h-[56px] bg-neutral-800 text-white font-bold rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95"
            >
              <RotateCw className="w-6 h-6" />
              90°回転
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
