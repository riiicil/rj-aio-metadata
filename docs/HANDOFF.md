# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 2 In-Progress (In-Page Draggable Floating Overlay HUD — Scope 1 Part 1)
- **Active Branch**: `task/draggable-overlay-ui`
- **Latest Commit**: `feat(overlay): implement isolated shadow dom injection and draggable floating hud`
- **Working Tree**: Clean local branch (ready for Scope 1 Part 2)
- **Build / Test State**: Verified healthy (syntax validated, zero emoji clean)

---

## 2. Active In-Flight Context

Phase 2 Scope 1 Part 1 is complete. The In-Page Draggable Floating Overlay HUD foundation has been fully built and verified. The controller (`src/overlay/overlay.js`) mounts an isolated Shadow Root (`#rj-overlay-host` with open mode) and links scoped stylesheet `src/overlay/overlay.css`. This guarantees 100% style isolation against host page stylesheet interference across all 7 supported microstock dashboards (Adobe Stock, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, MiriCanvas).

The HUD features smooth drag-and-drop mechanics bound to `#rjHudHeader` and `#rjHudPill` with automated boundary clamping against viewport dimensions (`clampAndSetPosition`), defaulting initially to Top-Left (`top: 80px; left: 24px`) so it never obstructs native contributor metadata forms on the right. Coordinates and minimize/expanded states are automatically saved to and restored from `chrome.storage.local` under the `rj_hud_pos` key. The UI supports an Expanded HUD Card (270px width) and an Ultra-Compact Minimized Pill (32px height) with Phosphor/Lucide SVG icons. Following user design review, the pill was streamlined to display solely the RJ brand logo and "Ready" status label (removing the redundant "RJ AIO" text), and fluid spring transitions (`cubic-bezier(0.16, 1, 0.3, 1)`) were implemented for both card expand/collapse and overlay show/hide actions. The content script entry point (`src/content/content_main.js`) uses dynamic ES module imports to load `OverlayHUD` in compliance with Manifest V3 classic script execution contexts and listens for `TOGGLE_OVERLAY` messages relayed from the background service worker.

---

## 3. Recommended Next Steps for Incoming Agent

1. **Step 1 (Scope 1 Part 2 — Wire Form Controls & Bidirectional Sync)**:
   - Expand `src/overlay/overlay.js` and `overlay.css` to render active metadata input fields (Title, Description, Category, Tags).
   - Implement bidirectional state synchronization between `popup/popup.js` and the in-page overlay via storage change listeners or runtime messaging.
2. **Step 2 (Scope 2 — Platform Adapters Integration)**:
   - Connect HUD action buttons ("Auto-Tag All", "Apply Metadata", "Clear") to active platform adapters once Phase 4 adapters are in place.
3. **Step 3 (Live Browser Verification)**:
   - Load unpacked `src/` in Chromium browser (`chrome://extensions/`).
   - Navigate to contributor tabs (e.g. `contributor.stock.adobe.com`, `submit.shutterstock.com`) and verify drag physics, clamping at viewport edges, and storage persistence across reloads.

---

## 4. Critical Gotchas & Architectural Traps

Incoming agents must pay close attention to these hard-learned lessons:

1. **Manifest V3 Content Script ES Modules**:
   - Chromium does not support `"type": "module"` for `content_scripts` in `manifest.json`. Direct static `import` throws `Uncaught SyntaxError`.
   - Always load modules inside content scripts via dynamic `import(chrome.runtime.getURL(...))` and ensure imported paths are declared under `web_accessible_resources`.
2. **Web Accessible Resources for Page Injections**:
   - Any resource referenced in DOM injected into a web page (including images in Shadow DOM like `icons/logo_rj.png`) must be listed in `manifest.json` under `web_accessible_resources`.
3. **Shadow DOM Event Delegation & Button Drag Prevention**:
   - In draggable headers containing action buttons, `mousedown` events on buttons (`.rj-hud-btn-icon`) must be intercepted with `if (e.target.closest('button')) return;` to prevent drag physics from capturing clicks meant for minimize or close buttons.
4. **Dimension Shifts on Minimize / Expand**:
   - When switching between the Expanded Card (width: 270px, height: ~120px+) and Minimized Pill (height: 32px), always trigger `clampAndSetPosition()` inside `requestAnimationFrame` to ensure the element does not get pushed outside visible screen bounds if dragged close to the right or bottom edges.
5. **Chrome Storage Cache & Schema Versioning**:
   - When default schemas in `StorageService.js` are updated, existing installations retain stale data in `chrome.storage.local/sync`. Always increment `_schemaVersion` and handle automated migrations.
6. **Zero Native Emoji Policy**:
   - Native emoji characters are strictly forbidden in UI buttons, badges, modals, documentation, and commit messages. Use Lucide/Phosphor SVG icons in UI and clean text status badges (`[COMPLETE]`, `[READY]`, `[IN_PROGRESS]`) in markdown.
7. **Microstock Platform DOM Quirks (Review `docs/references/` First)**:
   - **Adobe Stock**: React Spectrum controlled inputs require prototype value setter dispatches.
   - **Shutterstock**: Uses `data-testid` attributes; Image (26) vs Video (19) categories are strictly distinct.
   - **Dreamstime**: Selecting a main category must trigger a change event to load subcategory options.
   - **Vecteezy**: Banned terms trigger a modal; sanitize keywords prior to injection.
   - **Freepik**: Metadata is transient; you **MUST** trigger `saveDraft()` per asset before switching assets.
   - **Depositphotos**: Selecting a country triggers AJAX to load city options; raw tag paste trigger available.
   - **MiriCanvas**: Capacity selector supports up to 1,000 items; must set both `contentType` and `contentTier`.

---

## 5. How to Run & Verify Locally

1. Open Google Chrome, Brave, or Microsoft Edge.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** (*Muat yang belum dibongkar*).
5. Select the directory: `C:\Users\admin\Desktop\git\RJ_AIO_Metadata\src`.
6. Navigate to any supported microstock page or test URL.
7. Verify that the HUD mounts at top-left, drags smoothly, clamps to viewport bounds, minimizes to pill, and closes cleanly.

---

## 6. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 14 | 2026-09-05 | `task/draggable-overlay-ui` | `feat(overlay)` | Streamlined minimized pill (logo + Ready) and added fluid spring animations | Wire active form controls & sync (Part 2) |
| 13 | 2026-09-05 | `task/draggable-overlay-ui` | `91a9384` | Isolated Shadow DOM injection, viewport-clamped draggable HUD, minimized pill, storage persistence | Wire active form controls & sync (Part 2) |
| 12 | 2026-09-05 | `task/popup-storage` | `5db2436` | Modular dynamic form renderer, emerald teal (#079183) theme, logo asset, 237 Depositphotos countries, schema v3 | User review of Phase 1 popup, merge to dev |
| 11 | 2026-09-04 | `task/popup-storage` | `a0c9ed9` | Smart dropup bounds detection, elevated stacking context, legible disabled field styling | Modular platform dynamic forms |
| 10 | 2026-09-04 | `task/popup-storage` | `986db5e` | Formalized DOCS_STYLE.md, restructured HANDOFF and agent logs | Finalize Phase 1 UI polish |
| 09 | 2026-09-02 | `task/popup-storage` | `8246c07` | Custom dropdown enhancer, stepper control, flexbox truncation | Finalize docs & user review |
| 08 | 2026-09-02 | `task/popup-storage` | `d80ad1a` | Fixed Gemini ?key= auth and multi-key single-line comma formatting | Custom select UX polish |
| 07 | 2026-09-02 | `task/popup-storage` | `1715f1a` | Added schema migration (_schemaVersion: 2) to reset legacy cached models | Gemini multi-key verification |
| 06 | 2026-09-02 | `task/popup-storage` | `c644b14` | Refined popup layout, full-width select, multi-key round-robin | Model caching gotchas |
| 05 | 2026-09-02 | `task/popup-storage` | `8167cc0` | Recorded Phase 1 verification and milestone documentation | Popup UX refinements |
| 04 | 2026-09-02 | `task/popup-storage` | `2772911` | Implemented platform-adaptive popup UI with dynamic models | Milestone verification |
| 03 | 2026-09-02 | `task/popup-storage` | `0afbdcc` | Implemented dynamic model fetcher and active tab router | Popup UI construction |
| 02 | 2026-09-02 | `task/popup-storage` | `e7edfd0` | Implemented StorageService, API key importer, and icons | Background worker |
| 01 | 2026-09-02 | `task/governance-docs`| `513e111` | Initialized repository governance, docs suite, and MV3 scaffold | Phase 1 storage service |
