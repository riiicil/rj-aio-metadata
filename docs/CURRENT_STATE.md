# Current Project State — RJ AIO Metadata Extension

*Last Updated: 2026-09-10*<br>
*Active Branch: `task/platform-adapters`*<br>
*Current Milestone: Phase 4: Platform Adapters (Shutterstock Editorial Prefix Reset, Strict Keyword Chip Check & Model Storage Quota Fix Complete; Adobe Stock Live Fixes Verified)*

---

## 1. Current Phase Progress

- **Phase 0 — Governance & Research**: [COMPLETE] (Repository governance, design system, reference analyses)
- **Phase 1 — Storage & Popup UI**: [COMPLETE] (Storage engine, background worker, modular platform-dynamic popup UI merged to dev)
- **Phase 2 — In-Page Draggable Overlay HUD**: [COMPLETE] (Shadow DOM HUD, draggable physics, adaptive quick form, live asset counter, multi-platform media detection, popup toggle, bidirectional sync merged to dev)
- **Phase 3 — Universal Vision Service**: [COMPLETE] (Step 3.1 Prompt Engine, Step 3.2 Sanitizer Engine, Step 3.3 Universal Vision Client & Background Proxy Worker complete, merged to dev)
- **Phase 4 — Platform Adapters**: [COMPLETE] (Sub-phase 4.1 Complete: Vecteezy & Freepik popup AI model taxonomies aligned, Schema v4 migrated; Sub-phase 4.2 Complete: Core Adapter Foundation implemented with dom_helpers.js and BaseAdapter.js; Sub-phase 4.3 Complete: Tier 1 Adapters AdobeStockAdapter.js & ShutterstockAdapter.js implemented; Sub-phase 4.4 Complete: Tier 2 Adapters FreepikAdapter.js & VecteezyAdapter.js implemented; Sub-phase 4.5 Complete: Tier 3 Adapters DreamstimeAdapter.js, DepositphotosAdapter.js, and MiriCanvasAdapter.js implemented; Sub-phase 4.6 Complete: Adapter Registry index.js, In-Page HUD Wiring & Automation Orchestrator overlay.js; Adobe Stock Live Fixes Round 1-5 Verified; Shutterstock CORS Bypass via Background Image Proxy, Deep MUI Selectors, Sequential Keyword Clearing, Spelling Warning Polling, Save Spinner Wait & Deselect Page Wired, LoggerService Integrated; Editorial Prefix Auto-Clear on Toggle Off & Overlay Guard, Strict Keyword Chip Detection on Empty Assets, OpenRouter/Multi-Vendor Model Selection Storage Quota Resolution)
- **Phase 5 — End-to-End Testing & Polish**: [PLANNED] (E2E live verification & packaging)

---

## 2. Branches Matrix

| Branch | Status | Purpose |
| :--- | :--- | :--- |
| `main` | Clean (1 empty commit) | Stable production releases only |
| `dev` | Integration (Phase 0, 1, 2, 3 merged) | Active development integration branch |
| `task/platform-adapters` | Active (Adobe Stock & Shutterstock Refactored) | Phase 4: Platform Adapters & Automation Engine |

---

## 3. Platform Support & Adapter Matrix

| Platform | DOM Mapping | Vision Extraction | Auto-Fill Strategy | Save/Draft Strategy | Implementation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Adobe Stock** | READY | READY | READY | READY | [LIVE_FIXES_VERIFIED] |
| **Shutterstock** | READY | READY | READY | READY | [LIVE_FIXES_APPLIED] |
| **Dreamstime** | READY | READY | READY | READY | [TESTED_AND_WIRED] |
| **Vecteezy** | READY | READY | READY | READY | [TESTED_AND_WIRED] |
| **Freepik** | READY | READY | READY | READY | [TESTED_AND_WIRED] |
| **Depositphotos** | READY | READY | READY | READY | [TESTED_AND_WIRED] |
| **MiriCanvas** | READY | READY | READY | READY | [TESTED_AND_WIRED] |

---

## 4. What Exists

- **Root Governance & Config:**
  - `AGENTS.md` — Mandatory agent instructions, reading order, branch rules, conventional commit format.
  - `DESIGN.md` — Raycast Dark Precision design system tokens, color palettes, and strict Icon Policy (zero native emoji).
  - `LICENSE` — MIT License (2026 Riiicil).
  - `README.md` — Project identity, features, supported platforms, architecture, clean styling.
  - `CHANGELOG.md` — Release history and milestone logs.
  - `.gitignore` — Exclusion rules for `node_modules/`, `bahan/`, `dev-tools/`, `scratch/`, `.env`, logs.
  - `send-me-coffee.jpg` — Coffee donation asset.
- **Documentation Suite (`docs/`):**
  - `docs/DOCS_STYLE.md` — Documentation standards, formatting rules, and strict templates.
  - `docs/ARCHITECTURE.md` — Manifest V3 architecture, lifecycle diagrams, data flow.
  - `docs/CURRENT_STATE.md` — Living project dashboard and inventory (this file).
  - `docs/DECISIONS.md` — Architectural Decision Records (ADR-001 through ADR-007).
  - `docs/GIT_POLICY.md` — Branching model, commit rules, merge strategy.
  - `docs/HANDOFF.md` — Operational continuity guide, gotchas, and recent session log.
  - `docs/ROADMAP.md` — Phase execution roadmap and milestone checklists.
  - `docs/agent-logs/2026-09-02.md` — Session Entries 1 through 9 (newest on top).
  - `docs/agent-logs/2026-09-04.md` — Session Entries 1 and 2 (Docs and UI bounds detection).
  - `docs/agent-logs/2026-09-05.md` — Session Entries 1 through 6 (newest on top).
  - `docs/agent-logs/2026-09-06.md` — Session Entries 1 through 4 (HUD polish, media tabs, single asset ID, label refinement, Shutterstock subtabs, pill layers icon, top-right stacked toast queue, below-header positioning, slide-out exit animation).
  - `docs/agent-logs/2026-09-07.md` — Session Entries 1 through 4 (Phase 2 audit, Step 3.1 Prompt Engine, Step 3.2 Sanitizer Engine, Step 3.3 Vision Client & Background Proxy Worker).
  - `docs/references/` — 8 technical reference analyses for Adobe Stock, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, MiriCanvas, and Vision APIs.
- **Source Code (`src/`):**
  - `src/manifest.json` — Chromium Manifest V3 configuration with universal content scripts matches (`http://*/*`, `https://*/*`), permissions, icons, action, service worker (type: module), web accessible resources (`overlay/*`, `styles/*`, `icons/*`, `services/*`).
  - `src/icons/` — Extension icons (`icon16.png`, `icon48.png`, `icon128.png`, `logo_rj.png` branding logo).
  - `src/services/AiPrompt.js` — Platform-adaptive prompt engine, official category dictionaries (Adobe Stock 21 IDs, Shutterstock 26 Image / 19 Video, Dreamstime 15 Main & subcategories), dynamic JSON schemas with safety bounds (Adobe/Vecteezy title <=185, Freepik/MiriCanvas title <=90, descriptions <=230), Vecteezy schema strictly restricted to title and keywords without description, flat 80-keyword generator, target language prompt enforcement, and multimodal OpenAI payload builder with model-safe parameter guards (strict temperature omission for reasoning/gpt-5 models, modern max_completion_tokens allocation, and legacy response_format handling).
  - `src/services/SanitizerService.js` — Comprehensive microstock sanitizer engine with robust JSON extractor/repairer, keyword validation pipeline (word count <=2, punctuation stripping, Vecteezy/general prohibited terms, custom keyword index-0 priority, case-insensitive deduplication, platform quota clamping), title and description smart boundary clamping (sentence boundary, word boundary without mid-word cuts, trailing period), Shutterstock editorial prefix normalization, and unified metadata facade.
  - `src/services/AiService.js` — Universal OpenAI-compatible multimodal vision client, image base64 converter (Data URL, raw base64, HTTP/Blob), end-to-end generateMetadata pipeline facade, and injectable dispatcher.
  - `src/services/StorageService.js` — Storage engine with multi-provider config, schema version 4 migration, official Freepik 47 base models catalog, Vecteezy software generator options, multi-key round-robin, keyword priority, and loadConfig alias with non-extension environment fallback.
  - `src/background/service_worker.js` — ES module background worker with dynamic `/v1/models` fetcher, active tab evaluator, platform navigator, overlay relay, and `GENERATE_VISION_METADATA` proxy router with multi-key round-robin rotation, provider authentication mapping (Gemini, OpenRouter, OpenAI, Mistral, Custom), 400 Bad Request parameter self-healing retry (temperature removal, completion token swapping, response_format stripping), exponential backoff retry handler (429/5xx), multi-part content extraction, and diagnostic error reporting.
  - `src/styles/variables.css` — Raycast Dark Precision design tokens with deep emerald teal (`#079183`) primary accent palette.
  - `src/styles/components.css` — Raycast Dark Precision form components, emerald teal accent interactive states, custom stepper control, floating custom select styles, transparent warning banner, active HUD button outline style (`.rj-btn-active`), top-right stacked toast notification system (`.rj-toast-container`, `.rj-toast-item`, `.rj-toast-text`, `.rj-toast-close`), and disabled states for buttons, inputs, steppers, and switches.
  - `src/popup/popup.html` — Platform-adaptive toolbar popup interface with brand logo image integration, modular dynamic platform settings container, and top-right stacked toast container adhering to `DESIGN.md`.
  - `src/popup/popup.css` — 380px dark canvas popup styling with brand logo image styling and sticky header/footer.
  - `src/popup/popup.js` — Popup controller managing live tab matching, file importer, dynamic models, 100% modular platform-dynamic form rendering with official Vecteezy software dropdown & conditional custom software input, verified 47 Freepik official base models catalog, bidirectional storage synchronization (`chrome.storage.onChanged`), model selection guard for Start Automation button, full form disabling during active processing, interactive in-place HUD toggle button with active outline state, and 3-item FIFO stacked toast notification queue with 2-line clamping, auto-dismiss (4500ms), and manual close button.
  - `src/popup/custom_select.js` — Zero-dependency progressive dropdown enhancer replacing native OS selects with emerald teal highlights.
  - `src/popup/depositphotos_countries.js` — Complete 237 ISO countries catalog extracted for Depositphotos editorial location settings (omitting commercial option).
  - `src/overlay/overlay.css` — Raycast Dark Precision styling for floating HUD inside Shadow DOM scope with zero host bleed, streamlined pill styling with SVG status icons (`.rj-status-icon-ready`, `.rj-status-icon-layers`, `.rj-status-icon-not-ready`), warning banner styles, spring transition animations (`cubic-bezier(0.16, 1, 0.3, 1)`), adaptive quick form components, live asset counter bar, and disabled control styles.
  - `src/overlay/overlay.js` — OverlayHUD controller managing Shadow DOM injection, viewport-clamped drag-and-drop physics, fluid minimize/expand animations, live asset scanner with specific Depositphotos and Shutterstock subtab media detection (`32 Images Detected`, `3 Videos Detected`), Dreamstime single-asset ID detection (`In ID 473814624`), pill Layers icon on detected assets, checkmark on empty ready tab, non-microstock warning state and labels (`Unknown Page`, `Assets Not Detected`), adaptive quick form controls (stepper, specific keywords, adaptive AI declaration), model selection guard for automation toggle, processing state field disabling, bidirectional synchronization via `chrome.storage.onChanged`, platform language resolution propagation, error-isolated batch progression loop, and End-to-End Automation Orchestrator (`startAutomation`, `stopAutomation`, `AbortController` cancellation, progress bar updates, human-pacing cooldown, per-item draft save for Freepik/Dreamstime, bulk save for other platforms).
  - `src/content/content_main.js` — Content script router importing OverlayHUD via dynamic import, auto-mounting HUD, and handling background toggle, ping, and status messages.
  - `src/adapters/utils/dom_helpers.js` — Reusable DOM utility functions: single-string instant text injection (`setNativeValue` with React prototype setter and synthetic `input`/`change`/`blur` events), element appearance and disappearance async polling (`waitForElement`, `waitForElementToDisappear` via `MutationObserver`), universal cooldown delay generators (`sleep`, `randomDelay` with `AbortSignal` cancellation support), keyboard Enter simulation (`simulateEnterKey`), full pointer and mouse event dispatching sequence (`simulateClick`), and defensive thumbnail URL extractor (`extractThumbnailUrl` with fallback hierarchy).
  - `src/adapters/BaseAdapter.js` — Abstract base contract class establishing uniform platform interface across 7 platforms (`isMatch`, `getAssetCards`, `getThumbnailUrl`, `selectCard`, `fillMetadata`), virtual lifecycle defaults (`waitForEditorReady`, `clearMetadata`, `clearKeywords`, `saveDraft`, `bulkSave`, `submitForReview`), and built-in cooldown generator (`executeCooldown`) with immediate `AbortSignal` cancellation support.
  - `src/adapters/index.js` — Platform adapter auto-registry registering all 7 platform adapters (`AdobeStockAdapter`, `ShutterstockAdapter`, `FreepikAdapter`, `VecteezyAdapter`, `DreamstimeAdapter`, `DepositphotosAdapter`, `MiriCanvasAdapter`), and exporting router utilities `getAdapterForUrl`, `getAdapterForPlatform`, and `getAllAdapters`.
  - `src/adapters/AdobeStockAdapter.js` — Platform adapter for Adobe Stock Contributor (commercial mode only, React Spectrum prototype value setter and popover interaction helper `_setSpectrumOrNativeDropdown`, 21 numeric category IDs [10001 - 10988] with name-to-ID resolution, generative AI declaration + fictional people/property release checkboxes, metadata language mapping [Korean, English, Japanese, German, etc.] with in-page language dropdown sync, card selection targeting `.upload-tile [role="option"]`, and bulk save strategy via Select All + Releases to 'no' for non-AI + Save work).
  - `src/adapters/ShutterstockAdapter.js` — Platform adapter for Shutterstock Contributor (shared Photo 26 / Video 19 categories workflow, Material-UI prototype value setter, single-string description with editorial caption prefix support, Category 1 & 2 dropdown selection, keyword chip injection with Enter key simulation, auto-approval of spelling warnings [Mark all as correct], commercial vs editorial switch, and bulk save strategy via last card checkbox + Select page + Save).
  - `src/adapters/FreepikAdapter.js` — Platform adapter for Freepik Contributor & Magnific (URL matching for contributor.freepik.com / contributor.magnific.com, catalog item cards, thumbnail extraction, title single-string injection clamped to 100 chars, keyword clearing and comma-separated chip injection + Enter key simulation, category omission, AI switch + 47 base models catalog + prompt injection, mandatory per-item save draft with spinner disappearance, and submit for review).
  - `src/adapters/VecteezyAdapter.js` — Platform adapter for Vecteezy Contributor (URL matching for contributors.vecteezy.com, resource cards, thumbnail extraction, Pro/Free/Editorial license radios, category auto-handling, AI checkbox + software dropdown [Midjourney, Stable Diffusion, DALL·E] and "Other" custom software text injection, title single-string injection clamped to 200 chars, keyword clearing and comma-separated chip injection + Enter key simulation, prohibited terms modal dismissal, and bulk save strategy via Deselect all -> Select all -> Save changes).
  - `src/adapters/DreamstimeAdapter.js` — Platform adapter for Dreamstime Contributor (URL matching for dreamstime.com /uploadfile and /upload/edit*, modal vs batch grid card extraction, thumbnail extraction, numeric asset ID tracking, title and description clearing + single-string instant injection, category pairs with 300ms AJAX delay, hardcoded Category 3 for AI mode ["Illustration & Clipart" / "Generative AI"], keyword chip injection clamped to 70 tags, Commercial RF vs Editorial ED license selection, save draft with toast confirmation, navigateToNext with Infinite Carousel Loop Guard, and submit for review).
  - `src/adapters/DepositphotosAdapter.js` — Platform adapter for Depositphotos Contributor (URL matching for depositphotos.com/files/unfinished.html, row-by-row table cards [tr.unfinished__item], thumbnail extraction, row selection, description clearing + single-string instant injection, keywords clearing + fast tag injection via paste trigger [span.paste_editor__tag] clamped to 50 tags, editorial country select, nudity/mature select, 160 items paginator capacity helper, bulk save strategy [Select All -> Save], and submit for review).
  - `src/adapters/MiriCanvasAdapter.js` — Platform adapter for MiriCanvas DesignHub (URL matching for designhub.miricanvas.com, element cards from batch grid, thumbnail extraction, card selection, title clearing + single-string instant injection clamped to 100 chars, keywords clearing [SVG remove icons] + comma-separated tag injection clamped to 25 tags, pricing tier radio [STANDARD vs PREMIUM], AI generated declaration checkbox toggle, optional content type radio, bulk save strategy [navbar Select All -> Save Metadata], and submit for review).

---

## 5. What Does NOT Exist Yet

- Phase 5: Live browser validation across live contributor portals.
- Final extension release packaging and store assets.

---

## 6. Testing & Build Verification Status

- Manifest V3 configuration validated against all declared file paths (`icons/`, `service_worker.js`, `popup.html`, `content_main.js`, `overlay/`, `styles/`, `services/`, `adapters/*`).
- `src/adapters/index.js` registry, `src/overlay/overlay.js` automation orchestrator, and abort mechanics tested with `scratch/test_subphase_4_6.mjs` (57/57 assertions passed).
- `src/adapters/DreamstimeAdapter.js`, `src/adapters/DepositphotosAdapter.js`, and `src/adapters/MiriCanvasAdapter.js` syntax verified with `node --check` and tested with `scratch/test_tier3_adapters.mjs` (107/107 assertions passed).
- `src/adapters/FreepikAdapter.js` and `src/adapters/VecteezyAdapter.js` syntax verified with `node --check` and tested with `scratch/test_tier2_adapters.mjs` (94/94 assertions passed).
- `src/adapters/AdobeStockAdapter.js` and `src/adapters/ShutterstockAdapter.js` syntax verified with `node --check` and tested with `scratch/test_tier1_adapters.mjs` (78/78 assertions passed).
- `src/adapters/utils/dom_helpers.js` and `src/adapters/BaseAdapter.js` syntax verified with `node --check` and tested with `scratch/test_base_adapter.mjs` (65/65 assertions passed).
- `src/services/AiPrompt.js` syntax verified with `node --check` and tested with `scratch/test_ai_prompt.mjs` (65/65 assertions passed).
- `src/services/SanitizerService.js` syntax verified with `node --check` and tested with `scratch/test_sanitizer_service.mjs` (86/86 assertions passed).
- `src/services/AiService.js` and `src/background/service_worker.js` syntax verified with `node --check` and tested with `scratch/test_ai_service.mjs` (76/76 assertions passed).
- Storage schema version 4 migration and default configuration tested and verified with `scratch/test_storage_v4.mjs` (38/38 assertions passed).
- Complete test suite verified passing 666/666 assertions across all 9 repository test suites (`test_subphase_4_6.mjs`, `test_tier3_adapters.mjs`, `test_tier2_adapters.mjs`, `test_tier1_adapters.mjs`, `test_base_adapter.mjs`, `test_storage_v4.mjs`, `test_ai_prompt.mjs`, `test_sanitizer_service.mjs`, and `test_ai_service.mjs`).
- Syntax validation passed for all adapter modules, `src/overlay/overlay.js`, `src/content/content_main.js`, `src/popup/popup.js`, and `src/services/StorageService.js` via `node --check`.
- Viewport boundary clamping and storage persistence logic verified.
- Depositphotos 237 country catalog and custom select progressive enhancement verified.
- Multi-API key round-robin distribution tested and verified across multi-line inputs.
- Google Gemini query param (`?key=`) and header (`x-goog-api-key`) authentication verified.
- Strict flexbox truncation (`min-width: 0; max-width: 100%;`) verified in popup UI.
- All documentation checked against Zero Native Emoji Policy and standardized under `docs/DOCS_STYLE.md`.

---

## 7. Immediate Next Step

Review Phase 4 completion, merge `task/platform-adapters` into `dev`, and proceed to Phase 5: End-to-End Testing & Polish.
