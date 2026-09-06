# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 3 Complete (Ready for Merge to dev) -> Phase 4 [NEXT] (Platform Adapters)
- **Active Branch**: `task/vision-service`
- **Latest Commit**: `feat(vision): implement universal ai vision client and background proxy worker`
- **Working Tree**: Clean local branch
- **Build / Test State**: Verified healthy (227/227 assertions passed across test_ai_prompt.mjs [65/65], test_sanitizer_service.mjs [86/86], test_ai_service.mjs [76/76], zero emoji clean)

---

## 2. Active In-Flight Context

Phase 3 (Universal Vision AI Service & Prompt Engine) is now **100% complete** across all 3 components:
1. **AiPrompt.js (Step 3.1 & 3.2)**:
   - Official platform category taxonomies (Adobe Stock 21 numeric IDs, Shutterstock 26 Image / 19 Video, Dreamstime 15 Main & Subcategory trees).
   - Platform output schemas with character safety bounds: Adobe Stock & Vecteezy title <=185 (hard limit 200), Freepik & MiriCanvas title <=90 (hard limit 100), Dreamstime title <=200, descriptions uniformly target <=230 across Shutterstock, Dreamstime, and Depositphotos.
   - Vecteezy schema strictly restricted to `title` and `keywords` (description field omitted entirely).
   - Flat 80-keyword generator ordered from specific to contextual with microstock SEO rules.
   - Multimodal OpenAI payload builder (`buildChatPayload`) with model-safe parameter guards (omits `temperature` for GPT-5, o1, o3).
2. **SanitizerService.js (Step 3.2)**:
   - `extractAndParseJson`: Resiliently extracts JSON from raw LLM responses wrapped in markdown code fences, strips conversational text, cleans trailing commas, and returns structured `MALFORMED_JSON_RESPONSE` errors.
   - `sanitizeKeywords`: Microstock tag pipeline enforcing <=2 words per tag, strips noisy punctuation/emojis, filters Vecteezy filetypes and trademarks, injects user custom keywords at Index 0, deduplicates case-insensitively, and clamps to hard platform limits.
   - `sanitizeTitle` & `sanitizeDescription`: Smart boundary clamping (sentence cut, word boundary cut without mid-word splits, mandatory trailing period), and Shutterstock editorial prefix normalization (`: `, double-prefix prevention).
   - `sanitizeMetadata`: Unified facade returning standardized clean metadata payload.
3. **AiService.js & Background Proxy Worker (Step 3.3)**:
   - `imageToBase64`: Standardizes image inputs (Data URL, raw base64, HTTP/Blob) into clean base64 Data URLs.
   - `service_worker.js` Proxy: Background dispatcher handling `GENERATE_VISION_METADATA` requests to bypass browser CORS/CSP restrictions.
   - Multi-Key Round-Robin: Distributes requests across comma-separated or newline-delimited API keys via `assetIndex`.
   - Provider Authentication Mapping: Gemini (`?key=` + `x-goog-api-key`), OpenRouter (`Bearer` + `HTTP-Referer` + `X-Title`), OpenAI, Mistral, and Custom (`Bearer`).
   - Exponential Backoff Retry: Automatically retries HTTP 429 and 5xx errors with exponential backoff (1s, 2s, 4s), while immediately classifying 401 (`API_KEY_INVALID`) and 404 (`MODEL_NOT_FOUND`) without retrying.
   - `generateMetadata`: Complete pipeline facade connecting prompt building, payload construction, background proxy execution, and sanitizer output.

---

## 3. Actionable Next Steps for Incoming Agent (Phase 4)

1. **Step 1 (User Review & Merge to `dev`)**:
   - Verify that the user has reviewed `task/vision-service` and approved merging to `dev`.
   - Execute merge: `git checkout dev && git merge --no-ff task/vision-service`.
2. **Step 2 (Branch for Phase 4)**:
   - Create feature branch `task/platform-adapters` from updated `dev`.
3. **Step 3 (BaseAdapter Interface & Tier 1 Adapters)**:
   - Implement `src/adapters/BaseAdapter.js` abstract interface (`isMatch`, `getAssetCards`, `getThumbnailUrl`, `selectCard`, `clearKeywords`, `fillMetadata`, `saveDraft`, `submitForReview`).
   - Implement Tier 1 platform adapters:
     - `AdobeStockAdapter.js` (React Spectrum value setter, 21 categories).
     - `ShutterstockAdapter.js` (Material-UI testids, Image vs Video categories, spelling warnings approval).
     - `FreepikAdapter.js` (Mandatory save draft loop per asset, AI base models).
4. **Step 4 (Tier 2 Adapters & Auto-Router)**:
   - Implement `VecteezyAdapter.js`, `DreamstimeAdapter.js`, `DepositphotosAdapter.js`, and `MiriCanvasAdapter.js`.
   - Implement `src/adapters/index.js` adapter registry & auto-router.

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
