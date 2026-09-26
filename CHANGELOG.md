# Changelog — RJ AIO Metadata Extension

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Dreamstime Character Limits Expansion (`src/services/AiPrompt.js`, `src/services/SanitizerService.js`)**: Expanded Dreamstime title character limit from 200 to 300 and description limit from 250 to 600 across AI generation prompt schemas and `SanitizerService` platform-scoped clamping bounds.
- **Shutterstock Description Limit Expansion (`src/services/AiPrompt.js`, `src/services/SanitizerService.js`, `src/adapters/ShutterstockAdapter.js`)**: Expanded Shutterstock description limit from 200/250 to 300 characters across `AiPrompt` JSON schemas, `SanitizerService` description limits, and adapter text injection slicing.
- **Universal Multilingual Numeric Category Resolution (`src/services/AiPrompt.js`, `src/adapters/ShutterstockAdapter.js`, `src/adapters/DreamstimeAdapter.js`)**:
  - *Shutterstock*: Exported `SHUTTERSTOCK_PHOTO_CATEGORY_IDS` (26 categories, IDs `'0'`-`'31'`) and `SHUTTERSTOCK_VIDEO_CATEGORY_IDS` (19 categories, IDs `'1'`-`'19'`, with Transportation dynamically resolved to `'19'` in Video vs `'0'` in Photo). Added `resolveShutterstockCategoryId` resolving English names, Indonesian translations, and raw IDs. Updated `_selectMuiCategory` to match `<li role="option">` by numeric ID (`value` / `data-value`) and sync the hidden input, eliminating failed text matches on localized pages.
  - *Dreamstime*: Added `resolveDreamstimeCategoryId` mapping English names, Indonesian translations, and conjunction-normalized strings (`and`/`dan`/`&`) to official numeric IDs across all 15 Main categories and subcategories. Updated `_matchAndSelectOption` and `setCategoryPair` to match options by numeric `value` and dispatch native input/change events, with AI Mode Category 3 directly targeting numeric IDs `172` ("Illustrations & Clipart") and `212` ("Generative AI").

### Fixed
- **Shutterstock Unsaved Metadata Bug & Two-Tier Saving Strategy (`src/overlay/AutomationOrchestrator.js`, `src/adapters/ShutterstockAdapter.js`)**:
  - Orchestrator now calls `adapter.saveDraft()` for `shutterstock` in Step 6 of each asset card iteration, preventing loss of edits when navigating between assets in the sidebar.
  - Implemented `saveDraft()` in `ShutterstockAdapter` to click `button[data-testid="edit-dialog-save-button"]` (or `"Save"` / `"Simpan"` fallback) and wait for the loading spinner (`div[data-testid="loading-spinner"]`, `role="progressbar"`) to disappear.
  - Updated `bulkSave()` in `ShutterstockAdapter` as a resilient post-loop backup supporting bilingual toolbar buttons (`"Select page"` / `"Pilih halaman"`, `"Save"` / `"Simpan"`, `"Deselect page"` / `"Batal pilih halaman"` / `"Deselect all"`), ensuring 100% save success regardless of UI language or single-card edit state.
- **Popup vs HUD State Synchronization (`src/popup/popup.js`)**: Scoped the `isSavingLocally` guard in `chrome.storage.onChanged` strictly to settings updates (`platformSettings`, `providers`, `activeProvider`, `activePlatform`), ensuring incoming `rj_automation_state` and `rj_overlay_visible` events are never dropped when popup auto-saves occur.
- **Popup Start Button Tab Match Readiness (`src/popup/popup.js`)**: Integrated `isCurrentTabMatched()` into the idle state of `updateAutomationButtonUI()`. When the active browser tab does not match the selected platform, the Start button remains disabled with title `"Active tab does not match this platform"`, preventing cross-platform deadlock conditions.
- **Depositphotos Localized URL Matching (`src/adapters/DepositphotosAdapter.js`)**: Updated `DepositphotosAdapter.isMatch(url)` to match `url.includes('depositphotos.com') && url.includes('/files/unfinished')`, allowing non-English contributor URLs (e.g. `https://depositphotos.com/id/files/unfinished.html`, `/de/`, `/fr/`, `/es/`) to be properly resolved.

## [0.1.1] - 2026-09-22

### Fixed
- **Google Gemini OpenAI Endpoint Authorization**: Added required `Authorization: Bearer <API_KEY>` header to `buildProviderRequestParams` in `src/background/service_worker.js`. Previously, Google Gemini requests only transmitted `x-goog-api-key` and query param `?key=...`, causing Google's OpenAI-compatible endpoint (`/v1beta/openai/chat/completions`) to reject requests with `400 Bad Request: Missing or invalid Authorization header`.
- **Toolbar Popup Start Button Readiness Synchronization**: Restored AI provider credentials and model selection validation (`isCurrentProviderReady`) in `src/popup/popup.js`. Previously, the idle branch in `updateAutomationButtonUI` unconditionally set `disabled = false`, causing the toolbar start button to appear active and clickable on fresh installations before entering an API key or fetching models, whereas the in-page overlay HUD correctly stayed disabled. Connected automatic button readiness re-evaluation across model fetching, file key imports, input typing, and storage synchronization.

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

