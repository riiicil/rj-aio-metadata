# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 2 Complete (In-Page Draggable Floating Overlay HUD)
- **Active Branch**: `task/draggable-overlay-ui`
- **Latest Commit**: `fix(ui): enforce model selection for automation and disable fields during processing`
- **Working Tree**: Clean local branch (ready for review & merge to `dev`)
- **Build / Test State**: Verified healthy (syntax validated, zero emoji clean)

---

## 2. Active In-Flight Context

Phase 2 (In-Page Draggable Floating Overlay HUD) is 100% complete. The overlay HUD controller (`src/overlay/overlay.js`) mounts an isolated Shadow DOM (`#rj-overlay-host` with open mode) linking scoped stylesheet `src/overlay/overlay.css`, ensuring complete style immunity across all 7 supported microstock dashboards (Adobe Stock, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, MiriCanvas).

The HUD features viewport-clamped drag-and-drop physics, fluid spring transitions (`cubic-bezier(0.16, 1, 0.3, 1)`), dual-mode display (270px Expanded Card and 32px Minimized Pill), and persistent coordinates stored in `chrome.storage.local`. In this session (Scope 2 Part 2 & Polish), the HUD body was fully populated with:
1. **Live Asset Detection & Counter**: Automatic querying for unsubmitted cards across all 7 platforms (Adobe Stock `div.upload-tile`, Shutterstock `div[data-testid="asset-card"]`, Freepik `div.catalog__item`, Vecteezy `div[data-testid="resource-card"]`, Dreamstime `div.upload-item[id]`, Depositphotos `tr.unfinished__item`, MiriCanvas `div.css-1qnaji9.e1pyeb4g3, div.panda-ehlNbj div.panda-gFNlpN`) with periodic (2.5s) and `MutationObserver` reactive updates.
2. **Adaptive Quick Form**: Target keyword stepper with platform limit clamping (Adobe: 49, Dreamstime: 70, MiriCanvas: 25, others: 50), Index-0 priority specific keywords input with debounced persistence, and platform-adaptive AI Declaration toggle (hidden on Shutterstock & Depositphotos).
3. **Primary Action Button**: Start/Stop automation button styled in deep emerald teal (`#079183`) toggling to danger red (`#ff6161`), paired with a mini progress track.
4. **Bidirectional Synchronization**: Real-time state synchronization wired via `chrome.storage.onChanged` between the in-page HUD and `popup/popup.js`. Changing form inputs or toggling automation in either interface instantly updates the other without reload.
5. **Dynamic Pill Status**: Minimized pill reflects live asset count (`12 Assets`) when idle and changes to `Running...` during automation.
6. **Model Selection Guard**: Start Automation button in both popup and HUD is automatically disabled when the active provider lacks an API key or selected model, dynamically re-evaluating when switching providers or selecting models.
7. **Processing State Safety**: All configuration controls across both the popup and in-page HUD are disabled during active execution (`isAutomationRunning === true`), preventing accidental configuration changes during processing.

---

## 3. Recommended Next Steps for Incoming Agent

1. **Step 1 (User Review & Merge to Dev)**:
   - Present Phase 2 completion for user review.
   - Once approved, merge `task/draggable-overlay-ui` into `dev` using `git merge --no-ff`.
2. **Step 2 (Phase 3 — Universal Vision Service)**:
   - Branch `task/vision-service` off `dev`.
   - Implement `src/services/AIService.js` (universal OpenAI-compatible multimodal chat completions client with multi-key round-robin support) and `src/services/PromptTemplates.js` (platform-tailored system prompts for microstock metadata generation).
3. **Step 3 (Live Browser Verification)**:
   - Load unpacked `src/` in Chromium browser (`chrome://extensions/`).
   - Navigate to contributor tabs (e.g. `contributor.stock.adobe.com`, `submit.shutterstock.com`) and verify live card count detection, stepper boundaries, and popup bidirectional synchronization.

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
| 17 | 2026-09-06 | `task/draggable-overlay-ui` | `fix(overlay)` | HUD popup toggle without closing, Depositphotos media subtabs, Dreamstime ID mode, universal HUD | Review & merge Phase 2 to dev |
| 16 | 2026-09-05 | `task/draggable-overlay-ui` | `5ca97ed` | Model selection guard for automation and disabled fields during processing | Review & merge Phase 2 to dev |
| 15 | 2026-09-05 | `task/draggable-overlay-ui` | `ce1539c` | Adaptive quick form, live asset counter across 7 platforms, and bidirectional sync | Review & merge Phase 2 to dev |
| 14 | 2026-09-05 | `task/draggable-overlay-ui` | `8e48601` | Streamlined minimized pill (logo + Ready) and added fluid spring animations | Wire active form controls & sync (Part 2) |
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
