"use client";

import React, { forwardRef } from "react";
import { LayoutFormat, LayoutSlot, slotTransform } from "@/lib/layoutSlots";

type Props = {
  format: LayoutFormat;
  slots: LayoutSlot[];
  imageUrl: (filename: string) => string;
  patientLabel?: string;
};

function SlotCell({
  slot,
  imageUrl,
  className = "",
}: {
  slot?: LayoutSlot;
  imageUrl: (filename: string) => string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-neutral-950 ${className}`}>
      {slot?.filename ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(slot.filename)}
          alt={slot.label}
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: slotTransform(slot) }}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-neutral-700 text-sm font-bold">
          {slot?.label || ""}
        </span>
      )}
    </div>
  );
}

const OralLayoutCanvas = forwardRef<HTMLDivElement, Props>(function OralLayoutCanvas(
  { format, slots, imageUrl, patientLabel },
  ref
) {
  const byView = (view: string) => slots.find((s) => s.view === view);

  return (
    <div
      ref={ref}
      className="bg-[#0a0a0a] p-5 w-[1280px] aspect-[16/9] flex flex-col gap-3"
    >
      <div className="flex justify-between items-end px-2">
        <h1 className="text-2xl font-bold text-white tracking-[0.2em]">ORAL PHOTOGRAPH</h1>
        <p className="text-sm text-neutral-400 font-mono">
          {format}枚法{patientLabel ? `  /  ${patientLabel}` : ""}
        </p>
      </div>

      {format === "5" ? (
        <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-2 min-h-0">
          <div />
          <SlotCell slot={byView("upper")} imageUrl={imageUrl} />
          <div />
          <SlotCell slot={byView("right")} imageUrl={imageUrl} />
          <SlotCell slot={byView("front")} imageUrl={imageUrl} />
          <SlotCell slot={byView("left")} imageUrl={imageUrl} />
          <div />
          <SlotCell slot={byView("lower")} imageUrl={imageUrl} />
          <div />
        </div>
      ) : format === "7" ? (
        <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-2 min-h-0">
          <SlotCell slot={byView("front_half")} imageUrl={imageUrl} />
          <SlotCell slot={byView("front")} imageUrl={imageUrl} />
          <SlotCell slot={byView("coupling")} imageUrl={imageUrl} />
          <SlotCell slot={byView("right")} imageUrl={imageUrl} />
          <div className="bg-transparent" />
          <SlotCell slot={byView("left")} imageUrl={imageUrl} />
          <SlotCell slot={byView("upper")} imageUrl={imageUrl} />
          <SlotCell slot={byView("lower")} imageUrl={imageUrl} />
          <div className="bg-transparent" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-2 min-h-0">
          {slots.map((slot) => (
            <SlotCell key={slot.view} slot={slot} imageUrl={imageUrl} />
          ))}
        </div>
      )}
    </div>
  );
});

export default OralLayoutCanvas;
