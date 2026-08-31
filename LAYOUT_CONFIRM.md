# Wireless Connect：配置確認（実装メモ）

正本は Dental_OS の `05_R_and_D/WirelessConnect_Layout_Confirm_Spec_20260830.md`。このフォルダ側の実装対応表。

## 画面

- `src/components/LayoutConfirm.tsx` … iPad 確認グリッド、バッジ、編集シート
- `src/lib/layoutSlots.ts` … 5 / 7 / 9 の枠、バッジ、transform
- `src/components/CameraMode.tsx` … 撮影後「配置を確認する」→ 確認画面。文言に AI を出さない
- `src/server/watcher.js` … `GET/POST /api/patients/:id/layout` → `layout.json`

## 操作

1. 枠をタップ → 入れ替え先をタップ
2. 同じ枠をもう一度タップ → 左右反転 / 上下反転 / 90°回転
3. 「この配置でよい」→ PC の患者フォルダに保存。同じ並びで iPad 表示

ミラーは **鏡？** まで。黙って反転しない。

## PNG 書き出し（1.5.1）

- プレビューは黒背景。書き出しは **透過 PNG**。
- 保存先は患者フォルダ。名前:
  - `oral_{5|7|9}view_{番号}_{YYYYMMDD}_{HHmm}.png`
  - `oral_{n}view_latest.png`（上書き。スライドタブが拾う）
- 9 枚の並び（左→右、上→下）: 右側側方（半開口） / 上顎 / 左側側方（半開口） / 右側 / 正面 / 左側 / カップリング / 下顎 / 半開口
- 7 枚法は同じ 3×3 で左右側方（半開口）を空ける。

## 患者フォルダ（1.5.1）

- 番号だけで同一患者とみなす。空フォルダは作らない（写真またはカルテが着いたときだけ mkdir）。
- カルテと写真は同じフォルダ。Obsidian は `![[filename]]`。
