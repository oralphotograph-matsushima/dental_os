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
