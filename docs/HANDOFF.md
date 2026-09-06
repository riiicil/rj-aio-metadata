# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 3 in progress (Step 3.1 complete, Step 3.2 next)
- **Active Branch**: `task/vision-service`
- **Latest Commit**: `feat(prompt): implement platform-adaptive prompt engine and schema builder`
- **Working Tree**: Clean local branch
- **Build / Test State**: Verified healthy (55/55 test assertions passed in scratch/test_ai_prompt.mjs, zero emoji clean)

---

## 2. Active In-Flight Context

Phase 3 (Universal Vision AI Service & Prompt Engine) is officially underway. In Step 3.1, the core prompt engine (`src/services/AiPrompt.js`) was implemented and fully verified with zero external dependencies.

`src/services/AiPrompt.js` serves as the single source of truth for:
1. **Official Platform Category Dictionaries (`PLATFORM_CATEGORIES`)**:
   - Adobe Stock: 21 official categories with numeric ID mappings (`10001` through `10988`).
   - Shutterstock: 26 Image categories vs 19 Video categories (strictly omitting abstract, beauty, interiors, vintage, etc. on video).
   - Dreamstime: Complete 15 Main categories and hierarchical subcategory trees extracted from `docs/references/analysis_dreamstime.md` Section 6.
   - Depositphotos, Vecteezy, Freepik, MiriCanvas: Defined as empty dictionaries (category selection not required on these platforms).
2. **Platform Schema & Output Format Generator (`getPlatformOutputSchema`)**:
   - Dynamic JSON schema representation for all 7 platforms.
   - Enforces Dreamstime 3 category pairs for standard uploads vs 2 category pairs for AI-generated assets (3rd slot reserved by platform).
   - Omit category fields entirely for platforms without category requirements.
3. **Structured Microstock Prompt Generator (`buildPrompt`)**:
   - System prompt establishing world-class microstock SEO specialist persona.
   - Enforces flat 80-keyword quota ordered by relevance from primary subject to broader contextual terms.
   - Keyword structure: single word or maximum 2 words per tag without punctuation.
   - Prohibits spammy/banned terms (`best`, `top`, `isolated`, `white background`, `no people`, `copy space`, trademarks).
   - Injects Adobe Stock non-English language instructions when configured.
4. **Multimodal OpenAI Chat Payload Builder (`buildChatPayload`)**:
   - Constructs standard `POST /v1/chat/completions` request body with `response_format: { type: "json_object" }` and `max_completion_tokens: 1200`.
   - Normalizes Base64 image URIs (`normalizeBase64Image`), formatting clean `data:image/jpeg;base64,...` with `detail: "low"` to save >90% tokens.
   - **Critical Parameter Safety Guard**: Detects GPT-5 and reasoning models (`/^(o1|o3|gpt-5)/i.test(model)`) and automatically omits the `temperature` parameter to prevent HTTP 400 rejection errors.

---

## 3. Recommended Next Steps for Incoming Agent

1. **Step 1 (Step 3.2 — Comprehensive Sanitizer Engine)**:
   - Implement `src/services/SanitizerService.js` handling keyword sanitization, symbol stripping, title length clamping, and platform-specific banned term removal.
2. **Step 2 (Step 3.3 — Universal Vision Client & Service Worker Proxy)**:
   - Implement `src/services/AiService.js` and update `src/background/service_worker.js` with multi-key round-robin, rate-limiting, exponential backoff, and CORS background routing.
3. **Step 3 (Verification)**:
   - Run unit test suites and verify cross-model requests across Gemini, Mistral, OpenAI, and OpenRouter.

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
