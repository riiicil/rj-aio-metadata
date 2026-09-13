# Current Project State — RJ AIO Metadata Extension

*Last Updated: 2026-09-13*<br>
*Active Branch: `task/e2e-hardening-polish`*<br>
*Current Milestone: Phase 5: E2E Hardening & Polish (Sub-phase 5.6: Overlay Modularization Complete)*

---

## 1. Current Phase Progress

- **Phase 0 — Governance & Research**: [COMPLETE] (Repository governance, design system, reference analyses)
- **Phase 1 — Storage & Popup UI**: [COMPLETE] (Storage engine, background worker, modular platform-dynamic popup UI merged to dev)
- **Phase 2 — In-Page Draggable Overlay HUD**: [COMPLETE] (Shadow DOM HUD, draggable physics, adaptive quick form, live asset counter, multi-platform media detection, popup toggle, bidirectional sync merged to dev)
- **Phase 3 — Universal Vision Service**: [COMPLETE] (Step 3.1 Prompt Engine, Step 3.2 Sanitizer Engine, Step 3.3 Universal Vision Client & Background Proxy Worker complete, merged to dev)
- **Phase 4 — Platform Adapters**: [COMPLETE] (Platform adapters and live alignment verified across all 7 platforms: Adobe Stock, Shutterstock, Freepik / Magnific, Vecteezy, Dreamstime, Depositphotos, and MiriCanvas merged to dev)
- **Phase 5 — End-to-End Testing & Polish**: [IN_PROGRESS] (Sub-phases 5.1, 5.2, 5.3, 5.4, 5.5 & 5.6 Complete: Overlay modularization extracting batch execution loop, card iteration, Dreamstime carousel workflows, bulk saving, and graceful stop coordination into dedicated ES module `src/overlay/AutomationOrchestrator.js` reducing `overlay.js` by 572 lines, popup modularization extracting all 7 platform HTML template generators into dedicated ES module `src/popup/platform_forms.js` reducing `popup.js` by 257 lines, brand asset optimization reducing `logo_rj.png` from 1.66 MB to ~60 KB [~96% reduction], theme alignment in `components.css` replacing cyan with Emerald Teal palette [`#079183`, `#59d499`] for `.rj-btn-active`, in-page HUD minimized floating pill activity spinner with keyframe `rj-spin` and SVG icon `.rj-status-icon-spinner`, status badge string simplification to concise labels [`'Generating...'`, `'Injecting...'`, `'Saving...'`, `'Submitting...'`, `'Stopping...'`, `'API Error'` / `'Failed'`] with rich hover tooltips and CSS ellipsis clamping [`max-width: 140px`/`110px`], real-time debounced auto-save engine across Popup fields with anti-loop guards, granular `rj_automation_state` synchronization, graceful stop race condition elimination, overlay visibility persistence, and unified platform detection)

---

## 2. Branches Matrix

| Branch | Status | Purpose |
| :--- | :--- | :--- |
| `main` | Clean (1 empty commit) | Stable production releases only |
| `dev` | Integration (Phase 0-4 merged) | Active development integration branch |
| `task/e2e-hardening-polish` | Active | Phase 5: End-to-End Hardening & Polish |

---

## 3. Platform Support & Adapter Matrix

| Platform | DOM Mapping | Vision Extraction | Auto-Fill Strategy | Save/Draft Strategy | Implementation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Adobe Stock** | READY | READY | READY | READY | [LIVE_FIXES_VERIFIED] |
| **Shutterstock** | READY | READY | READY | READY | [LIVE_FIXES_APPLIED] |
| **Dreamstime** | READY | READY | READY | READY | [LIVE_FIXES_APPLIED] |
| **Vecteezy** | READY | READY | READY | READY | [LIVE_FIXES_APPLIED] |
| **Freepik (Magnific)** | READY | READY | READY | READY | [LIVE_FIXES_APPLIED] |
| **Depositphotos** | READY | READY | READY | READY | [LIVE_FIXES_APPLIED] |
| **MiriCanvas** | READY | READY | READY | READY | [LIVE_FIXES_APPLIED] |

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
  - `docs/agent-logs/2026-09-12.md` — Session Entries 1 through 10 (newest on top).
  - `docs/agent-logs/2026-09-13.md` — Session Entry 1 (newest on top).
  - `docs/references/` — 8 technical reference analyses for Adobe Stock, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, MiriCanvas, and Vision APIs.
- **Source Code (`src/`):**
  - `src/manifest.json` — Chromium Manifest V3 configuration with universal content scripts matches (`http://*/*`, `https://*/*`), permissions, icons, action, service worker (type: module), web accessible resources (`overlay/*`, `styles/*`, `icons/*`, `services/*`).
  - `src/icons/` — Extension icons (`icon16.png`, `icon48.png`, `icon128.png`, optimized `logo_rj.png` branding logo ~60.3 KB reduced by 96.4% from 1.66 MB).
  - `src/services/AiPrompt.js` — Platform-adaptive prompt engine, official category dictionaries (Adobe Stock 21 IDs, Shutterstock 26 Image / 19 Video, Dreamstime 15 Main & subcategories), dynamic JSON schemas with safety bounds (Adobe/Vecteezy title <=185, Freepik/MiriCanvas title <=90, descriptions <=230), Vecteezy schema strictly restricted to title and keywords without description, flat 80-keyword generator, target language prompt enforcement, and multimodal OpenAI payload builder with model-safe parameter guards (strict temperature omission for reasoning/gpt-5 models, modern max_completion_tokens allocation, and legacy response_format handling).
  - `src/services/LoggerService.js` — Formatted console logger with distinct color palettes, structured `.step()` actions, `.asset(current, total)` progress headers (with numeric and string total support), `.info()`, `.warn()`, `.error()`, and `.success()` state messages.
  - `src/services/SanitizerService.js` — Comprehensive microstock sanitizer engine with robust JSON extractor/repairer, keyword validation pipeline (word count <=2, Dreamstime strict single-word whitespace splitting and deduplication, punctuation stripping, Vecteezy/general prohibited terms, custom keyword index-0 priority, case-insensitive deduplication, platform quota clamping), title and description smart boundary clamping (sentence boundary, word boundary without mid-word cuts, trailing period), Shutterstock editorial prefix normalization, and unified metadata facade.
  - `src/services/AiService.js` — Universal OpenAI-compatible multimodal vision client, image base64 converter (Data URL, raw base64, HTTP/Blob), end-to-end generateMetadata pipeline facade, and injectable dispatcher.
  - `src/services/StorageService.js` — Storage engine with multi-provider config, schema version 4 migration, official Freepik 47 base models catalog, Vecteezy software generator options, multi-key round-robin, keyword priority, and loadConfig alias with non-extension environment fallback.
  - `src/background/service_worker.js` — ES module background worker with dynamic `/v1/models` fetcher, active tab evaluator, platform navigator, overlay relay, and `GENERATE_VISION_METADATA` proxy router with multi-key round-robin rotation, provider authentication mapping (Gemini, OpenRouter, OpenAI, Mistral, Custom), 400 Bad Request parameter self-healing retry (temperature removal, completion token swapping, response_format stripping), exponential backoff retry handler (429/5xx), multi-part content extraction, and diagnostic error reporting.
  - `src/styles/variables.css` — Raycast Dark Precision design tokens with deep emerald teal (`#079183`) primary accent palette.
  - `src/styles/components.css` — Raycast Dark Precision form components, emerald teal accent interactive states, custom stepper control, floating custom select styles, transparent warning banner, active HUD button outline style aligned to Emerald Teal palette (`.rj-btn-active` with `#079183` border, `#59d499` text and icon stroke), graceful stop button styling (`.rj-btn-stopping`), top-right stacked toast notification system (`.rj-toast-container`, `.rj-toast-item`, `.rj-toast-text`, `.rj-toast-close`), and disabled states for buttons, inputs, steppers, and switches.
  - `src/popup/popup.html` — Platform-adaptive toolbar popup interface with brand logo image integration, modular dynamic platform settings container, and top-right stacked toast container adhering to `DESIGN.md`.
  - `src/popup/popup.css` — 380px dark canvas popup styling with brand logo image styling and sticky header/footer.
  - `src/popup/popup.js` — Streamlined popup controller (reduced by 257 lines to 1,129 lines) managing live tab matching, file importer, dynamic models, modular platform form mounting via `generatePlatformFormHtml`, real-time debounced auto-save engine (`autoSaveConfig` with 300ms debouncing for inputs, immediate save for selectors/steppers/toggles/file/models), bidirectional storage synchronization (`chrome.storage.onChanged`) guarded by `isSyncingFromStorage` and `isSavingLocally` to prevent infinite event loops, repurposed visual Save Settings button displaying informative toast ("Settings saved automatically"), model selection guard for Start Automation button, full form disabling during active processing and graceful stop (`Stopping...` disabled button state), dynamic form re-render form locking preservation, interactive in-place HUD toggle button with active outline state, and 3-item FIFO stacked toast notification queue with 2-line clamping, auto-dismiss (4500ms), and manual close button.
  - `src/popup/platform_forms.js` — Dedicated ES module containing pure HTML dynamic form template generators for all 7 supported microstock contributor platforms (`getUniversalControlsHtml`, `getAdobeStockFormHtml`, `getShutterstockFormHtml`, `getFreepikFormHtml`, `getVecteezyFormHtml`, `getDreamstimeFormHtml`, `getDepositphotosFormHtml`, `getMiriCanvasFormHtml`, `generatePlatformFormHtml`), keyword count bounds dictionary (`PLATFORM_LIMITS`), and secure HTML escaping utility (`escapeHtml`).
  - `src/popup/depositphotos_countries.js` — Complete 237 ISO countries catalog extracted for Depositphotos editorial location settings (omitting commercial option).
  - `src/overlay/overlay.css` — Raycast Dark Precision styling for floating HUD inside Shadow DOM scope with zero host bleed, streamlined pill styling with SVG status icons (`.rj-status-icon-ready`, `.rj-status-icon-layers`, `.rj-status-icon-not-ready`, and rotating `.rj-status-icon-spinner` with `@keyframes rj-spin`), status badge and asset label ellipsis truncation (`.rj-hud-asset-label`, `.rj-hud-status-badge`, `span#rjAutomationStatusText`), warning banner styles, spring transition animations (`cubic-bezier(0.16, 1, 0.3, 1)`), adaptive quick form controls, live asset counter bar, and disabled control styles.
  - `src/overlay/overlay.js` — Streamlined OverlayHUD controller (reduced by 572 lines to 1,472 lines) managing Shadow DOM injection, viewport-clamped drag-and-drop physics, fluid minimize/expand animations, live asset scanner with media subtab detection across platforms, unified platform detection via central adapter registry (`getAdapterForUrl`), persistent visibility state in `chrome.storage.local` (`rj_overlay_visible`), adaptive quick form controls (stepper, specific keywords, adaptive AI declaration) with auto-save to storage, model selection guard for automation toggle, processing state field disabling, bidirectional synchronization via `chrome.storage.onChanged` with `this.isSyncingFromStorage` loop prevention, clean delegation of `startAutomation()` and `stopAutomation()` to `this.orchestrator`, minimized floating pill activity spinner (`pillSpinnerSvg`) during running and stopping states, and status badge tooltip synchronization (`setStatusBadge`).
  - `src/overlay/AutomationOrchestrator.js` — Dedicated ES module batch automation orchestrator encapsulating provider validation, asset card iteration, Dreamstime carousel navigation loop (Section 6A), grid platform sequential progression (Section 6B), AI generation dispatch, metadata injection, per-item draft save (Freepik), post-loop bulk saving (`bulkSave`), two-stage graceful stop coordination and force abort mechanics (`stop(force)`), human-pacing cooldowns, and granular `rj_automation_state` storage synchronization.
  - `src/content/content_main.js` — Content script router importing OverlayHUD via dynamic import, auto-mounting HUD with persistent visibility check (`rj_overlay_visible: false` mounts in hidden state without visual flash), and handling background/popup toggle, ping, and status messages with accurate `isVisible` boolean reporting.
  - `src/adapters/utils/dom_helpers.js` — Reusable DOM utility functions: single-string instant text injection (`setNativeValue` with React prototype setter and synthetic `input`/`change`/`blur` events), element appearance and disappearance async polling (`waitForElement`, `waitForElementToDisappear` via `MutationObserver`), universal cooldown delay generators (`sleep`, `randomDelay` with `AbortSignal` cancellation support), keyboard Enter simulation (`simulateEnterKey`), full pointer and mouse event dispatching sequence (`simulateClick`), and defensive thumbnail URL extractor (`extractThumbnailUrl` with fallback hierarchy).
  - `src/adapters/BaseAdapter.js` — Abstract base contract class establishing uniform platform interface across 7 platforms (`isMatch`, `getAssetCards`, `getThumbnailUrl`, `selectCard`, `fillMetadata`), virtual lifecycle defaults (`prepareAutomation`, `waitForEditorReady`, `clearMetadata`, `clearKeywords`, `saveDraft`, `bulkSave`, `submitForReview`), and built-in cooldown generator (`executeCooldown`) with immediate `AbortSignal` cancellation support.
  - `src/adapters/index.js` — Platform adapter auto-registry registering all 7 platform adapters (`AdobeStockAdapter`, `ShutterstockAdapter`, `FreepikAdapter`, `VecteezyAdapter`, `DreamstimeAdapter`, `DepositphotosAdapter`, `MiriCanvasAdapter`), and exporting router utilities `getAdapterForUrl`, `getAdapterForPlatform`, and `getAllAdapters`.
  - `src/adapters/AdobeStockAdapter.js` — Platform adapter for Adobe Stock Contributor (commercial mode only, React Spectrum prototype value setter and popover interaction helper `_setSpectrumOrNativeDropdown` with strict numeric ID targeting and active container scrollbar centering to eliminate zoom clipping, 21 numeric category IDs [10001 - 10988] with name-to-ID resolution, generative AI declaration + fictional people/property release checkboxes, metadata language mapping [Korean '14', English '1', Japanese '9', German '4', French '2', etc.] without UI label dependencies, card selection targeting `.upload-tile [role="option"]`, and bulk save strategy via Select All + Releases to 'no' for non-AI + Save work).
  - `src/adapters/ShutterstockAdapter.js` — Platform adapter for Shutterstock Contributor (shared Photo 26 / Video 19 categories workflow, Material-UI prototype value setter, single-string description with editorial caption prefix support, Category 1 & 2 dropdown selection, keyword chip injection with Enter key simulation, auto-approval of spelling warnings [Mark all as correct], commercial vs editorial switch, and bulk save strategy via last card checkbox + Select page + Save).
  - `src/adapters/FreepikAdapter.js` — Platform adapter for Freepik Contributor & Magnific (URL matching for contributor.freepik.com / contributor.magnific.com, catalog item cards, thumbnail extraction, title single-string injection clamped to 100 chars, keyword clearing strictly skipping empty assets, comma-separated chip injection [clamped to 49 for AI assets, 50 for non-AI] + Enter key simulation, category omission, AI switch via visual indicator with 500ms pacing + custom Vue dropdown priority for 47 base models catalog + prompt injection, pre-automation header select-all deselection hook [input[data-v-f08075b8]], unexpected draft modal dismissal guard, mandatory per-item save via button[data-cy="savePreitems"] [icon--save] with spinner disappearance, and submit for review).
  - `src/adapters/VecteezyAdapter.js` — Platform adapter for Vecteezy Contributor (URL matching for contributors.vecteezy.com, resource cards, thumbnail extraction, pre-automation preparation hook [auto-closing filter sidebar and resetting toolbar selection], metadata editor queries strictly scoped to right panel [div.right] to eliminate filter collisions, Pro/Free/Editorial license radios, category auto-handling, AI checkbox + software dropdown [Midjourney, Stable Diffusion, DALL·E] and "Other" custom software text injection, title single-string injection clamped to 200 chars with X clear icon support, keyword clearing [bulk ClearIcon or tag-remove svg] and comma-separated chip injection clamped to 50 tags + Enter key simulation, prohibited terms modal dismissal, disambiguated bulk save strategy [Deselect all -> Select all -> Save changes -> Deselect all], and full LoggerService integration).
  - `src/adapters/DreamstimeAdapter.js` — Platform adapter for Dreamstime Contributor (URL matching for dreamstime.com /uploadfile and /upload/edit*, modal vs batch grid card extraction, thumbnail extraction, numeric asset ID tracking, granular condition-checked clearing buttons for title, description, categories, and keywords, subcategory option polling with async AJAX response waiting, hardcoded Category 3 for AI mode ["Illustration & Clipart" / "Generative AI"], single-word keyword tag injection clamped to 70 tags, Commercial RF vs Editorial ED license selection, save draft with noty toast appearance & disappearance polling, navigateToNext with Infinite Carousel Loop Guard detecting return to firstAssetId, submit for review with toast resolution, and full LoggerService integration).
  - `src/adapters/DepositphotosAdapter.js` — Platform adapter for Depositphotos Contributor (URL matching for depositphotos.com/files/unfinished.html, modern `.itemslist > div.itemeditor` card extraction with `tr.unfinished__item` fallback, direct CDN thumbnail extraction via `img.itemeditor__thumb`, numeric asset ID extraction from `span.itemeditor__idbox`, progressive scroll with `.itemeditor_stub` virtualization readiness wait, condition-checked granular clearing [`itemeditor__reset_active`], card-scoped metadata injection [`textarea._itemeditor__value_description`, fast tag paste via `span.paste_editor__tag` clamped to 50 tags, editorial 'yes'/'no' + ISO country select, nudity 'yes'/'no'], 160 items paginator capacity helper, to-top scroll + idempotent header Select All + control panel Save bulk save strategy, and submit for review).
  - `src/adapters/MiriCanvasAdapter.js` — Platform adapter for MiriCanvas DesignHub (URL matching for designhub.miricanvas.com, element cards from batch grid, thumbnail extraction, card selection, title clearing + single-string instant injection clamped to 100 chars, keywords clearing [SVG remove icons] + comma-separated tag injection clamped to 25 tags, pricing tier radio [STANDARD vs PREMIUM], AI generated declaration checkbox toggle, optional content type radio, bulk save strategy [navbar Select All -> Save Metadata], and submit for review).
- **Deleted Scaffolding & Stub Files:**
  - `src/services/AiVisionService.js` — Obsolete stub file removed (superseded by `src/services/AiService.js`).
  - `src/services/PromptBuilder.js` — Obsolete stub file removed (superseded by `src/services/AiPrompt.js`).

---

## 5. What Does NOT Exist Yet

- Phase 5: Sub-phase 5.7 (Final End-to-End Live Verification & Documentation Sync).

---

## 6. Testing & Build Verification Status

- Manifest V3 configuration validated against all declared file paths (`icons/`, `service_worker.js`, `popup.html`, `content_main.js`, `overlay/`, `styles/`, `services/`, `adapters/*`).
- Sub-phase 5.6 suite verified with `scratch/test_subphase_5_6.mjs` (45/45 assertions passed: AutomationOrchestrator class exports, OverlayHUD composition & delegation, multi-card execution loop with mock adapter, graceful/force stop mechanics, and overlay.js 572-line reduction).
- Sub-phase 5.5 suite verified with `scratch/test_subphase_5_5.mjs` (77/77 assertions passed: module export contracts, individual HTML generators across 7 platforms, Freepik AI limit clamping to 49, XSS escaping, and popup.js integration and export preservation).
- Sub-phase 5.4 suite verified with `scratch/test_subphase_5_4.mjs` (73/73 assertions passed: asset optimization to 60.3 KB, active button emerald teal theme alignment, overlay spin keyframe and spinner class, pill spinner lifecycle, and status badge tooltip clamping).
- Sub-phase 5.3 suite verified with `scratch/test_subphase_5_3.mjs` (34/34 assertions passed: immediate and debounced autoSaveConfig, static & dynamic form input listeners, bidirectional Popup <-> HUD storage sync, anti-loop guards, and repurposed Save Settings button toast).
- Sub-phase 5.2 suite verified with `scratch/test_subphase_5_2.mjs` (69/69 assertions passed: granular `rj_automation_state` schema parsing, legacy boolean compatibility, form locking preservation across re-renders, HUD disabled stopping state, and graceful stop repeated click ignore in `OverlayHUD`).
- Sub-phase 5.1 suite verified with `scratch/test_subphase_5_1.mjs` (35/35 assertions passed: unified platform detection across all 7 sites + unknown URLs, overlay visibility storage persistence, and stub file deletion).
- `src/adapters/utils/dom_helpers.js` and `src/adapters/BaseAdapter.js` syntax verified with `node --check` and tested with `scratch/test_base_adapter.mjs` (65/65 assertions passed).
- Total assertions verified across all active test suites: 398 / 398 passed (100%).
- Syntax validation passed for `src/overlay/AutomationOrchestrator.js`, `src/overlay/overlay.js`, `src/popup/popup.js`, `src/popup/platform_forms.js`, `src/content/content_main.js`, and `src/adapters/index.js` via `node --check`.
- Zero Native Emoji Policy strictly enforced across all files, code, and documentation.

---

## 7. Immediate Next Step

Proceed to Sub-phase 5.7: Final End-to-End Live Verification & Documentation Sync.
