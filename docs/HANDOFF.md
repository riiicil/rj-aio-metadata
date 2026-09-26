# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential operational context, in-flight state, platform gotchas, and immediate instructions for incoming AI agents resuming work.

---

## 1. Immediate Operational State
- **Current Milestone**: Multi-Language Architecture & Platform Hardening (Issues 1-5)
- **Active Branch**: `task/multilingual-fixes`
- **Latest Commit**: `fb930cd` (`fix(popup): sync start button tab match and depositphotos locale urls`)
- **Working Tree**: Clean (on branch `task/multilingual-fixes`)
- **Build / Test State**: Verified healthy (11/11 localized URL and tab match tests passed, 88/88 adapter tests passed, 4/4 lock tests passed, zero native emoji clean)

---

## 2. Active In-Flight Context

0. **Popup vs HUD State Synchronization & Depositphotos Locale URL Detection (`popup.js`, `DepositphotosAdapter.js`)**:
   - **Popup vs HUD State Synchronization Guard (`popup.js`)**: Scoped the `isSavingLocally` guard in `chrome.storage.onChanged` strictly to settings and provider configuration updates (`platformSettings`, `providers`, `activeProvider`, `activePlatform`). Previously, placing `if (isSavingLocally) return;` at the root dropped incoming automation state signals (`changes.rj_automation_state`) and HUD visibility toggles (`changes.rj_overlay_visible`) during local popup auto-saves. Progress updates, start/stop transitions, and overlay visibility events are now guaranteed to process immediately.
   - **Enforced Tab-Match Start Button Readiness in Toolbar Popup (`popup.js`)**: Added `isCurrentTabMatched()` helper and integrated it into the idle evaluation branch of `updateAutomationButtonUI()`. The Start button is now disabled with title `"Active tab does not match this platform"` whenever the active tab URL does not correspond to the selected platform. Added click guard in `btnToggleAutomation` click listener blocking execution if the tab is not matched. Prevents cross-platform deadlocks where HUD locked with "Busy (Platform)".
   - **Depositphotos Non-English Locale URL Detection Fix (`DepositphotosAdapter.js`)**: Updated `isMatch(url)` to check `url.includes('depositphotos.com') && url.includes('/files/unfinished')`. Enables seamless detection for non-English localized contributor URLs (such as `https://depositphotos.com/id/files/unfinished.html`, `/de/files/unfinished.html`, `/es/files/unfinished.html`, `/fr/files/unfinished.html`), allowing `getAdapterForUrl` to resolve properly instead of falling back to unknown page.
   - **Verification**: Verified with `scratch/test_sync_and_depositphotos_locale.mjs` and all existing regression suites (520+ assertions passed).

00. **Toolbar Popup Start Button Readiness & HUD Synchronization (`popup.js`)**:
   - **Discrepancy Diagnosed**: Investigated issue where the Toolbar Popup's "Start Automation" button was enabled immediately upon fresh installation, even when no API key or model was configured, whereas the In-Page Overlay HUD correctly kept the Start button disabled.
   - **Root Cause**: Identified regression originating from commit `6aaf749` where the call to `isCurrentProviderReady()` inside `updateAutomationButtonUI` in `src/popup/popup.js` was accidentally replaced with a hardcoded `btnToggleAutomation.disabled = false;`.
   - **Enforced Provider Readiness in Toolbar Popup**: Re-connected `isCurrentProviderReady()` into `updateAutomationButtonUI` in `src/popup/popup.js`, setting `btnToggleAutomation.disabled = !ready`, toggling `.rj-btn-disabled` class, and updating title. Connected dynamic re-evaluation upon model fetching (`btnFetchModels`), file import (`apiKeyFileInput`), and storage sync (`chrome.storage.onChanged`), plus added defense-in-depth guard in click handler.
   - **Verification**: Verified 4/4 lifecycle assertions with `scratch/test_popup_readiness.mjs` and all regression test suites.

00. **Google Gemini OpenAI Endpoint Authorization Header Fix (`service_worker.js`) & Version 0.1.1 Bump**:
   - **Root Cause Diagnosed**: Investigated console log errors from `bahan/log_console_shutterstock.md` (lines 209-224, 519-530) and `bahan/log_console_adobestock.md`: `API Error (API_REQUEST_FAILED): Provider API error (400): [{"error": {"code": 400, "message": "Missing or invalid Authorization header.", "status": "INVALID_ARGUMENT"}}]`.
   - **Fix Applied**: In `src/background/service_worker.js:buildProviderRequestParams`, added `headers['Authorization'] = `Bearer ${activeKey}`;` to the `if (isGemini)` branch. Google's `/v1beta/openai/chat/completions` endpoint strictly validates standard OpenAI authentication headers; omitting it triggered HTTP 400 rejection.
   - **Version 0.1.1 Synchronized**: Version bumped to 0.1.1 across `src/manifest.json`, `package.json`, and `CHANGELOG.md` per `docs/GIT_POLICY.md` Section 6.

00. **Shutterstock Spelling Approval Precision Targeting & Keyword Overflow Prevention (`ShutterstockAdapter.js`)**:
   - **User Diagnostic Demonstration (`rekaman-shutterstock-20260917_034756.json`)**: User provided a manual recording demonstrating exact click on `"Mark all keywords as correct"` inside `div[data-testid="keyword-input"] > div:nth-of-type(3) > button[data-testid="button"]`.
   - **Keyword Overflow Bug Diagnosed (`rekaman-shutterstock-20260917_034439.json`)**: An overly broad container query in previous commit matched and clicked `button[data-testid="add-all-button"]` (Shutterstock's suggested keywords block), which added extra suggested tags causing keywords to overflow past 50 (to 64/50 and 65/50).
   - **Clean Rollback & Precision Fix**: Rolled back working tree to `256fe01`. Updated `approveSpellingWarnings` to specifically target `div[data-testid="keyword-input"]` searching for text `"mark all keywords as correct"` or `"mark all as correct"`, while explicitly excluding `add-all-button`, `more-keyword-actions-button`, and any `role="tab"` or `tab-*`.
   - **Guaranteed Behavior**: Does NOT click `tab-correction_needed` (no navigation alert), does NOT click `add-all-button` (no keyword overflow), and cleanly clicks the spelling approval button when spelling errors occur.

00. **Production Build & Obfuscation Pipeline (`build.js`, `obfuscator.config.js`, `package.json`, `.gitignore`)**:
   - **Bundle-First Architecture (Option 2)**: Avoids ESM import breakage by running `esbuild` first across the 4 MV3 entry points (`background/service_worker.js`, `popup/popup.js`, `overlay/overlay.js`, `content/content_main.js`). All internal dependencies are bundled into standalone files in 19ms before `javascript-obfuscator` executes.
   - **MV3 Safe Obfuscator Configuration**: Configured with `disableConsoleOutput: false` (all console/activity logs appear 100% intact in DevTools), `debugProtection: false` (no debugger freezes), `renameGlobals: false` (protects `chrome.*`, `window.*`, `document.*`), `selfDefending: false` (service worker isolate stability), and `stringArrayEncoding: ['base64']`.
   - **Automated Distribution Packaging**: Copies static assets, cleans `dist/manifest.json` `web_accessible_resources`, and packages `dist/` into `releases/v[version].zip` ready for direct upload to Ko-fi, Lynk.id, or GitHub Releases.
   - **Pristine Open Source Git Repository**: `.gitignore` strictly ignores `dist/`, `build/`, `releases/`, `v*/`, `*.zip`, `node_modules/`, `package-lock.json`, `build.js`, `package.json`, and `obfuscator.config.js`. The public GitHub repository remains 100% clean and transparent.

000. **100% Multi-Language Resilience & Zero English Text Dependency (`AdobeStockAdapter`, `ShutterstockAdapter`, `VecteezyAdapter`, `DreamstimeAdapter`, `MiriCanvasAdapter`)**:
   - **Operational Rule (No Submit/Send)**: User explicitly clarified that except for Dreamstime Mode B carousel submission, **NONE of the platforms use submit/send review** (no submit in Vecteezy, MiriCanvas, Freepik, Adobe Stock, Shutterstock, Depositphotos). All workflows strictly save drafts, changes, and metadata.
   - **Zero Text Dependency Architecture**: Instead of bloating codebase with multi-language text dictionaries, all adapters now use structural attributes (`data-testid`, `data-t`, `data-f`, `value`, `name`, `:nth-of-type`, SVG icon signatures):
     - **Adobe Stock**: Releases switch targets `input[data-testid="has-release-no"], input[data-t="has-release-no"], input[name="hasReleases"][value="no"]` and structural second radio in group. Save button prioritizes `button[data-testid="save-work"], button[data-t="save-work"]`. Bulk select prioritizes `input[data-testid="select-all-checkbox"]`.
     - **Shutterstock**: Keyword clearing targets `li[data-testid="clear-action"]`. Save button targets `button[data-testid="edit-dialog-save-button"]`. Toolbar selection uses `#bulk-editor button[data-testid="button"]`.
     - **Vecteezy**: License radios target `label[data-testid="radio-input"] input[value="pro"]`, `value="free"`, and `value="editorial"` natively. Selection and save check `div[data-testid="filter-bar"] button[data-testid="button"]` and `div[data-testid="save-changes-icon"]` with progressbar waiting.
     - **Dreamstime**: License switching uses container `#licensesubmissiontype` links indexing (`links[0]` Commercial, `links[1]` Editorial).
     - **MiriCanvas**: Save button targets `button[data-f="SG-8f01"]` and diskette SVG path `path[d^="M7 19v-6h10v6"]`.
     - **Depositphotos & Freepik**: Fully resilient via BEM classes and `button[data-cy="savePreitems"]`.

00. **Dreamstime Cross-Page Continuation & Auto-Heal Exception (`service_worker.js`, `AutomationOrchestrator.js`, `overlay.js`)**:
   - **Cross-Page Navigation Gotcha**: Dreamstime redirects / navigates between assets (`/upload/edit?item_id=...`). The service worker's `tabs.onUpdated` auto-heal previously mistook in-domain reloads as cancellation signals, wiping state to idle. Concurrently, newly mounted `OverlayHUD` instances wiped storage because `orchestrator.isProcessing` was initially false on fresh JS execution contexts.
   - **Service Worker Exception**: Updated `service_worker.js:tabs.onUpdated` to preserve active state during Dreamstime in-domain navigation (`state.platformId === 'dreamstime' && !state.isStopping && (url === '' || url.includes('dreamstime.com'))`). Reloading while stopping or navigating away (e.g. to Google) still safely triggers auto-heal reset.
   - **Orchestrator State Tracking & Unload Guard**: Updated `AutomationOrchestrator.js` to decouple visual running state from loop execution via `this.isExecutionLoopActive`, pass `initialCount` to resume asset counting (`processedCount`), attach a `beforeunload` listener preventing premature state wipe during page teardown, and cleanly handle zero assets when Dreamstime redirects back to the uploads batch list (`Finished ${initialCount} assets`).
   - **OverlayHUD Auto-Resume**: In `overlay.js:restoreAutomationState()`, detects `isDreamstimeContinuation`, immediately sets `isAutomationRunning = true` to display "Stop" without flicker, and schedules `startAutomation(state.processedCount || 0)` with a 1000ms delay to let the newly loaded DOM settle before continuing.

00. **UI Polish: Stop Button Shortening, Donate Icon Unboxing & Content Script Match Restriction**:
   - **Stop Button Shortening**: Shortened running button label from `"Stop Automation"` to `"Stop"` across both Popup (`popup.js`) and HUD (`overlay.js`), maintaining 12px font-weight 500 typography and square stop Lucide SVG.
   - **Support Icon Unboxing**: Removed `.rj-btn-icon` class from `#supportProgressIcon` in `popup.html` (which previously applied a 34x34px bordered box from `components.css:527`), and set transparent styles in `popup.css` and `overlay.css`.
   - **Restricted Content Script Matches**: Restricted `content_scripts.matches` in `manifest.json` from wildcards (`http://*/*`, `https://*/*`) to the 8 explicit supported platform domains, and added `isSupportedPlatformPage()` hostname whitelist check in `content_main.js`.

000. **Support Ticker Polish & Animations (Popup & HUD)**:
   - **HUD Spinner Rotation Fix**: Added global `.rj-rotating, .rj-status-icon-spinner { animation: rj-spin 0.8s linear infinite; flex-shrink: 0; }` in `src/overlay/overlay.css` and added `.rj-rotating` class to `hudSpinnerSvg` in `src/overlay/overlay.js`.
   - **Smooth Entrance & Exit Animation**: Applied `@keyframes rj-btn-appear` (`scale(0.92)` to `scale(1)` with cubic-bezier easing) to `#btnSupportProgress` and `#rjBtnHudSupportProgress` via `.rj-visible` class.
   - **Smooth Ticker Content Swap Animation**: Applied `@keyframes rj-ticker-swap` (`translateY(2px)` with fade) to `.rj-ticker-animating > *` re-triggered during every phase transition.
   - **Typography Standardization**: Standardized all bottom action buttons across Popup and HUD to `font-size: 12px`, `font-weight: 500` (removed bold), and system sans font-family (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`).
   - **5 Rotating Donation Variations**: Replaced single coffee item with array of 5 cycling variations:
     1. `Send a coffee` (`[Coffee SVG]`)
     2. `Donate a coin` (`[Coins SVG]`)
     3. `Support dev` (`[Banknote SVG]`)
     4. `Gift a pizza` (`[Pizza SVG]`)
     5. `Sponsor dev` (`[Heart SVG]`)
     All strictly adhere to the Zero Native Emoji policy.
   - **Interactive Donation Trigger**: Clicking the button opens the user's donation link in a new browser tab (`window.open(DONATION_URL, '_blank')`).
   - **Configurable `DONATION_URL`**: Declared as a clean constant at the very top of `src/popup/popup.js` and `src/overlay/overlay.js` (`export const DONATION_URL = 'https://trakteer.id/yourname';`).

1. **Exclusive Automation Lock (Single Active Runner Policy)**:
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

1. **Step 1 (Branch Integration & Merge to `dev`)**:
   - Merge `task/e2e-hardening-polish` into `dev` using non-fast-forward merge:
     ```bash
     git checkout dev
     git merge --no-ff task/e2e-hardening-polish -m "merge branch 'task/e2e-hardening-polish' into dev"
     ```
2. **Step 2 (Production Merge to `main` & Release Tagging)**:
   - Merge `dev` into `main`:
     ```bash
     git checkout main
     git merge --no-ff dev -m "chore(release): v0.1.0"
     git tag -a v0.1.0 -m "Release v0.1.0"
     ```
3. **Step 3 (Remote Push & Archive Distribution)**:
   - Push branches and tags to GitHub upon user confirmation:
     ```bash
     git push origin main dev --tags
     ```
   - Publish `releases/v0.1.0.zip` to GitHub Releases, Ko-fi, and Lynk.id.


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
9. **Shutterstock Two-Tier Saving Strategy & Mode-Dependent Numeric IDs**:
   - Unlike other platforms, Shutterstock's asset editing sidebar does **NOT** auto-save on blur or card navigation. Edits remain solely in local React state and are discarded if navigating to another card without clicking the explicit "Save" button (`button[data-testid="edit-dialog-save-button"]`). Therefore, `AutomationOrchestrator.js` must invoke `await adapter.saveDraft()` on every processed card.
   - Post-loop `bulkSave()` acts as a resilient second-tier backup. Toolbar buttons must be matched bilingually (e.g. `"Select page"` / `"Pilih halaman"`, `"Save"` / `"Simpan"`, `"Deselect page"` / `"Batal pilih halaman"`).
   - In Shutterstock Contributor, numeric category IDs are mode-dependent: in Photo mode, **Transportation** has ID `'0'`, whereas in Video mode, **Transportation** has ID `'19'` (while all other 18 IDs are shared `'1'` through `'18'`). The adapter determines this dynamically via `window.location.pathname.includes('/video')`.
10. **Universal Multilingual Category Resolution via Numeric IDs**:
   - On localized contributor interfaces (e.g. Indonesian `id`, German `de`, French `fr`), category dropdown labels are translated (`"Alam"` instead of `"Nature"`, `"Seni"` instead of `"The Arts"`), causing string comparisons to fail and resetting select elements to empty defaults.
   - Both Dreamstime and Shutterstock native option elements (`<option value="ID">` and `<li role="option" value="ID">`) possess immutable numeric IDs. Resolving categories to their numeric IDs (`resolveDreamstimeCategoryId` and `resolveShutterstockCategoryId`) completely immunizes the extension against UI localization changes.
   - For Dreamstime, compound conjunctions (`"dan"` vs `"and"` vs `"&"`) must be normalized to single spaces during lookup to prevent false mismatches.
11. **Depositphotos Bidirectional Editorial Dropdown Synchronization**:
   - In Depositphotos Contributor, the editorial dropdown (`select._itemeditor__value_is_editorial`) defaults or retains prior state across unfinished items.
   - When automation runs with `isEditorial: false` (commercial mode), the adapter MUST explicitly locate `editorialSelect` and switch it to `'no'` / `'0'` if currently truthy or set to `'yes'`. Omitting the `else` branch leaves pre-existing editorial items stuck in Editorial mode with mandatory country/city validation errors.

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
| 62 | 2026-09-27 | `task/multilingual-fixes` | `cfa8fbb` | Implemented Depositphotos bidirectional editorial dropdown synchronization (explicit reset to 'no' when isEditorial: false) and aligned Shutterstock description character limit to 450 across prompt, sanitizer, and adapter | Complete documentation, user review & merge to dev |
| 61 | 2026-09-27 | `task/multilingual-fixes` | `fdae7a7` | Implemented Issues 3, 4, 5 from notes.md: Dreamstime limit expansion (Title 300, Desc 600), Shutterstock description limit (300), two-tier save workflow (per-card saveDraft + backup bulkSave), and universal multilingual category resolution via numeric IDs for Dreamstime (15 main + subcategories) and Shutterstock (Photo 26 vs Video 19) | Complete documentation, user review & merge to dev |
| 60 | 2026-09-27 | `task/multilingual-fixes` | `fb930cd` | Fixed popup vs HUD state sync by scoping isSavingLocally guard, enforced tab-match Start button readiness in popup, and resolved Depositphotos non-English locale URL detection (/id/files/unfinished.html) | Address Items 3, 4, 5 in bahan/notes.md (Dreamstime & Shutterstock) |
| 59 | 2026-09-22 | `task/fix-gemini-auth-header` | `2c0992d` | Enforced provider readiness validation (isCurrentProviderReady) on toolbar popup Start button with disabled styling, tooltips, and dynamic re-evaluation across models/keys/storage to sync 1:1 with Overlay HUD | Review & merge task/fix-gemini-auth-header to dev, build v0.1.1 |
| 58 | 2026-09-22 | `task/fix-gemini-auth-header` | `96df8a5` | Added missing Authorization: Bearer header for Google Gemini OpenAI endpoint in service_worker.js, bumped version to 0.1.1 across manifest.json, package.json, and CHANGELOG.md | Popup start button readiness sync & release verification |
| 57 | 2026-09-17 | `task/e2e-hardening-polish` | `d7ba885` | Comprehensive documentation suite synchronization (README badges/diagram, CHANGELOG Keep-a-Changelog v0.1.0, ARCHITECTURE, DECISIONS ADR-008..013, GIT_POLICY SemVer, DOCS_STYLE template, CURRENT_STATE, HANDOFF), refreshed release archive | Merge task/e2e-hardening-polish into dev & main, tag v0.1.0 |

| 56 | 2026-09-17 | `task/e2e-hardening-polish` | `0e02008` | Precision target Shutterstock spelling warnings button in div[data-testid="keyword-input"] excluding add-all-button and tabs, preventing keyword overflow past 50; updated build.js with LOAD THIS FOLDER subfolder and URL files | Documentation & Release Sync |
| 55 | 2026-09-17 | `task/e2e-hardening-polish` | `256fe01` | Implemented bundle-first production obfuscation pipeline (esbuild + javascript-obfuscator) generating standalone dist/LOAD THIS FOLDER/ and release zip; updated .gitignore | Shutterstock spelling approval fix |
| 54 | 2026-09-17 | `task/e2e-hardening-polish` | `405025d` | Hardened all 7 platform adapters for 100% multi-language resilience using structural DOM selectors without English text dependencies (11/11 tests passed) | Production build & obfuscation setup |
| 53 | 2026-09-17 | `task/e2e-hardening-polish` | `99808b5` | Dreamstime cross-page continuation & auto-heal exception, shortened stop button label to 'Stop', unboxed donate icon, restricted manifest matches | Multi-language resilience audit |
| 52 | 2026-09-17 | `task/e2e-hardening-polish` | `84794d9` | Polished support ticker animations, spinner rotation, font weights (12px 500), and 5 rotating donation variants with zero native emoji (11/11 tests passed) | Dreamstime continuation & UI polish |
| 51 | 2026-09-16 | `task/e2e-hardening-polish` | `fix(overlay)` | Hardened locked button contrast with .rj-btn-locked styling in HUD and popup, synchronized popup runner lock with active tab and persisted lastAutomationState across boolean updates, 4/4 and 7/7 tests passed | Sub-phase 5.7: Final End-to-End Live Verification & Documentation Sync |

| 50 | 2026-09-15 | `task/e2e-hardening-polish` | `791c639` | Implemented exclusive automation concurrency lock (Single Active Runner Policy) across HUD and toolbar popup, disabling start actions on non-runner tabs with Running on [Platform] status and lock SVG icons, 4/4 tests passed | Sub-phase 5.7: Final End-to-End Live Verification & Documentation Sync |
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
