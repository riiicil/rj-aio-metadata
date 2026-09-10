# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 4: Platform Adapters (Vecteezy, Freepik / Magnific, Shutterstock & Adobe Stock Live Fixes Complete)
- **Active Branch**: `task/platform-adapters`
- **Latest Commit**: `fix(vecteezy): scope editor to right panel, add prepareAutomation, clear buttons, and fix bulkSave selector`
- **Working Tree**: Clean local branch
- **Build / Test State**: Verified healthy (678/678 assertions passed across all test suites, zero emoji clean)

---

## 2. Active In-Flight Context

Phase 4 has resolved cross-origin thumbnail fetching, completed live in-page bugfixing across Tier 1 & Tier 2 platforms, and aligned Vecteezy and Freepik (Magnific):
1. **Vecteezy Live Alignment & Form Scoping (`contributors.vecteezy.com`)**:
   - Scoped all metadata editor queries strictly to the right panel (`div.right, div[class*="right"]`), eliminating selector collision with the left filter sidebar (`<aside>`) which had identical `pro`, `free`, `editorial` and radio group attributes.
   - Added pre-automation preparation hook (`VecteezyAdapter.prepareAutomation()`): automatically closes the left filter sidebar if open, and clicks toolbar `"Deselect all"` button if any cards are currently selected before card 1. Skips cleanly if already `"Select all"`.
   - Integrated title clear X icon (`div[data-testid="text-input"] svg[position="end"]`, `svg.sc-gsqrwE`, `svg`) and keywords bulk ClearIcon (`svg[data-testid="ClearIcon"]`) adjacent to `div[data-testid="tagger-input"]`.
   - Handled AI declaration checkbox, MUI select dropdown generator options (`midjourney`, `stable_diffusion`, `dall_e`), and `"other"` option with custom tool name injection into `input#undefined-input`. In non-AI mode, explicitly unchecks the AI checkbox if active.
   - Fixed `bulkSave()` `SyntaxError` caused by invalid `:has-text(...)` pseudo-selector, replacing it with standard JavaScript array `.find()`.
   - Disambiguated `"Select all"` button matching in `bulkSave()` by explicitly checking `!includes('deselect') && includes('select all')` to prevent substring collision with `"Deselect all"`.
   - Full `LoggerService` integration across all steps (`(this.logger || logger).step()`, `.info()`, `.success()`).
   - Verified clean graceful stop flow triggering `bulkSave()` without unhandled exceptions.
2. **Freepik (Magnific) AI Model Dropdown, Pacing, and Pre-Automation Deselect Hook (`contributor.magnific.com`)**:
   - Prioritized custom Vue dropdown UI (`div.selector_base_model div.dropdown__button`, `div.dropdown__select li[data-value]`) over native hidden `<select>`, resolving the root cause where AI model selection was ignored by Vue.
   - Added 500ms delays before/after clicking the AI declaration toggle, and before/after selecting the AI base model.
   - Verified non-AI mode flow: when `!isAi && isCurrentlyChecked`, explicitly toggles OFF the AI declaration switch with 500ms pacing.
   - Added pre-automation header select-all deselection hook (`BaseAdapter.prepareAutomation()`, `overlay.js`, and `FreepikAdapter.prepareAutomation()`): checks `<input data-v-f08075b8="" type="checkbox">` / `.checkbox-dropdown__content.full` once at start; if active ("Select 2/2"), deselects all assets before processing card 1.
2. **Freepik (Magnific) Workflow Alignment & Save Button Fix (`contributor.magnific.com`)**:
   - Replaced `button.button-paste-draft` ("Create draft" template preset feature) in `FreepikAdapter.saveDraft()` with the actual asset save button `button[data-cy="savePreitems"]` (`<i class="icon--save"></i>`) in the sidebar header, eliminating the unexpected "Create a draft" modal dialog.
   - Added `dismissDraftModal()` helper to automatically close any stray draft modal.
   - Refined `clearMetadata()` to strictly use `button[data-cy="deleteTitle"]` and `button[data-cy="deleteTags"]`, verifying existing chips before clicking and skipping empty keyword fields completely.
   - Directed AI switch clicks to `span.switch__indicator` / `label.switch.aiSelector--check` to resolve Vue `TypeError: Cannot read properties of null (reading 'id')`.
   - Clamped Freepik AI keyword injection to **49 tags** (accounting for Freepik's 1 platform-injected tag to prevent 51/50 overflow) across `FreepikAdapter.js`, `src/popup/popup.js`, and `src/overlay/overlay.js`.
1. **Vecteezy Right Panel Form Scoping & Card Image Selection (`contributors.vecteezy.com`)**:
   - **MuiGrid Collision**: Resolved collision where `div.right` matched the 9-column asset grid container (`MuiGrid-grid-xs-9`, `sc-bUrGhc gHifVb right`) instead of the 3-column metadata editor form (`MuiGrid-grid-xs-3`, `sc-jSpnoh iRWKJS right`).
   - Implemented `getEditorForm()` prioritizing `div.MuiGrid-grid-xs-3.right`, `div.MuiGrid-grid-xs-3`, or the container with header `Files selected`, preventing title injection into the pagination input box.
   - **Direct Card `<img>` Click**: `selectCard()` now targets `cardElement.querySelector('img')` directly rather than the parent preview wrapper div, triggering Vecteezy's React selection handler reliably. Added `is-selected` guard to prevent toggling off.
   - **Editor Ready Guard**: `waitForEditorReady()` requires header text to show `(N) Files selected` (not `No Files selected`) or `is-selected` class, with 800ms card re-click retry.
   - **bulkSave Disambiguation**: Fixed collision where `"Deselect all"` was matched by `textContent.includes('select all')`, explicitly requiring `!textContent.includes('deselect')`.
   - **AI Checkbox Uncheck Guard**: In non-AI mode, detects active AI declarations via `.Mui-checked`, `.checkbox-checked`, or `div[data-testid="ai-software-dropdown"]` (bypassing React's missing native `checked` attribute) and clicks to turn off with retry verification.
   - **Sequential Per-Tag Keywords**: Loops through keywords one by one, setting individual tag text and simulating `Enter` + `Comma` key events to prevent Vecteezy from merging the whole string into a single invalid red chip (`No Special Characters`).
2. **Freepik (Magnific) Card Selection & simulateClick Deduplication (`contributor.magnific.com`)**:
   - Resolved `"Select 0/2"` and blocked metadata form by removing redundant second click on `cardElement` in `FreepikAdapter.js:selectCard()`.
   - Fixed `simulateClick()` in `src/adapters/utils/dom_helpers.js` which previously fired both synthetic `click` MouseEvent and native `element.click()`, causing double clicks in browser environments.
   - Added active selection verification and polling in `FreepikAdapter.js:waitForEditorReady()` with fallback checkbox click.
   - Added `if (isAlreadySelected) return;` guard preventing accidental deselection of active cards.
   - Guarded AI switch toggle in `fillMetadata()` against unhandled Vue validator exceptions.
2. **Freepik (Magnific) Live Bugfixes (`contributor.magnific.com`)**:
   - Filtered out 20 empty `.catalog__item--fake` placeholder cards from `detectAssetCount()` (`src/overlay/overlay.js`) and `getAssetCards()` (`src/adapters/FreepikAdapter.js`), correcting asset count from 22 to 2 and stopping unhandled Vue validator exceptions (`TypeError: Cannot read properties of undefined (reading 'length')` in `catalog.validator.ts`).
   - Targeted artwork preview `.thumbnail img[data-cy*="preitemImg"]` and excluded SVG badges (`aiGenerated.svg`) in `getThumbnailUrl()`, eliminating Vision API 400 Bad Request errors.
   - Added robust `findTrashButton()` in `clearMetadata()` and automated pre-injection clearing in `fillMetadata()` with 200ms settle delay, resolving keyword count overflow (172/50 red chips).
3. **Freepik Rebranding to Magnific (`contributor.magnific.com`)**:
   - Updated `src/manifest.json` `host_permissions` with `*://*.magnific.com/*`.
   - Updated `src/overlay/overlay.js` `detectPlatformId()`, `detectPlatform()`, and `detectAssetCount()` to match `host.includes('magnific.com')`, displaying `"Freepik (Magnific)"` and detecting asset cards accurately.
   - Updated `src/background/service_worker.js` with `hostPatterns: ['contributor.freepik.com', 'contributor.magnific.com']` and new catalog URL `https://contributor.magnific.com/catalog/pending-files/1`.
   - Updated `src/popup/popup.js` and `popup.html` with `"Freepik (Magnific)"` option and multi-domain tab matching (`Ready on Tab`).
   - Integrated `logger` into `src/adapters/FreepikAdapter.js` across card selection, clearing, injection, and per-item draft save (`button.button-paste-draft`).
2. **Editorial Prefix Reset & Guard (`src/popup/popup.js`, `src/overlay/overlay.js`)**:
   - Toggling off editorial switch now clears the prefix input and resets in-memory `editorialPrefix`.
   - `overlay.js` explicitly guards prefix passing so commercial descriptions remain 100% clean.
3. **Strict Keyword Chip Check on Shutterstock (`src/adapters/ShutterstockAdapter.js`)**:
   - Refactored `_getExistingKeywordChips()` to avoid false positive matching of other MUI form elements on empty assets.
   - `clearKeywords()` skips execution entirely when 0 chips are present or empty text indicator is displayed.
4. **OpenRouter & Multi-Vendor Model Selection Storage Fix (`src/services/StorageService.js`, `src/overlay/overlay.js`, `src/services/AiPrompt.js`, `src/background/service_worker.js`)**:
   - `chrome.storage.local` is now the primary source of truth, avoiding sync quota overflow (8KB limit) on large model catalogs (OpenRouter 435 models, 15KB).
   - Sync mirrors are safely pruned to <=5 models.
   - Gemini models normalized without `models/` prefix for Google's OpenAI endpoint while preserving OpenRouter vendor prefixes.
5. **Shutterstock CORS Image Proxy (`src/background/service_worker.js` & `src/services/AiService.js`)**:
   - Resolved `Access to fetch at ... has been blocked by CORS policy` when downloading thumbnails from `cdn.shutterstock.com`.
   - Delegated HTTP/HTTPS image fetching to `service_worker.js` (`FETCH_IMAGE_AS_BASE64`) leveraging extension `host_permissions` without CORS restrictions.
   - Retained local `blob:` URLs and unit test direct fetch fallbacks in `imageToBase64()`.
6. **Deep Material-UI Selectors & Workflow in `ShutterstockAdapter.js` (`src/adapters/ShutterstockAdapter.js`)**:
   - Targeted innermost elements: `textarea.MuiInputBase-input`, `div[role="button"]` / `[role="combobox"]` for Category 1 & 2 with text normalization ("The Arts" <-> "Arts"), `keyword-input-text input.MuiInputBase-input` with Enter simulation, and spelling warning approval ("Mark all as correct" / "Mark all keywords as correct").
   - Added active asynchronous polling to `approveSpellingWarnings()` (up to 3.5s) to allow asynchronous chip error rendering and spellcheck latency before clicking mark all correct.
   - Usage toggle: Material-UI toggle buttons `button[data-testid="button-editorial"]` vs `button[data-testid="button-commercial"]` inside `div[data-testid="usage-toggle"]`.
   - Sequential keyword clearing via 3-dots menu (`button[data-testid="more-keyword-actions-button"]` -> `[data-testid="clear-action"]`).
   - Bulk save: Target first card checkbox, toolbar `button[data-testid="select-page-button"]`, sidebar `button[data-testid="edit-dialog-save-button"]`, waits for save spinner to resolve and button to normalize, clicks toolbar "Deselect page", and closes drawer.
   - Verified auto-saving on graceful stop mid-batch, with 100ms responsive stop checking during cooldown in `overlay.js`.
   - Video (19 categories) vs Image (26 categories) shared workflow supported.
7. **Centralized LoggerService Integration**:
   - `ShutterstockAdapter.js` and `FreepikAdapter.js` now use `logger.step()`, `.info()`, and `.success()` across every single interaction step.
8. **Adobe Stock Live Fixes Round 1-5 Verified**:
   - Strict element sequence, non-AI releases switch to "No", and strict Save work button selector.

---

## 3. Actionable Next Steps for Incoming Agent (Phase 5)

1. **Step 1 (Live Browser Verification on Magnific / Freepik)**:
   - Contributor reloads unpacked extension (`chrome://extensions`).
   - Opens `https://contributor.magnific.com/catalog/pending-files/1`.
   - Confirms Overlay HUD detects `"Freepik (Magnific)"` with correct asset count, popup shows `"Ready on Tab"`, and runs automation with per-item draft save verification.
2. **Step 2 (Branch Review & Integration)**:
   - Contributor reviews Phase 4 changes on `task/platform-adapters` and merges into `dev` using `git merge --no-ff`.

---

## 6. Recent Session Handoff Log

| Session | Date | Branch | Commit | Summary | Next Focus |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 39 | 2026-09-10 | `task/platform-adapters` | `fix(vecteezy)` | Scope metadata editor to right panel, add prepareAutomation, clear buttons, software dropdown, and fix bulkSave selector | Live browser verification on Vecteezy |
| 38 | 2026-09-10 | `task/platform-adapters` | `fix(freepik)` | Prioritize custom dropdown for AI model, add 500ms interaction pacing, check & toggle off AI in non-AI mode, and add pre-start deselect hook | Live browser verification on Magnific / Freepik |
| 37 | 2026-09-10 | `task/platform-adapters` | `fix(freepik)` | Target button[data-cy="savePreitems"] (icon--save) for saving item, clamp AI keywords to 49, skip keyword clear when no chips exist | Live browser verification on Magnific / Freepik |
| 36 | 2026-09-10 | `task/platform-adapters` | `fix(freepik)` | Eliminate card double-click, deduplicate simulateClick in browser, poll active asset selection in waitForEditorReady | Live browser verification on Magnific / Freepik |
| 35 | 2026-09-10 | `task/platform-adapters` | `feat(freepik)` | Add support for contributor.magnific.com rebranding in manifest, overlay, background worker, popup UI, and integrate LoggerService | Live browser verification on Magnific / Freepik |
| 34 | 2026-09-10 | `task/platform-adapters` | `fix(shutterstock)` | Auto-clear editorial prefix on toggle off, tighten Shutterstock chip detection on empty assets, prioritize local storage to fix model saving quota | Live browser verification on Shutterstock |
| 33 | 2026-09-10 | `task/platform-adapters` | `fix(shutterstock)` | Async spelling auto-correct polling, save button spinner resolution wait, post-save deselect page, responsive cooldown stop | Live browser testing on Shutterstock |
| 32 | 2026-09-10 | `task/platform-adapters` | `fix(shutterstock)` | Background CORS image proxy, deepest MUI selectors, sequential clearing, tightened delays, LoggerService wired, 666/666 tests pass | Live browser testing on Shutterstock |
| 31 | 2026-09-10 | `task/platform-adapters` | `feat(logging)` | Implemented LoggerService.js, wired into AdobeStockAdapter, disabled global clearMetadata in overlay, verified 336/336 tests | Phase 5: End-to-End Live Browser Testing & Polish |
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
| 31 | 2026-09-10 | `task/platform-adapters` | `feat(logging)` | Implemented LoggerService.js, wired into AdobeStockAdapter, disabled global clearMetadata in overlay, verified 336/336 tests | Phase 5: End-to-End Live Browser Testing & Polish |
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
