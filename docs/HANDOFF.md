# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State
- **Current Milestone**: Phase 5: End-to-End Hardening & Polish (Exclusive Automation Concurrency Lock & Multi-Tab Isolation Complete)
- **Active Branch**: `task/e2e-hardening-polish`
- **Latest Commit**: `6795edc` (`feat(overlay): implement exclusive automation lock across platforms and popup`)
- **Working Tree**: Clean local branch
- **Build / Test State**: Verified healthy (4/4 on exclusive lock suite, 7/7 on multi-tab isolation suite, 18/18 on Adobe auto-heal suite, 88/88 on Tier 1 adapters, 45/45 on Sub-phase 5.6, zero native emoji clean)

---

## 2. Active In-Flight Context

0. **Exclusive Automation Lock (Single Active Runner Policy)**:
   - **Cross-Platform Mutual Exclusivity**: Enforces that only one microstock platform can actively run automated metadata generation at any time across the browser.
   - **Non-Runner Tab Lock State**: When Platform A (e.g. Adobe Stock) is actively running, other platform tabs (e.g. Dreamstime, Depositphotos) automatically lock their HUD `Start Automation` button (`disabled = true`, class `.rj-btn-disabled`, lock SVG icon, text `Running on [Platform]`, badge `Busy ([Platform])`, and informative hover tooltip). Form controls remain editable for manual preparation.
   - **Single-Instance Toolbar Popup Synchronization**: Popup dynamically checks the active runner's platform against the currently selected platform. When viewing non-runner platforms, the start button is disabled with `Running on [Platform]` and lock SVG icon. Switching platform views updates the lock state in real-time.
   - **Reactive Auto-Unlock Lifecycle**: As soon as the runner tab completes its batch run or stops, `chrome.storage.onChanged` fires `isRunning: false`, instantaneously unlocking all open tabs back to active green `Start Automation` state.

Sub-phase 5.6 has modularized the in-page overlay controller by extracting the microstock automation batch execution loop, card iteration, Dreamstime carousel workflows, bulk saving, and graceful stop coordination out of `src/overlay/overlay.js` and into a dedicated ES module: `src/overlay/AutomationOrchestrator.js`:
1. **Extracted ES Module (`src/overlay/AutomationOrchestrator.js`)**:
   - Encapsulates multi-platform batch automation logic in `AutomationOrchestrator` class (596 lines).
   - Manages provider validation, platform adapter resolution via `getAdapterForUrl` / `getAdapterForPlatform`, `AbortController` cancellation lifecycle, and granular `rj_automation_state` storage schema updates.
   - Houses Section 6A Dreamstime continuous in-page carousel loop (editor wait -> thumbnail extraction -> AI metadata generation -> fillMetadata -> draft save -> direct review submission -> carousel advance).
   - Houses Section 6B standard microstock grid loop (card selection -> editor wait -> thumbnail extraction -> AI metadata generation -> fillMetadata -> Freepik per-item draft save -> cooldown pacing).
   - Houses post-loop bulk saving execution (`bulkSave()`) triggered on full completion or graceful stop.
   - Implements two-click graceful stop and force abort mechanics (`stop(force)`), properly maintaining `isStopping` status, disabling buttons, and displaying active pill spinners.
2. **Streamlined Overlay HUD Controller (`src/overlay/overlay.js`)**:
   - Reduced `overlay.js` from 2,044 lines to 1,472 lines (572-line reduction), isolating floating HUD UI presentation, viewport-clamped drag mechanics, and Quick Form bindings from automation orchestration.
   - Instantiates `this.orchestrator = new AutomationOrchestrator(this)` in constructor.
   - `startAutomation()` and `stopAutomation(force)` delegate cleanly to `this.orchestrator.start()` and `this.orchestrator.stop(force)`.
   - Preserves 100% of public HUD properties (`isAutomationRunning`, `isStopping`, `isCardProcessing`, `abortController`, `shadow`, etc.) and reactive methods without adapter regression risk.
3. **Preceding Sub-phase 5.5 Achievements (Popup Modularization)**:
   - Extracted all 7 platform HTML template generators into dedicated ES module `src/popup/platform_forms.js`, reducing `popup.js` by 257 lines.
2. **Active HUD Button Theme Alignment (`src/styles/components.css`)**:
   - Replaced hardcoded cyan/blue (`#57c1ff`, `rgba(87, 193, 255, ...)`) in `.rj-btn.rj-btn-active` and `.rj-btn-secondary.rj-btn-active` with the extension's canonical Emerald Teal palette (`#079183` border, `#59d499` text and icon stroke, `rgba(7, 145, 131, 0.12)` background, `rgba(7, 145, 131, 0.35)` focus ring).
3. **Minimized Floating Pill Activity Spinner (`src/overlay/overlay.css`, `src/overlay/overlay.js`)**:
   - Defined `@keyframes rj-spin` with continuous 360deg rotation and `.rj-hud-pill-status .rj-status-icon-spinner` (13x13px, stroke `#079183`).
   - Integrated `pillSpinnerSvg` during active processing (`Running...`, `Asset X of Y`, `Processing...`) and graceful stopping (`Stopping...`), providing a clear dynamic indicator that background tasks are active even when the HUD card is minimized.
   - Cleanly transitions to `pillReadySvg` checkmark on completion (`Finished`) and restores idle layers/ready status when reset.
4. **Status Badge String Simplification & Ellipsis Clamping with Tooltips (`src/overlay/overlay.css`, `src/overlay/overlay.js`)**:
   - Simplified all status badge string literals to concise canonical labels conforming to the audit specification (`scratch/pre_release_audit_notes.md:L92-L109`):
     - Normal loop: `'Generating...'`, `'Injecting...'`, `'Saving...'`, `'Submitting...'`, `'Cooldown...'`, `'Next asset...'`, `'Completed'`, `'Stopped'`, `'Idle'`, `'Running'`.
     - Problematic overflow labels resolved: `'Stopping (saving card)...'` and `'Stopping (saving)...'` simplified to `'Stopping...'`; `'Error: ' + ...` simplified to `'API Error'` or `'Failed'`.
     - Full operational details (`Generating AI metadata...`, `Saving all assets (X processed)...`, `Error: 400 Bad Request...`) are cleanly routed to the second parameter `tooltip` of `setStatusBadge(text, tooltip = text)`.
   - Added flexbox truncation rules (`min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`) to `.rj-hud-asset-label` and `span#rjAutomationStatusText`, clamping badge width (`max-width: 140px`) to eliminate card distortion on edge cases.
   - Synchronized `textContent` and `title` attributes across `#rjAutomationStatusText` and `.rj-hud-status-badge` so full context is always viewable on hover.
5. **Preceding Sub-phase 5.3 Achievements (Popup Real-Time Auto-Save)**:
   - Centralized debounced (300ms) and immediate auto-save engine in Popup with anti-loop guards (`isSyncingFromStorage`, `isSavingLocally`).
6. **Preceding Sub-phase 5.2 Achievements (Automation State Sync & Graceful Stop)**:
   - Standardized `rj_automation_state` schema `{ isRunning, isStopping, status, platformId, timestamp }`.
   - Added disabled "Stopping..." state with `.rj-btn-stopping` and repeated-click guards in both HUD and Popup.
6. **Previous Platform Adapter Achievements**:
1. **MiriCanvas Live Alignment (`designhub.miricanvas.com/en/element/to-do`)**:
   - **Keyword Bulk Trash Elimination & Reactive Verified Per-Chip Removal Engine (`clearKeywords()`)**: Eliminated the keyword bulk trash button completely as requested. Replaced with a reactive, verified per-chip removal engine:
     1. *Dynamic Querying*: Re-evaluates `getExistingChips()` on each iteration rather than operating on a stale array.
     2. *Bottom-Up Scroll Pacing*: Targets the last chip (`currentChips[currentChips.length - 1]`), scrolling it into view with `targetChip.scrollIntoView({ block: 'nearest', behavior: 'instant' })`. This matches human interaction from user recordings and causes the scrollable container to shrink naturally towards the top. Alternates to the top chip on failure.
     3. *Multi-Target Event Dispatch*: Dispatches pointer events, `simulateClick`, and bubbling `MouseEvent('click')` on both the inner path (`path[d*="10.587"]`) and the remove SVG (`svg[data-f="CD-213b"]`).
     4. *Active Disappearance Polling*: After each click, actively polls (up to 8 x 75ms = 600ms) waiting for `currentCount < prevCount`. Only proceeds to the next chip after React 18 has fully reconciled and unmounted the chip, eliminating concurrent click drops and ensuring 100% clean deletion before new keywords are injected.
   - **Sequential Form Injection Ordering (`fillMetadata()`)**: Restructured the form injection flow to strictly adhere to user sequence: AI generator checkbox toggle -> Pricing tier radio selection -> Content type radio selection -> `clearTitle()` + Title injection -> `clearKeywords()` + Keywords injection. Eliminates UI re-renders from toggles that previously decoupled cleared chip state.
   - **Keyword Chip Creation via Non-Blur Setter & Paste InputEvent (`fillMetadata()`)**: Solved the issue where pasted keywords failed to convert into chips (`span[data-f="CL-67aa"]`). Directly sets native input value via `HTMLInputElement.prototype.value` descriptor without premature `blur`. Dispatches synthetic `InputEvent` (`inputType: 'insertFromPaste'`), Enter key sequence (`keydown` -> `change` -> `keyup`), active polling verification for chip creation (up to 1200ms), comma + Enter fallback, sequential tag injection fallback, DOM chip verification logging, and only clears leftover uncommitted text after chips are confirmed.
   - **Trash Button Discrimination & Copy Button Filtering (`_findTrashButton()`)**: Explicitly prioritizes `button:has(div[data-f="DD-04b4"]), button:has(svg[data-f="DD-e725"])` and filters out copy buttons (`div[data-f="CD-7f75"], svg[data-f="ID-430b"]`). When multiple buttons are present, selects `buttons[1]` (the dedicated trash button in MiriCanvas DOM), preventing accidental copy actions.
   - **Ghost Sizer (`ul[data-f="GU-fa4b"]`) Exclusion**: Filtered out hidden virtualizer dummy card (`ul[data-f="GU-fa4b"]`) in `getAssetCards()` and `overlay.js:detectAssetCount()`, ensuring asset counts accurately match real visible cards from `ul[data-f="TU-5eb5"]`.
   - **Active Card Selection Guard (`selectCard()`)**: Inspects `.css-1510m7j` on card container; if already active, skips thumbnail click to prevent accidental unselection and editor form unmounting.
   - **Smooth In-View Scroll (`selectCard()`)**: Clicks thumbnail image `img.css-l67sxu.er317d31` / `div[data-f="DT-1ecb"]` with `cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })` to bring cards into viewport cleanly without activating card multi-edit checkboxes (`CI-66e5`).
   - **Pre-Automation Preparation Hook (`prepareAutomation()`)**:
     1. Left Navigation Sidebar Pre-Collapse: Inspects `nav[data-f="MN-02f2"], nav.panda-cAaCsB`. If open (`panda-mVcIL` class or `offsetWidth > 100`), automatically collapses it via `button[data-f="SB-82b8"]`.
     2. Navbar Select All Checkbox Reset: Inspects `nav[data-f="CT-a2b2"] input[data-f="CI-66e5"]`. If unchecked, clicks to check then uncheck (flushing any stale grid selection); if checked, clicks to uncheck.
   - **Editor Readiness Guard (`waitForEditorReady()`)**: Awaits right panel metadata form via `textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], div[data-f="SD-e6c2"]`.
   - **Form Field Injection**:
     1. AI Declaration: Reads Base UI `span[data-f="CC-bb45"][role="checkbox"]` inside container `div[data-f="AD-8705"]` and clicks to align with `options.isAiGenerated`.
     2. Content Tier (Pricing): Selects radio input `input[name="contentTier"][value="STANDARD"]` vs `input[name="contentTier"][value="PREMIUM"]` based on preference.
     3. Title: Clamped to <= 100 characters and injected via `setNativeValue`.
     4. Keywords: Clamped to <= 25 tags, injected with paste event and committed via Enter.
   - **Bulk Save Lifecycle & Navbar Cleanup (`bulkSave()`)**:
     1. Checks navbar Select All checkbox `nav[data-f="CT-a2b2"] input[data-f="CI-66e5"]`.
     2. Clicks Save Metadata button `button[data-f="SG-8f01"]`.
     3. Waits up to 8000ms until Save button becomes disabled (`saveBtn.disabled || saveBtn.hasAttribute('disabled') || saveBtn.getAttribute('aria-disabled') === 'true'`) or toast notification `section[data-f="SL-2fb0"]` appears.
     4. Waits 2000ms buffer for background synchronization / network persistence.
     5. Re-queries navbar Select All checkbox fresh to prevent stale DOM references and unchecks it to restore clean unselected grid state.
   - **Full LoggerService Integration**: Emits structured console logs with `.step()`, `.asset()`, `.info()`, and `.success()`.
2. **Depositphotos Live Alignment & Form Scoping (`depositphotos.com/files/unfinished.html`)**:
   - **Strict Card Scoping & Zero Cross-Card Leakage**: Removed dangerous `document.querySelector` fallback from `_queryScoped(root, selector)`. When querying within a card container (`root`), searches are 100% strictly scoped to `root` and return `null` if not found, eliminating the bug where Card 1's tag search leaked to Card 2's existing chips.
   - **Full-String Direct Comma Injection & Native Multi-Chip Splitting**: Depositphotos' native Backbone collection (`DP.Collection.Tags` in `unfinished.js`) defines `splitModelByKeywordNameRegex: /[,;]/g`. When `keydown Enter` is fired on `span.tagseditor__item_new > span.tagseditor__tag` with a full comma-separated string (`cleanTagsString`), Depositphotos natively parses the string, splits it by commas, and creates all 50 tag chips at once.
   - **Chip Overwrite Elimination**: Completely removed `div.tagseditor span[contenteditable="true"]` from active input selectors. Since every committed tag chip has `contenteditable="true"` on its inner span, querying it caused subsequent loop iterations to repeatedly overwrite the first created chip, leaving only the 50th keyword. Fallback queries now strictly isolate `span.tagseditor__item_new > span.tagseditor__tag, span.tagseditor__item[data-type="input"] > span.tagseditor__tag`.
   - **Pre-Start Header Select-All Deselection (`prepareAutomation()`)**: Depositphotos loads unfinished assets with `i._checkbox.checkbox-bicon.select-all` checked by default, causing multi-item selection where edits on any card are broadcast to all selected cards. `prepareAutomation()` inspects this checkbox on automation start and clicks to uncheck it if selected, cleanly isolating cards.
   - **Safe Single-Card Selection (`selectCard()`)**: `selectCard(cardElement)` tracks `this.activeCard` without clicking individual card checkboxes (`i.itemeditor__selectaction`), preventing cards from being grouped during sequential processing.
   - **Modern Itemeditor List Card Extraction**: Unfinished files page renders assets in a vertical list container `.itemslist > div.itemeditor` (with virtualized `.itemeditor_stub` state), replacing legacy table rows (`tr.unfinished__item`). Updated `getAssetCards()` with modern selector and legacy fallback, resolving "0 Assets Detected" bug on automation start.
   - **Progressive In-View Scroll & Virtualization Readiness**: `waitForEditorReady(cardElement)` brings virtualized items into the viewport using `cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })` and actively polls until Depositphotos removes `.itemeditor_stub`.
   - **Sequential In-Card Workflow with Namerow Defocus**: Each card contains its own embedded form container (`div._itemeditor__container.itemeditor__container`). Implemented the strict sequential order:
     1. Clear old description via `a._itemeditor__reset_description.itemeditor__reset_active`.
     2. Inject description into `textarea._itemeditor__value_description`.
     3. Defocus description by clicking `.itemeditor__row.itemeditor__namerow span.itemeditor__name` and triggering blur to commit value.
     4. Clear old keywords via `a._itemeditor__reset_keywords.itemeditor__reset_active`.
     5. Inject keywords via Dual-Strategy (ClipboardEvent paste or sequential Enter loop).
     6. Defocus keywords by clicking `.itemeditor__row.itemeditor__namerow span.itemeditor__name` and triggering blur.
     7. Editorial & Country: conditionally set only when enabled in preferences (`isEditorial: true`), left untouched otherwise.
   - **Bulk Save Strategy & Select-All Cleanup**: Scrolls back to top via `i.to-top-bicon` (or `window.scrollTo({ top: 0 })`), clicks table header `i._checkbox.checkbox-bicon.select-all`, and clicks control panel Save button (`button._cp__action_save`), polling until the button becomes disabled or sync indicator resolves. Automatically unchecks Select All after save completes.
   - **Full LoggerService Integration**: All Depositphotos steps emit structured console logs with `.step()`, `.asset()`, `.info()`, and `.success()`.
2. **Dreamstime Live Alignment & Carousel Orchestration (`dreamstime.com/upload/edit*`)**:
   - **Subcategory AJAX Latency Resolution**: Dreamstime populates `<select id="M_Subcategory_X">` asynchronously via an internal AJAX call triggered upon main category selection. Added async option polling (`subcatSelect.options.length > 1` with a 3000ms timeout) before selecting the subcategory, preventing the selection from being overwritten when the AJAX response renders.
   - **Granular Condition-Checked Clear Buttons**: Dreamstime provides clear buttons `#js-remove-title`, `#js-remove-all-description`, `#js-remove-cat1..3`, and `#js-remove-all-key`. Each button carries `data-state="hidden"` when empty and `data-state="visible"` when populated. Replaced unconditional clicking with granular checking (`clearTitleIfNotEmpty`, `clearDescriptionIfNotEmpty`, `clearCategoriesIfNotEmpty`, `clearKeywordsIfNotEmpty`), avoiding unnecessary DOM mutations.
   - **Strict Single-Word Keyword Splitting**: Dreamstime strictly prohibits multi-word keywords (e.g., "bus station" splits into "bus" and "station"). Updated `SanitizerService.js` to split strings by whitespace `/\s+/`, filter, deduplicate, and clamp to the 70 tag quota. Added duplicate protection in `DreamstimeAdapter.js:fillMetadata()`.
   - **License Type Selection (Commercial RF vs Editorial ED)**: Interacts with `#licensesubmissiontype a` (`a#tab-rf` / `a#tab-ed`), verifying active classes (`selected`, `active`) and clicking the desired license model.
   - **Save Edits & Submit Toast Lifecycle Polling**: Both Save Edits (`#js-savededits`) and Submit (`#submitbutton`) generate bottom-right toasts (`#noty_layout__bottomRight .noty_bar.noty_type__dt-success`). Implemented two-stage toast waiting: first polls for `.noty_bar` to appear, then polls until `.noty_bar` disappears from the DOM, guaranteeing the server has acknowledged the update before advancing.
   - **Section 6A In-Page Carousel Loop**: In `/upload/edit*`, assets are presented in a continuous carousel rather than a static grid. Implemented an in-page carousel loop in `src/overlay/overlay.js` that inspects the active asset, executes AI generation and injection, saves edits (Mode A) or submits directly (Mode B), and clicks `#js-next-submit`. Detects cycle completion when the asset ID returns to `firstAssetId`.
   - **Full LoggerService Integration**: All steps emit structured, formatted console messages with `.step()`, `.asset()`, `.info()`, and `.success()`.
2. **Vecteezy Live Alignment & Form Scoping (`contributors.vecteezy.com`)**:
   - Scoped all metadata editor queries strictly to the right panel (`div.right, div[class*="right"]`), eliminating selector collision with the left filter sidebar (`<aside>`) which had identical `pro`, `free`, `editorial` and radio group attributes.
   - Added pre-automation preparation hook (`VecteezyAdapter.prepareAutomation()`): automatically closes the left filter sidebar if open, and clicks toolbar `"Deselect all"` button if any cards are currently selected before card 1. Skips cleanly if already `"Select all"`.
   - Integrated title clear X icon (`div[data-testid="text-input"] svg[position="end"]`, `svg.sc-gsqrwE`, `svg`) and keywords bulk ClearIcon (`svg[data-testid="ClearIcon"]`) adjacent to `div[data-testid="tagger-input"]`.
   - Handled AI declaration checkbox, MUI select dropdown generator options (`midjourney`, `stable_diffusion`, `dall_e`), and `"other"` option with custom tool name injection into `input#undefined-input`. In non-AI mode, explicitly unchecks the AI checkbox if active.
   - Fixed `bulkSave()` `SyntaxError` caused by invalid `:has-text(...)` pseudo-selector, replacing it with standard JavaScript array `.find()`.
   - Disambiguated `"Select all"` button matching in `bulkSave()` by explicitly checking `!includes('deselect') && includes('select all')` to prevent substring collision with `"Deselect all"`.
   - Full `LoggerService` integration across all steps (`(this.logger || logger).step()`, `.info()`, `.success()`).
   - Verified clean graceful stop flow triggering `bulkSave()` without unhandled exceptions.
   - **Direct Input Checkbox Click & Prototype Setter**: Updated `fillMetadata()` to click the native `<input>` element directly (rather than the wrapper `<span>`), eliminating manual property assignment that corrupted React 18's internal `_valueTracker`. Added `setNativeCheckbox()` fallback invoking `HTMLInputElement.prototype.checked` setter and dispatching synthetic events.
   - **AI Software Dropdown Polling & Mousedown Open**: Waits for React to mount `div[data-testid="ai-software-dropdown"]` (up to 2000ms), dispatches `mousedown` + `click` to trigger Material-UI Select open handler, polls for options popover (`ul[role="listbox"] li`), dispatches `mousedown` + click on target option (`dall_e`, `midjourney`, `stable_diffusion`, `other`), and injects custom software name if "Other" is selected.
   - **Enter Key Simulation & Popover Dismissal on Custom AI Software**: Dispatches `simulateEnterKey` and synthetic `keydown`/`keypress`/`keyup` Enter events on `input#undefined-input` inside `div[data-testid="other-text-input"]`, followed by `customInput.blur()` to commit the software name. Defensively closes any lingering Material-UI popovers via backdrop click and `Escape` key events, preventing the open dropdown from carrying over to subsequent asset cards.
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

---

## 3. Actionable Next Steps for Incoming Agent

1. **Step 1 (Sub-phase 5.7: Final End-to-End Live Verification & Documentation Sync)**:
   - Perform end-to-end live testing across all 7 supported microstock contributor portals (Adobe Stock, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, MiriCanvas).
   - Verify keyboard navigability and focus traps across popup and overlay HUD interfaces.
   - Reconcile and synchronize all release documentation, architecture diagrams, and ROADMAP milestones.
2. **Step 2 (Phase 5 Completion & dev Branch Merge)**:
   - Final clean code audit, pre-release packaging verification, and user approval for merge to `dev`.

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
    - **MiriCanvas**: Capacity selector supports up to 1,000 items; DOM contains hidden virtualizer sizer list `ul[data-f="GU-fa4b"]` with dummy card that must be filtered out in favor of `ul[data-f="TU-5eb5"]`; card selection toggles off if clicked while already active; trash vs copy buttons in section headers share `data-f="TT-c273"` and require disambiguation via `div[data-f="DD-04b4"]` / `svg[data-f="DD-e725"]`; sequential Enter/Comma events commit keyword tags into chips.
8. **Multi-Tab Cross-Platform Storage Isolation**:
   - `rj_automation_state` in `chrome.storage.local` is broadcast across all open extension contexts. When multiple contributor platform tabs are open simultaneously (e.g. Adobe Stock and Dreamstime in separate tabs):
     - `OverlayHUD.onStorageChanged` and `restoreAutomationState` must strictly enforce `if (state.platformId && state.platformId !== this.platformId) return;`. Without this guard, inactive tabs misinterpret start signals from other platforms, invoke `startAutomation()`, find 0 cards, and broadcast idle signals that kill active batches in a continuous ping-pong collision loop.
     - Background service worker `chrome.tabs.onUpdated` auto-heal must strictly verify `state.tabId === tabId` before resetting state to idle. Unrelated tab navigations or background iframe reloads must never terminate active automation runs.

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
| 50 | 2026-09-15 | `task/e2e-hardening-polish` | `feat(overlay)` | Implemented exclusive automation concurrency lock (Single Active Runner Policy) across HUD and toolbar popup, disabling start actions on non-runner tabs with Running on [Platform] status and lock SVG icons, 4/4 tests passed | Sub-phase 5.7: Final End-to-End Live Verification & Documentation Sync |
| 49 | 2026-09-15 | `task/e2e-hardening-polish` | `cdeb90d` | Implemented multi-tab automation state isolation by platformId and tabId scoping across overlay, orchestrator, and service worker, eliminating cross-tab start/stop collision loop and browser freezes (7/7 tests passed) | Sub-phase 5.7: Final End-to-End Live Verification & Documentation Sync |
| 48 | 2026-09-13 | `task/e2e-hardening-polish` | `fix(adobestock)` | Implemented direct native select fast-path and single-attempt waitForElement interaction in AdobeStockAdapter, eliminating 3x dropdown open/close loops; added 4-layer auto-healing across Service Worker, Router, Overlay, and Popup for stuck automation states, 16/16 and 87/87 tests passed | Sub-phase 5.7: Final End-to-End Live Verification & Documentation Sync |
| 47 | 2026-09-13 | `task/e2e-hardening-polish` | `refactor(overlay)` | Extracted automation execution loop and graceful stop into AutomationOrchestrator.js, reducing overlay.js by 572 lines (45/45 tests passed) | Sub-phase 5.7: Final End-to-End Live Verification & Documentation Sync |
| 46 | 2026-09-13 | `task/e2e-hardening-polish` | `refactor(popup)` | Extracted all 7 platform dynamic form generators into dedicated ES module platform_forms.js, reducing popup.js by 257 lines (77/77 tests passed) | Sub-phase 5.6: Overlay Modularization (Extract AutomationOrchestrator.js) |
| 45 | 2026-09-13 | `task/e2e-hardening-polish` | `style(ui)` | Optimized logo asset (~60 KB), aligned active button theme to Emerald Teal, added pill spinner, and clamped badge text with tooltips (66/66 tests passed) | Sub-phase 5.5: Popup Modularization (Extract `platform_forms.js`) |
| 44 | 2026-09-13 | `task/e2e-hardening-polish` | `feat(popup)` | Implemented real-time auto-save engine for all popup fields, debounced text inputs, anti-loop guards, bidirectional HUD <-> Popup sync, 34/34 tests passed | Sub-phase 5.4: Assets, Theme Alignment, Pill Spinner & Status Badge Clamping |
| 43 | 2026-09-13 | `task/e2e-hardening-polish` | `fix(sync)` | Resolved HUD <-> Popup automation state synchronization during graceful stop, expanded rj_automation_state schema, two-click stop lifecycle, disabled Stopping... state, 65/65 tests passed | Sub-phase 5.3: Popup Real-Time Auto-Save Engine |
| 42 | 2026-09-13 | `task/e2e-hardening-polish` | `59c9935` | Persisted overlay visibility across navigations via rj_overlay_visible, deleted obsolete stub files (AiVisionService, PromptBuilder), unified platform detection, 35/35 tests passed | Sub-phase 5.2: HUD <-> Popup Automation State Synchronization & Graceful Stop |
| 36 | 2026-09-13 | `task/platform-adapters` | `fix(miricanvas)` | Eliminated keyword bulk trash logic and implemented reactive verified per-chip removal engine with bottom-up scroll & disappearance polling in MiriCanvas, verified 113/113 tests | Phase 5: End-to-End Live Browser Testing & Polish |
| 35 | 2026-09-13 | `task/platform-adapters` | `6fc3650` | Implemented dual-strategy keyword chip clearing (bulk trash button + per-chip 'x' remove icon fallback with 50ms pacing) and sequential form ordering in MiriCanvas, verified 112/112 tests | Phase 5: End-to-End Live Browser Testing & Polish |
| 34 | 2026-09-13 | `task/platform-adapters` | `8879594` | Resolved MiriCanvas keyword chip conversion via non-blur setter + insertFromPaste InputEvent + Enter/comma fallback, trash button discrimination (`DD-04b4`), and bulk save 8000ms disabled/toast wait with 2000ms sync buffer & fresh navbar uncheck, verified 112/112 tests | Phase 5: End-to-End Live Browser Testing & Polish |
| 33 | 2026-09-12 | `task/platform-adapters` | `fix(miricanvas)` | Eliminated redundant paste event and dual comma fallback in MiriCanvas keyword injection, verified 112/112 tests | Phase 5: End-to-End Live Browser Testing & Polish |
| 32 | 2026-09-12 | `task/platform-adapters` | `fix(miricanvas)` | Eliminated ghost sizer card in `ul[data-f="GU-fa4b"]`, added active selection check to prevent toggle-off, discriminated copy vs trash buttons (`DD-04b4`), verified 112/112 tests | Phase 5: End-to-End Live Browser Testing & Polish |
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
