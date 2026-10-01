# Changelog — RJ AIO Metadata Extension

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

---

## [0.1.4] - 2026-10-01

### Added
- **Universal AI Generation Auto-Retry Fallback (`src/overlay/AutomationOrchestrator.js`)**:
  - Implemented `_generateMetadataWithRetry(params, signal, setStatusBadge)`: provides an automated single-fallback retry with a 1500ms backoff when any Vision AI completion call encounters transient socket drops, network latency spikes, HTTP 429 rate limits, or 502/503/504 gateway timeouts.
  - Dynamically updates HUD status badge to `Retrying AI...` (`Retrying AI metadata generation...`) during retry attempts.
  - Universally protects all 7 supported microstock platforms across both carousel (`runDreamstimeLoop`) and standard grid batch loops (`processLoop`).
- **Vecteezy Per-Card Save Draft Integration (`src/adapters/VecteezyAdapter.js`, `src/overlay/AutomationOrchestrator.js`)**:
  - Enhanced `VecteezyAdapter.saveDraft()` with editor form scoping, step logger reporting, and progress spinner polling (`[role="progressbar"]`, `.MuiCircularProgress-svg`) with a 3-second ceiling.
  - Integrated per-card `adapter.saveDraft()` calls in `AutomationOrchestrator` batch loop for Vecteezy (matching Shutterstock and Freepik), preventing metadata loss if automation is stopped midway or the browser tab is closed.

### Changed
- **Dreamstime Title Limit Calibration & Keyword Quota Expansion (`src/services/AiPrompt.js`, `src/services/SanitizerService.js`, `src/services/StorageService.js`, `src/popup/platform_forms.js`, `src/overlay/overlay.js`, `src/overlay/AutomationOrchestrator.js`, `src/adapters/DreamstimeAdapter.js`)**:
  - Calibrated Dreamstime title limit from 300 to <= 125 characters across AI prompt schemas, sanitizer clamping, and adapter input setters, leaving an ample safety margin against Dreamstime's hard platform ceiling of 130 characters and completely preventing platform truncation.
  - Expanded Dreamstime keyword limit to 80 tags across full stack (`SanitizerService`, `StorageService`, popup limits, HUD Quick Form stepper, and `DreamstimeAdapter`).
  - Tuned Dreamstime AI prompt instructions to generate 90-100 keywords to guarantee reaching 80 single-word tags after deduplication and whitespace splitting.

### Fixed
- **Multi-Platform Cross-Tab Automation Isolation & Freeze Elimination (`src/overlay/overlay.js`, `src/popup/popup.js`, `src/background/service_worker.js`)**:
  - *Promisified Tab ID Resolution*: Wrapped `GET_SENDER_TAB_ID` in a Promise and awaited it in `overlay.js:init()`, preventing race conditions where unawaited `this.tabId` remained `null` on mount.
  - *Strict Tab Scoping in Storage Listener*: Scoped `onStorageChanged` to check `isAnotherTab = Boolean(state.tabId && this.tabId && state.tabId !== this.tabId)`. If another tab runs automation (even for the same platform), the HUD locks with `Busy (another tab)` instead of ping-ponging `startAutomation`/`stopAutomation` at 60fps, eliminating Chromium main thread freezing ("Not Responding").
  - *Sibling Tab Mount Auto-Heal Guard*: Scoped `restoreAutomationState()` so newly mounted tabs do not wipe active automation state in storage (`isRunning: false`).
  - *Background Tab Scanner Throttling*: Added `document.hidden` guards in `startAssetScanner()` skipping DOM card scans when tabs are in the background, raising debounce to 500ms to conserve CPU cycles.

---

## [0.1.3] - 2026-09-30

### Fixed
- **Dreamstime Mode B (Submit Immediately) Auto-Advance & Toast Lifecycle (`src/adapters/DreamstimeAdapter.js`, `src/overlay/AutomationOrchestrator.js`)**:
  - *Eliminated `#js-submit-message` Selector Bypass*: Removed query on `#js-submit-message:not([style*="none"])` which matched permanently rendered hidden inline containers in 0ms, bypassing toast waiting in both `saveDraft()` and `submitForReview()`. Polling now strictly monitors real Noty notifications (`#noty_layout__bottomRight .noty_bar, .noty_bar`) for text content (`saved`/`success` for draft, `submitted`/`success`/`id:` for submit) with extended 12000ms appearance and 10000ms disappearance timeouts.
  - *Stabilized Post-Submit Transition & Eliminated Premature Batch Stop*: Resolved issue where `handlePostSubmitTransition()` checked `!modalActive` on tick 1 (at 250ms), mistaking Dreamstime's normal 1.2s - 2.5s AJAX DOM unmount window for batch completion. Decoupled Mode B progression from `#js-next-submit` next-arrow clicks and implemented dedicated polling (up to 15000ms) for newly loaded asset IDs (`candId && candId !== submittedAssetId`) with wrap-around cycle detection.
  - *Accurate Asset Counter Tracking*: Added `processedCount++` and `this.processedCount` synchronization after each completed asset in Dreamstime carousel loop, ensuring HUD counters and completion summaries reflect true progress.
  - *Eliminated Browser CSP Warning on `javascript:` Links (`src/adapters/utils/dom_helpers.js`)*: Updated `simulateClick` to temporarily detach `href` on `javascript:` links during synthetic `MouseEvent` dispatch, preventing Chromium Content Security Policy console violations while firing click handlers.

- **In-Page Overlay HUD Shadow DOM Anti-FOUC White Glitch Elimination (`src/overlay/overlay.js`, `src/overlay/overlay.css`)**:
  - *Root Cause Resolution*: Fixed Flash of Unstyled Content (FOUC) where `<link rel="stylesheet">` loaded asynchronously in the Shadow DOM, causing Chromium's User-Agent stylesheet to render buttons with white/light-grey `buttonface` styling for 20ms - 100ms on page refresh.
  - *Inline Anti-FOUC Dark Reset*: Injected critical synchronous `<style id="rjAntiFoucStyle">` directly into Shadow Root resetting `button, input, select, textarea` to transparent dark baselines (`.rj-hud-card { background-color: #0d0d0d; }`, `.rj-btn-start { background-color: #079183 !important; }`).
  - *Visibility Guard*: Kept `.rj-hud-wrapper` initially at `opacity: 0; visibility: hidden;` until `linkEl.onload` / `linkEl.sheet` triggers `.rj-css-ready`, smoothly fading in the HUD without any white element flash.

---

## [0.1.2] - 2026-09-27

### Added
- **Dreamstime Character Limits Expansion (`src/services/AiPrompt.js`, `src/services/SanitizerService.js`)**: Expanded Dreamstime title character limit from 200 to 300 and description limit from 250 to 600 across AI generation prompt schemas and `SanitizerService` platform-scoped clamping bounds.
- **Shutterstock Description Limit Expansion (`src/services/AiPrompt.js`, `src/services/SanitizerService.js`, `src/adapters/ShutterstockAdapter.js`)**: Expanded Shutterstock description limit from 200/250 to 450 characters across `AiPrompt` JSON schemas, `SanitizerService` description limits, and adapter text injection slicing.
- **Universal Multilingual Numeric Category Resolution (`src/services/AiPrompt.js`, `src/adapters/ShutterstockAdapter.js`, `src/adapters/DreamstimeAdapter.js`)**:
  - *Shutterstock*: Exported `SHUTTERSTOCK_PHOTO_CATEGORY_IDS` (26 categories, IDs `'0'`-`'31'`) and `SHUTTERSTOCK_VIDEO_CATEGORY_IDS` (19 categories, IDs `'1'`-`'19'`, with Transportation dynamically resolved to `'19'` in Video vs `'0'` in Photo). Added `resolveShutterstockCategoryId` resolving English names, Indonesian translations, and raw IDs. Updated `_selectMuiCategory` to match `<li role="option">` by numeric ID (`value` / `data-value`) and sync the hidden input, eliminating failed text matches on localized pages.
  - *Dreamstime*: Added `resolveDreamstimeCategoryId` mapping English names, Indonesian translations, and conjunction-normalized strings (`and`/`dan`/`&`) to official numeric IDs across all 15 Main categories and subcategories. Updated `_matchAndSelectOption` and `setCategoryPair` to match options by numeric `value` and dispatch native input/change events, with AI Mode Category 3 directly targeting numeric IDs `172` ("Illustrations & Clipart") and `212` ("Generative AI").

### Fixed
- **Depositphotos Commercial vs Editorial Dropdown Sync (`src/adapters/DepositphotosAdapter.js`)**: Updated `DepositphotosAdapter.fillMetadata()` to explicitly set the editorial dropdown `select._itemeditor__value_is_editorial` back to `"no"` / `"0"` when running in commercial mode (`isEditorial: false`). Previously, the adapter only checked `if (isEditorial)` without an `else` branch, causing assets whose dropdown was initially set to `"yes"` / `"1"` to remain stuck in Editorial mode.
- **Shutterstock Unsaved Metadata Bug & Two-Tier Saving Strategy (`src/overlay/AutomationOrchestrator.js`, `src/adapters/ShutterstockAdapter.js`)**:
  - Orchestrator now calls `adapter.saveDraft()` for `shutterstock` in Step 6 of each asset card iteration, preventing loss of edits when navigating between assets in the sidebar.
  - Implemented `saveDraft()` in `ShutterstockAdapter` to click `button[data-testid="edit-dialog-save-button"]` (or `"Save"` / `"Simpan"` fallback) and wait for the loading spinner (`div[data-testid="loading-spinner"]`, `role="progressbar"`) to disappear.
  - Updated `bulkSave()` in `ShutterstockAdapter` as a resilient post-loop backup supporting bilingual toolbar buttons (`"Select page"` / `"Pilih halaman"`, `"Save"` / `"Simpan"`, `"Deselect page"` / `"Batal pilih halaman"` / `"Deselect all"`), ensuring 100% save success regardless of UI language or single-card edit state.
- **Popup vs HUD State Synchronization (`src/popup/popup.js`)**: Scoped the `isSavingLocally` guard in `chrome.storage.onChanged` strictly to settings updates (`platformSettings`, `providers`, `activeProvider`, `activePlatform`), ensuring incoming `rj_automation_state` and `rj_overlay_visible` events are never dropped when popup auto-saves occur.
- **Popup Start Button Tab Match Readiness (`src/popup/popup.js`)**: Integrated `isCurrentTabMatched()` into the idle state of `updateAutomationButtonUI()`. When the active browser tab does not match the selected platform, the Start button remains disabled with title `"Active tab does not match this platform"`, preventing cross-platform deadlock conditions.
- **Depositphotos Localized URL Matching (`src/adapters/DepositphotosAdapter.js`)**: Updated `DepositphotosAdapter.isMatch(url)` to match `url.includes('depositphotos.com') && url.includes('/files/unfinished')`, allowing non-English contributor URLs (e.g. `https://depositphotos.com/id/files/unfinished.html`, `/de/`, `/fr/`, `/es/`) to be properly resolved.

---

## [0.1.1] - 2026-09-22

### Fixed
- **Google Gemini OpenAI Endpoint Authorization**: Added required `Authorization: Bearer <API_KEY>` header to `buildProviderRequestParams` in `src/background/service_worker.js`. Previously, Google Gemini requests only transmitted `x-goog-api-key` and query param `?key=...`, causing Google's OpenAI-compatible endpoint (`/v1beta/openai/chat/completions`) to reject requests with `400 Bad Request: Missing or invalid Authorization header`.
- **Toolbar Popup Start Button Readiness Synchronization**: Restored AI provider credentials and model selection validation (`isCurrentProviderReady`) in `src/popup/popup.js`. Previously, the idle branch in `updateAutomationButtonUI` unconditionally set `disabled = false`, causing the toolbar start button to appear active and clickable on fresh installations before entering an API key or fetching models, whereas the in-page overlay HUD correctly stayed disabled. Connected automatic button readiness re-evaluation across model fetching, file key imports, input typing, and storage synchronization.

---

## [0.1.0] - 2026-09-17

### Added
- **Universal OpenAI-Compatible Vision Engine**: Implemented `AiService.js` and `AiPrompt.js` supporting standard OpenAI multimodal chat completions format across 5 provider presets: Google Gemini, Mistral AI, OpenAI, OpenRouter, and Custom Endpoints (custom base URL) with dynamic prompt generation, category taxonomy resolution, and character safety margins.
- **Dual-Mode Precision UI (Raycast Dark System)**:
  - *Toolbar Popup*: Platform-adaptive configuration interface with provider management, model fetching with refresh animation, keyword quota steppers, custom keywords, and platform-specific settings.
  - *In-Page Draggable Overlay HUD*: Non-intrusive floating HUD injected via open-mode Shadow DOM (`#rj-overlay-host`) with viewport-clamped drag mechanics, minimizable floating pill, live asset counters, batch progress tracking, and graceful stop controls.
- **7 Microstock Platform Adapters**: Standardized automation modules implementing `BaseAdapter.js`:
  - `AdobeStockAdapter.js`: React Spectrum controlled input handling, 21 numeric category IDs, generative AI declaration, fictional property release checkboxes, and automated bulk save.
  - `ShutterstockAdapter.js`: Shared Photo (26) and Video (19) category workflows, single-string descriptions, keyword chip injection, and bulk save.
  - `DreamstimeAdapter.js`: 15 Main / 182 Subcategories taxonomy tree, single-word keyword tag splitting, RF vs ED license switching, and cross-page carousel progression.
  - `VecteezyAdapter.js`: Automatic filetype categories, Pro/Free/Editorial licenses, AI model selection with custom software input, and prohibited terms auto-sanitization.
  - `FreepikAdapter.js`: Rebranded URL support (`contributor.freepik.com` and `contributor.magnific.com`), 47 base models catalog, AI prompt injection, and mandatory per-item save-draft loop.
  - `DepositphotosAdapter.js`: Scoped virtualized `itemeditor` DOM queries, 160 items/page capacity, fast tag paste, and editorial country/city AJAX selection.
  - `MiriCanvasAdapter.js`: 1,000 items/page batch grid, ContentTier (Standard/Premium), AI declaration, and reactive verified per-chip removal engine.
- **Modular Batch Automation Orchestrator**: Extracted core batch execution loop and graceful stopping mechanics into `AutomationOrchestrator.js`, decoupling automation logic from UI presentation.
- **Modular Popup Dynamic Forms**: Extracted platform-specific dynamic form generators into `platform_forms.js`, isolating HTML rendering from popup event handlers.
- **Exclusive Single-Runner Automation Concurrency Lock**: Browser-wide single-runner lock preventing multiple platform tabs from executing automations concurrently, displaying lock SVG icons, `Running on [Platform]` badges, and informative tooltips.
- **Multi-Tab Automation State Isolation**: Scoped automation state updates by `platformId` and `tabId`, eliminating cross-tab ping-pong collision loops and accidental batch cancellations.
- **Real-Time Reactive Auto-Save Engine**: Implemented debounced (300ms) auto-save for text inputs and immediate auto-save for switches, steppers, and dropdowns with bidirectional storage synchronization.
- **Dynamic Progress & Support Ticker**: Repurposed toolbar and HUD action rows with a dynamic support ticker alternating every ~3.5s between live batch progress (`[Spinner] X/Y (Z%)`) and 5 rotating donation variants with zero native emoji.
- **Sanitizer & Validation Engine**: Implemented `SanitizerService.js` with resilient markdown JSON extraction, trailing comma repair, keyword sanitization (word count <= 2, punctuation removal, prohibited terms filtering, user custom priority, deduplication), and smart sentence-boundary title/description clamping.
- **Production Build & Obfuscation Pipeline**: Implemented bundle-first build pipeline (`esbuild` + `javascript-obfuscator`) generating an obfuscated release inside `dist/LOAD THIS FOLDER/` along with root distribution metadata.

### Changed
- **Typography & Font Weight Standardization**: Unified all bottom action buttons across Popup and HUD to 12px, font-weight 500 (removing heavy bold), and system sans-serif font stack.
- **Stop Button Labeling**: Shortened active running button label from `"Stop Automation"` to `"Stop"` across both Popup and HUD interfaces.
- **Content Script Match Scope**: Restricted `content_scripts.matches` in `manifest.json` from broad wildcards (`http://*/*`, `https://*/*`) to the 8 explicit supported microstock contributor domains.
- **Theme Alignment**: Aligned active HUD outline buttons (`.rj-btn-active`) to the canonical Emerald Teal design palette (`#079183` border, `#59d499` text and stroke).

### Fixed
- **Shutterstock Spelling Warnings Precision**: Scoped `approveSpellingWarnings` specifically inside `div[data-testid="keyword-input"]` searching for `"Mark all keywords as correct"` / `"Mark all as correct"` while strictly excluding `add-all-button`, `more-keyword-actions-button`, and `role="tab"` (preventing keyword count overflow past 50 and navigation alerts).
- **100% Multi-Language Resilience**: Replaced English text string dependencies across all platform adapters with structural DOM selectors (`data-testid`, `value`, `name`, `:nth-of-type`, SVG signatures), guaranteeing reliable execution in Indonesian, Korean, Japanese, German, French, and other locales.
- **Dreamstime Cross-Page Continuation**: Added service worker and orchestrator exceptions preventing full-page navigation reloads from wiping active automation batches.
- **Adobe Stock React Spectrum Select**: Direct inject select fallback and active container scrollbar centering to prevent zoom-induced dropdown clipping and unmounted options popovers.
- **MiriCanvas Keyword Chip Conversion**: Implemented non-blur setter with `insertFromPaste` InputEvent committing keyword chips cleanly into React 18 DOM.
- **Depositphotos Scoped DOM Isolation**: Scoped itemeditor queries strictly to the active card container, preventing cross-card tag leakage and enabling native multi-tag comma splitting.
- **Freepik Empty Placeholder Filtering**: Filtered out 20 empty `.catalog__item--fake` cards from asset counts and DOM queries, resolving Vue validator unhandled exceptions.
- **Vecteezy Right Panel Scoping**: Scoped metadata queries strictly to `div.right`, eliminating selector collisions with the left filter sidebar and popover dismissal conflicts.
- **Support / Donation Icon Outline Box**: Removed `.rj-btn-icon` bordered container from the popup and HUD support button, rendering clean unboxed SVG icons.

