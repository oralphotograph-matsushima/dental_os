<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:oralnote-ui-rules -->
# Wireless Connect Tab Order & Dynamic Queue Rules

To maintain high usability in real-world clinical environments, the following rules for UI layout, tab order, and dynamic patient queue workflows MUST be strictly followed:

## 1. Strictly Maintained Tab Order
The navigation tabs (in both the Desktop Top Navigation and the Mobile Bottom Navigation) MUST follow this exact sequence:
1. **患者** (`search`): Patient database search & Today's active queue
2. **カルテ** (`input`): Voice-dictated AI SOAP generator
3. **Wireless Connect** (`qr`): Wireless camera (FTP) real-time preview & slide generator
4. **スライド生成** (`slide`): PPTX/PDF Treatment presentation slide generator
5. **技工指示書** (`technician`): Lab ordering sheet with auto-compressed email attachment (displays as "技工\n指示書")
6. **設定** (`settings`): General configurations

## 2. Dynamic Patient Queue (Today's Queue) in Left Sidebar
Under the **患者** (`search`) tab, the left sidebar MUST have a dual-tab layout switcher:
* **本日の診療**: Shows the daily queue with a premium circle toggle checkbox, automatic Katakana-anonymization input fields, deletion (Trash icon), and target select buttons.
* **過去のカルテ**: Regular search-by-ID/name for all patient vaults.

### Dynamic Priority Sorting
The Today's Queue list MUST sort patients dynamically (`sortedQueue`):
* Uncompleted patients (`completed?: false`) are placed at the TOP (ordered by added time).
* Completed patients (`completed: true`) are placed at the BOTTOM, styled with a low opacity (`opacity-40`) and line-through text.

### Automatic Complete Triggers
To eliminate double-handling, when a chart file is successfully saved under any of the 4 routes (PC local file save, iPad Obsidian vault routing, File System Access API save, fallback download), the target patient MUST be automatically checked completed (`completed = true`) and slid down immediately.

## 3. Katakana-Only Anonymization Rule
For absolute patient privacy, whenever a patient is registered to the daily queue, any Hanzi/Hiragana names MUST be dynamically formatted and converted to **Katakana-only last names** (e.g. `ヤマダ` via `formatToKatakanaLastName`). All vault folder paths, file titles, and wireless transfer directories MUST adhere to this Katakana-only name format.

## 4. Seamless Prop Sync between Queue and CameraMode
## 5. Layout confirm on iPad (2026-08-30)

After photos land in the active patient folder, Wireless Connect tab MUST let the clinician confirm layout on the **same-LAN iPad**. Do not send staff to ChatGPT. Copy must say 「この配置でよいですか？」 not model names.

- Templates: 5 / 7 / 9. Default 7.
- Vision may propose a slot and a **mirror suspicion**. Never auto-apply flip. Show badge `鏡？` until a human taps 左右反転 / 上下反転 / 90°回転.
- Grid badges are always visible (正 / 左右 / 上下 / 90° / 鏡？). No hover-only icons. Tap a slot twice (or tap same slot) to open a large edit sheet with finger-sized buttons.
- Tap slot A then slot B to swap photos. Confirmed layout is saved as `Patients/[id]/layout.json` on the clinic PC.
- Classification engine is swappable. Photos stay on the clinic PC as the product rule; do not add new cloud uploads of intraoral images.

See `LAYOUT_CONFIRM.md` in this folder.

<!-- END:oralnote-ui-rules -->
