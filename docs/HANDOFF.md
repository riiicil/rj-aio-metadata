# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 1 Complete (Manifest V3 Foundation, Storage Service & Platform-Adaptive Popup UI)
- **Active Branch**: `task/popup-storage`
- **Latest Commit**: `85e1125` `fix(ui): add smart dropup bounds detection and refine legible disabled field contrast`
- **Working Tree**: Clean working tree (ready for merge)
- **Build / Test State**: Verified healthy (syntax validated, unit tests passing, manifest valid)

---

## 2. Active In-Flight Context

Phase 1 scope is **100% complete and thoroughly verified**. The extension features a comprehensive multi-provider settings engine, API key file importer with multi-key round-robin distribution, dynamic `/v1/models` live fetching with Gemini query authentication, real-time active tab platform detection, platform-adaptive dynamic forms across all 7 supported microstock platforms, custom number stepper controls, and zero-dependency floating custom dropdowns (`CustomSelect`) strictly adhering to the Raycast Dark Precision design system.

The user has reviewed and approved the Phase 1 UI. We are ready to merge `task/popup-storage` into dev and kick off **Phase 2: In-Page Draggable Floating Overlay HUD**.

---

## 3. Recommended Next Steps for Incoming Agent

1. **Step 1 (Merge Phase 1 into Dev)**:
   - Verify working tree is clean.
   - Switch to `dev`: `git checkout dev`.
   - Merge with non-fast-forward: `git merge --no-ff task/popup-storage -m "merge 'task/popup-storage' into dev"`.
2. **Step 2 (Create Phase 2 Feature Branch)**:
   - Branch off `dev`: `git checkout -b task/draggable-overlay-ui`.
3. **Step 3 (Implement In-Page Draggable Overlay HUD)**:
   - Create `src/overlay/overlay.html`, `overlay.css`, `overlay.js`.
   - Implement draggable floating HUD injected via `src/content/content_main.js` into active microstock contributor tabs.
   - Wire overlay activation toggle to the popup's "Open HUD" button (`TOGGLE_OVERLAY_HUD`).
   - Ensure all controls in the overlay use the Raycast Dark Precision design system with zero native emojis.

---

## 4. Critical Gotchas & Architectural Traps

Incoming agents must pay close attention to these hard-learned lessons:

1. **Chrome Storage Cache & Schema Versioning**:
   - When default schemas in `StorageService.js` are updated, existing installations retain stale data in `chrome.storage.local/sync`.
   - Always increment `_schemaVersion` and handle automated migrations in `StorageService._processLoadedConfig()` to purge legacy data.
2. **HTML Single-Line Input Newline Stripping**:
   - Blink/Chromium automatically strips or collapses newlines (`\r\n`) when setting `.value` on `<input type="password">` or `<input type="text">`.
   - Multi-line API keys must be formatted and parsed as comma-separated values (`key1, key2, ...`) via `StorageService.parseApiKeys()`.
3. **Google Gemini Authentication Requirements**:
   - Google Gemini's REST gateway on `generativelanguage.googleapis.com` rejects `/models` requests that only provide `Bearer` auth headers.
   - Always append `?key=${encodeURIComponent(activeKey)}` and include the `x-goog-api-key` header when communicating with Gemini endpoints.
4. **Flexbox Strict Truncation in Extension Popups**:
   - Flex children containing text with `text-overflow: ellipsis` default to `min-width: auto`.
   - Always specify `min-width: 0; max-width: 100%;` on `.rj-select-wrapper` and `.rj-select-trigger`, otherwise long model names expand the dropdown and push adjacent action buttons off-screen.
5. **Zero Native Emoji Policy**:
   - Native emoji characters are strictly forbidden in UI buttons, badges, modals, documentation, and commit messages.
   - Use Lucide/Phosphor SVG icons in UI and clean text status badges (`[COMPLETE]`, `[READY]`, `[IN_PROGRESS]`) in markdown.
6. **Microstock Platform DOM Quirks (Review `docs/references/` First)**:
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
6. Click the extension icon in the browser toolbar to open the popup.
7. To inspect background logs: On `chrome://extensions/`, click `service worker` under RJ AIO Metadata to open DevTools.

---

## 6. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 11 | 2026-09-04 | `task/popup-storage` | `85e1125` | Smart dropup bounds detection, elevated stacking context, legible disabled field styling | Merge to `dev`, start Phase 2 |
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
