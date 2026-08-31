import fs from "fs";
import path from "path";
import { isCompositePng } from "@/lib/layoutSlots";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const PHOTO_HEADING = "## 口腔内写真";

export function listPatientPhotoFiles(patientDir: string): string[] {
  if (!fs.existsSync(patientDir)) return [];
  const files = fs.readdirSync(patientDir).filter((f) => {
    if (f.startsWith(".")) return false;
    return IMAGE_EXTS.has(path.extname(f).toLowerCase());
  });

  return files.sort((a, b) => {
    const aLatest = /oral_\dview_latest\.png$/i.test(a) ? 0 : 1;
    const bLatest = /oral_\dview_latest\.png$/i.test(b) ? 0 : 1;
    if (aLatest !== bLatest) return aLatest - bLatest;
    const aComp = isCompositePng(a) ? 0 : 1;
    const bComp = isCompositePng(b) ? 0 : 1;
    if (aComp !== bComp) return aComp - bComp;
    try {
      return fs.statSync(path.join(patientDir, b)).mtimeMs - fs.statSync(path.join(patientDir, a)).mtimeMs;
    } catch {
      return a.localeCompare(b);
    }
  });
}

export function stripObsidianPhotoSection(content: string): string {
  const idx = content.indexOf(PHOTO_HEADING);
  if (idx === -1) return content.trimEnd();
  return content.slice(0, idx).trimEnd();
}

/** Obsidian は同じフォルダのファイルを ![[name]] で表示する。バイトは複製しない。 */
export function buildObsidianPhotoSection(filenames: string[]): string {
  if (filenames.length === 0) return "";
  const links = filenames.map((f) => `![[${f}]]`).join("\n\n");
  return `\n\n${PHOTO_HEADING}\n\n${links}\n`;
}

export function withObsidianPhotoLinks(content: string, patientDir: string): { markdown: string; photoCount: number } {
  const photos = listPatientPhotoFiles(patientDir);
  const body = stripObsidianPhotoSection(content);
  return {
    markdown: body + buildObsidianPhotoSection(photos),
    photoCount: photos.length,
  };
}
