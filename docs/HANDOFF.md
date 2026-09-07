# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State

- **Current Milestone**: Phase 4: Platform Adapters (Sub-phase 4.5 Complete -> Sub-phase 4.6 Next)
- **Active Branch**: `task/platform-adapters`
- **Latest Commit**: `feat(adapter): implement dreamstime, depositphotos, and miricanvas platform adapters`
- **Working Tree**: Clean local branch
- **Build / Test State**: Verified healthy (609/609 assertions passed across test_tier3_adapters.mjs [107/107], test_tier2_adapters.mjs [94/94], test_tier1_adapters.mjs [78/78], test_base_adapter.mjs [65/65], test_storage_v4.mjs [38/38], test_ai_prompt.mjs [65/65], test_sanitizer_service.mjs [86/86], test_ai_service.mjs [76/76], zero emoji clean)

---

## 2. Active In-Flight Context

Sub-phase 4.5 (Tier 3 Platform Adapters) is now **100% complete**:
1. **Dreamstime Adapter (`src/adapters/DreamstimeAdapter.js`)**:
   - URL matching for `dreamstime.com` (especially `/uploadfile` and `/upload/edit*`).
   - Modal detection (`div.popup-upload`) and grid asset extraction (`div.upload-item[id]`), with thumbnail extraction.
   - Numeric asset ID tracking from `.popup-nav__breadcrumbs` and modal attributes.
   - Full metadata clearing (`#js-remove-title`, `.js-editcleandescription`, `#js-remove-cat*`, `.js-editcleankeywords`).
   - Single-string instant injection for title and description.
   - Category pairs interaction with 300ms AJAX delay (`select#M_Category_1/2/3` -> `select#M_Subcategory_1/2/3`), with **AI Mode Special Rule**: Category 3 is hardcoded to "Illustration & Clipart" (172) and "Generative AI" (212).
   - Keywords comma-separated chip injection clamped to 70 tags max + Enter key simulation.
   - Commercial (RF) vs Editorial (ED) license button selection.
   - Save Draft with Toast Confirmation (`waitForElement('.noty_type__dt-success, #js-submit-message')`).
   - Next item navigation with **Infinite Carousel Loop Guard** (`navigateToNext()`): tracks processed asset IDs and detects cycle when next asset ID matches `firstAssetId` or was already processed.
   - Submit for review via `a#js-next-submit`.
2. **Depositphotos Adapter (`src/adapters/DepositphotosAdapter.js`)**:
   - URL matching for `depositphotos.com/files/unfinished.html`.
   - Table row card extraction (`tr.unfinished__item`) and thumbnail extraction.
   - Row selection via item checkbox (`td.unfinished__action label.checkbox-wrapper i`).
   - Editor readiness wait (`textarea.itemeditor__input_description`).
   - Description clearing (`a._itemeditor__reset_description`) and single-string instant injection.
   - Keywords clearing (`a._itemeditor__reset_keywords`, `i.tagseditor__remove`).
   - **Fast Tag Injection**: clicks trigger `span.paste_editor__tag`, injects comma-separated keywords (clamped to 50 tags max) into active input, and simulates Enter key.
   - Editorial & Country Location handling: sets `select._itemeditor__value_is_editorial` ('1' vs '0') and country code (`select._itemeditor__value_location_country_code`).
   - Nudity / Mature dropdown handling (`select._itemeditor__value_is_nudity`).
   - Paginator capacity helper (`select._paginator__list` -> '160').
   - **Bulk Save Strategy** (`bulkSave`): clicks table header select all (`th.unfinished__action i.select-all`) -> waits 200ms -> clicks control panel Save button (`button._cp__action_save`).
   - Submit for review via `button._cp__action_submit`.
3. **MiriCanvas Adapter (`src/adapters/MiriCanvasAdapter.js`)**:
   - URL matching for `designhub.miricanvas.com`.
   - Element card extraction from batch grid (`div.panda-ehlNbj div.panda-gFNlpN`, `div.css-1qnaji9`) and thumbnail extraction.
   - Card selection via container click.
   - Editor readiness wait (`textarea[placeholder="Enter Element Name"]`).
   - Title clearing and single-string instant injection clamped to 100 characters max.
   - Keywords clearing (removes active chips via SVG icons) and comma-separated tag injection into `input[placeholder*="Separate multiple keywords"]` (clamped to 25 tags max) + Enter simulation.
   - Content Tier (Pricing) selection: STANDARD (Free) vs PREMIUM (Paid) radio inputs.
   - AI Generated Declaration: checkbox toggle in AI image generator container.
   - Content Type handling (optional): selects `input[name="contentType"][value="..."]` if provided.
   - **Bulk Save Strategy** (`bulkSave`): clicks top navbar select all checkbox (`nav div.panda-cVAOOe input[type="checkbox"]`) -> waits 200ms -> clicks "Save Metadata" button.
   - Submit for review via "Submit" button.
4. **Verification Test Suite (`scratch/test_tier3_adapters.mjs`)**:
   - Validated all 107 assertions across all 3 adapters. All 7 platform adapters across Adobe Stock, Shutterstock, Vecteezy, Freepik, Dreamstime, Depositphotos, and MiriCanvas are now fully implemented.
   - Complete test suite passes 609/609 assertions across 8 test suites.

---

## 3. Actionable Next Steps for Incoming Agent (Phase 4)

1. **Step 1 (Sub-phase 4.6: Adapter Registry, In-Page HUD Wiring & Final Verification Test Suite)**:
   - Implement `src/adapters/index.js` auto-registry registering all 7 platform adapters.
   - Wire `OverlayHUD` in `src/overlay/overlay.js` to dispatch metadata through active platform adapter.
   - Build unit verification suite for registry and live tab matching.
2. **Step 2 (Phase 5: End-to-End Testing & Polish)**:
   - Live browser validation across microstock contributor portals.
   - Batch automation orchestrator & packaging.

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
