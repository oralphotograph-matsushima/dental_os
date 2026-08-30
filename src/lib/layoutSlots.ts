export type LayoutFormat = "5" | "7" | "9";

export type LayoutSlot = {
  view: string;
  label: string;
  filename: string | null;
  flipH: boolean;
  flipV: boolean;
  rotate: number;
  mirrorSuspected: boolean;
};

export const LAYOUT_TEMPLATES: Record<LayoutFormat, { view: string; label: string }[]> = {
  "5": [
    { view: "upper", label: "上顎" },
    { view: "right", label: "右側" },
    { view: "front", label: "正面" },
    { view: "left", label: "左側" },
    { view: "lower", label: "下顎" },
  ],
  "7": [
    { view: "front", label: "正面" },
    { view: "front_half", label: "半開口" },
    { view: "coupling", label: "カップリング" },
    { view: "right", label: "右側" },
    { view: "left", label: "左側" },
    { view: "upper", label: "上顎" },
    { view: "lower", label: "下顎" },
  ],
  "9": [
    { view: "right", label: "右側" },
    { view: "front", label: "正面" },
    { view: "left", label: "左側" },
    { view: "right_overjet", label: "右側側方" },
    { view: "front_half", label: "半開口" },
    { view: "left_overjet", label: "左側側方" },
    { view: "upper", label: "上顎" },
    { view: "coupling", label: "カップリング" },
    { view: "lower", label: "下顎" },
  ],
};

const VIEW_FALLBACKS: Record<string, string[]> = {
  front_half: ["front"],
  coupling: ["front", "smile"],
};

export function emptySlot(view: string, label: string): LayoutSlot {
  return {
    view,
    label,
    filename: null,
    flipH: false,
    flipV: false,
    rotate: 0,
    mirrorSuspected: false,
  };
}

export function buildSlotsFromAnalysis(
  format: LayoutFormat,
  viewMap: Record<string, string[]>,
  metaByFile: Record<string, { mirrorSuspected?: boolean }>
): LayoutSlot[] {
  const used = new Set<string>();
  return LAYOUT_TEMPLATES[format].map(({ view, label }) => {
    const candidates = [view, ...(VIEW_FALLBACKS[view] || [])];
    let filename: string | null = null;
    for (const key of candidates) {
      const list = viewMap[key] || [];
      const found = list.find((f) => !used.has(f));
      if (found) {
        filename = found;
        used.add(found);
        break;
      }
    }
    const meta = filename ? metaByFile[filename] : undefined;
    return {
      view,
      label,
      filename,
      flipH: false,
      flipV: false,
      rotate: 0,
      mirrorSuspected: !!meta?.mirrorSuspected,
    };
  });
}

export function slotBadge(slot: LayoutSlot): { text: string; tone: "plain" | "gold" | "suggest" } {
  if (slot.mirrorSuspected && !slot.flipH && !slot.flipV && slot.rotate === 0) {
    return { text: "鏡？", tone: "suggest" };
  }
  const parts: string[] = [];
  if (slot.flipH && slot.flipV) parts.push("左右+上下");
  else if (slot.flipH) parts.push("左右");
  else if (slot.flipV) parts.push("上下");
  if (slot.rotate) parts.push(`${slot.rotate}°`);
  if (parts.length === 0) return { text: "正", tone: "plain" };
  return { text: parts.join(" "), tone: "gold" };
}

export function slotTransform(slot: LayoutSlot): string {
  const sx = slot.flipH ? -1 : 1;
  const sy = slot.flipV ? -1 : 1;
  return `scaleX(${sx}) scaleY(${sy}) rotate(${slot.rotate}deg)`;
}
