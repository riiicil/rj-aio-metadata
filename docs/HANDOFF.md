# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 4: Platform Adapters (Adobe Stock Live Fixes & Universal AI Parameter Adaptation Complete)
- **Active Branch**: `task/platform-adapters`
- **Latest Commit**: `fix(adobestock): resolve category selection, asset switching, language, and universal ai model parameters`
- **Working Tree**: Clean local branch
- **Build / Test State**: Verified healthy (699/699 assertions passed across test_adobe_fixes.mjs [33/33], test_subphase_4_6.mjs [57/57], test_tier3_adapters.mjs [107/107], test_tier2_adapters.mjs [94/94], test_tier1_adapters.mjs [78/78], test_base_adapter.mjs [65/65], test_storage_v4.mjs [38/38], test_ai_prompt.mjs [65/65], test_sanitizer_service.mjs [86/86], test_ai_service.mjs [76/76], zero emoji clean)

---

## 2. Active In-Flight Context

Phase 4 has completed live in-page bugfixing on Adobe Stock Contributor (`contributor.stock.adobe.com`) and universal model parameter adaptation:
1. **Adobe Stock Category Dropdown (`src/adapters/AdobeStockAdapter.js`)**:
   - Resolved category selection failure caused by React Spectrum popovers (`[data-t="content-tagger-category-select"]`).
   - Mapped all 21 Adobe categories with numeric IDs (`10001` - `10988`) via `resolveAdobeCategory`.
   - Implemented `_setSpectrumOrNativeDropdown`: clicks trigger button to expand popover, queries `div[role="option"][data-key]`, scrolls into view, and dispatches full pointer event cycle. Synchronizes native fallback `<select>`.
   - Added auto-category refresh fallback (`button[data-t="refresh-auto-category"]`).
2. **Asset Switching & Selection (`src/adapters/AdobeStockAdapter.js` & `src/overlay/overlay.js`)**:
   - Upgraded `selectCard` to target `.upload-tile [role="option"]`, inspect `aria-selected`, and dispatch the full pointer event sequence (`pointerdown` -> `mousedown` -> `pointerup` -> `mouseup` -> `click`) with button 0 and pointerType 'mouse' to trigger React Aria / Spectrum listeners.
   - Settle buffer added in `waitForEditorReady` (350ms) to allow React state transition to complete before metadata inspection.
   - Wrapped inner per-asset loop in `try/catch` in `overlay.js` so if one card encounters an issue, automation logs status and continues sequentially to the remaining assets instead of halting the entire batch.
3. **Language Selection & Propagation (`src/overlay/overlay.js`, `src/services/AiPrompt.js`, `src/adapters/AdobeStockAdapter.js`)**:
   - `overlay.js` reads `language` from platform configuration (`platformSettings[platformId].language || 'en'`) and passes it to both `generateMetadata` and `fillMetadata`.
   - `AiPrompt.js` injects strict system prompt requirements and `CRITICAL LANGUAGE REQUIREMENT` user instructions when language is not English (e.g. Korean), ensuring AI models output metadata in the requested language.
   - `AdobeStockAdapter.js` synchronizes Adobe Stock's "Title & keywords language" dropdown (`button[data-t="content-tagger-keywords-language-select"]`) to matching language codes (e.g. Korean `'14'` / `'한국'`).
4. **Universal AI Model Parameter Adaptation (`src/services/AiPrompt.js` & `src/background/service_worker.js`)**:
   - Probed and cataloged live parameter requirements across OpenAI (131 models), Gemini, Mistral (46 models), and OpenRouter.
   - Direct OpenAI `gpt-5-nano` and `o4-mini` strictly reject `temperature: 0.7` with HTTP 400 (`Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported`) and reject `max_tokens` (`Use 'max_completion_tokens' instead`).
   - Direct OpenAI `gpt-5.4-nano` accepts `temperature: 0.7`, rejects `max_tokens`, requires `max_completion_tokens`.
   - Direct Google Gemini (`gemini-2.5-flash`, `gemini-3-flash-preview`, `gemini-3.5-flash`) supports both `max_tokens` and `max_completion_tokens`.
   - OpenRouter (`openai/gpt-5`, `openai/gpt-5-mini`, `openai/gpt-5-nano`, `google/gemini-2.5-flash`) standardizes parameters.
   - `AiPrompt.js` guards payload: strict temperature models (`/^(o1|o3|o4|gpt-5)/i`) omit `temperature`, reasoning/gpt-5 models allocate `max_completion_tokens: 4096`, legacy base `gpt-4` omits `response_format`.
   - `service_worker.js` features automatic 400 Bad Request parameter self-healing: automatically strips `temperature`, swaps `max_tokens` <-> `max_completion_tokens`, or removes `response_format` and retries immediately.
   - Robust content extraction parses string or array of parts, detects `choice.message.refusal` (`MODEL_REFUSAL`), and detects `choice.finish_reason === 'length'` (`TOKEN_LIMIT_EXCEEDED`).

---

## 3. Actionable Next Steps for Incoming Agent (Phase 5)

1. **Step 1 (Branch Review & Integration)**:
   - User reviews Phase 4 changes on `task/platform-adapters` and merges into `dev` using `git merge --no-ff`.
   - Switch or branch off `dev` for `task/phase5-e2e-testing`.
2. **Step 2 (Phase 5: End-to-End Live Browser Testing & Polish)**:
   - Load unpacked extension into Chromium browser (`chrome://extensions`).
   - Live browser testing across available contributor dashboards (Adobe Stock, Shutterstock, Freepik, Vecteezy, Dreamstime, Depositphotos, MiriCanvas).
   - Verify real thumbnail extraction, vision inference, and native input injection.
3. **Step 3 (Packaging & Release)**:
   - Build extension package zip and finalize release documentation.

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
| 30 | 2026-09-07 | `task/platform-adapters` | `feat(overlay)` | Implemented adapters/index.js registry, overlay.js automation orchestrator, dom_helpers abort delays, test_subphase_4_6.mjs with 57/57 assertions (Phase 4 100% complete) | Phase 5: End-to-End Live Browser Testing & Polish |
| 29 | 2026-09-07 | `task/platform-adapters` | `feat(adapter)` | Implemented DreamstimeAdapter.js, DepositphotosAdapter.js, and MiriCanvasAdapter.js Tier 3 adapters with 107/107 assertions | Sub-phase 4.6: Adapter Registry, In-Page HUD Wiring & Verification Suite |
| 28 | 2026-09-07 | `task/platform-adapters` | `feat(adapter)` | Implemented FreepikAdapter.js (mandatory per-item save draft, 47 base models) and VecteezyAdapter.js (bulk save, software Other flow) Tier 2 adapters | Sub-phase 4.5: Tier 3 Adapters (Dreamstime, Depositphotos, MiriCanvas) & Registry |
| 27 | 2026-09-07 | `task/platform-adapters` | `feat(adapter)` | Implemented AdobeStockAdapter.js and ShutterstockAdapter.js Tier 1 platform adapters with full verification suite | Sub-phase 4.4: Tier 2 Adapters (FreepikAdapter & VecteezyAdapter) |
| 26 | 2026-09-07 | `task/platform-adapters` | `feat(adapter)` | Implemented dom_helpers.js, BaseAdapter.js abstract contract, updated manifest web_accessible_resources | Sub-phase 4.3: Tier 1 Adapters (AdobeStockAdapter & ShutterstockAdapter) |
| 25 | 2026-09-07 | `task/platform-adapters` | `feat(popup)` | Aligned Vecteezy software dropdown & Freepik 47 base models catalog in popup UI, bumped storage schema v4 with automated migrations | Sub-phase 4.2: Core Adapter Foundation (dom_helpers.js + BaseAdapter.js) |
| 24 | 2026-09-07 | `task/vision-service` | `feat(vision)` | Implemented AiService.js, service_worker.js proxy (auth router, multi-key round-robin, exponential retry), and full Phase 3 test suite | Review & merge Phase 3 to dev, then Phase 4 (Platform Adapters) |
| 23 | 2026-09-07 | `task/vision-service` | `feat(sanitizer)` | Implemented SanitizerService.js (tag rules, title/desc smart clamping, JSON repair) & refined AiPrompt.js schemas | Step 3.3: AiService.js & service_worker.js |
| 22 | 2026-09-07 | `task/vision-service` | `feat(prompt)` | Implemented AiPrompt.js with official category taxonomies, schemas, 80-keyword prompts, and payload builder | Step 3.2: SanitizerService.js |
| 21 | 2026-09-07 | `task/draggable-overlay-ui` | `56f7f1a` | Synchronized roadmap with real Phase 2 implementation, marked Phases 0, 1, 2 complete, Phase 3 next | User manual merge to dev, then Phase 3 |
| 20 | 2026-09-06 | `task/draggable-overlay-ui` | `374242f` | Enhanced toast contrast, sub-header positioning, and smooth slide-out exit animation | Review & merge Phase 2 to dev |
| 19 | 2026-09-06 | `task/draggable-overlay-ui` | `7067daa` | Minimized pill Layers asset icon separation and top-right stacked toast queue system | Review & merge Phase 2 to dev |
| 18 | 2026-09-06 | `task/draggable-overlay-ui` | `1478a5f` | Refined unknown page HUD labels (header tag, warning banner, counter) and added Shutterstock media subtabs | Review & merge Phase 2 to dev |
| 17 | 2026-09-06 | `task/draggable-overlay-ui` | `a15d14a` | HUD popup toggle without closing, Depositphotos media subtabs, Dreamstime ID mode, universal HUD | Review & merge Phase 2 to dev |
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
