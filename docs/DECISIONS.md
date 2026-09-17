# Architectural Decision Records (ADR) — RJ AIO Metadata Extension

## Index
- [ADR-001: Manifest V3 & Vanilla ES Modules Architecture](#adr-001-manifest-v3--vanilla-es-modules-architecture)
- [ADR-002: Dual UI Strategy (Toolbar Popup + Draggable In-Page Floating Overlay)](#adr-002-dual-ui-strategy-toolbar-popup--draggable-in-page-floating-overlay)
- [ADR-003: Unified Adapter Pattern for Microstock DOM Automation](#adr-003-unified-adapter-pattern-for-microstock-dom-automation)
- [ADR-004: Universal OpenAI-Compatible Vision API Protocol](#adr-004-universal-openai-compatible-vision-api-protocol)
- [ADR-005: Raycast Design System & Icon Policy](#adr-005-raycast-design-system--icon-policy)
- [ADR-006: Permanent Technical Reference Tracking in `docs/references/`](#adr-006-permanent-technical-reference-tracking-in-docsreferences)
- [ADR-007: Granular Multi-Commit Task Execution with Per-Commit Documentation Updates](#adr-007-granular-multi-commit-task-execution-with-per-commit-documentation-updates)
- [ADR-008: Shadow DOM Encapsulation for In-Page Floating HUD](#adr-008-shadow-dom-encapsulation-for-in-page-floating-hud)
- [ADR-009: Real-Time Reactive Auto-Save & Bidirectional Storage Synchronization](#adr-009-real-time-reactive-auto-save--bidirectional-storage-synchronization)
- [ADR-010: Decoupled Batch Automation Orchestrator & Modular Dynamic Form Generators](#adr-010-decoupled-batch-automation-orchestrator--modular-dynamic-form-generators)
- [ADR-011: Exclusive Single-Runner Automation Concurrency Lock & Multi-Tab Isolation](#adr-011-exclusive-single-runner-automation-concurrency-lock--multi-tab-isolation)
- [ADR-012: Zero-Text Dependency & Structural Selectors for 100% Multi-Language Resilience](#adr-012-zero-text-dependency--structural-selectors-for-100-multi-language-resilience)
- [ADR-013: Bundle-First Production Obfuscation Pipeline & Release Packaging (`LOAD THIS FOLDER/`)](#adr-013-bundle-first-production-obfuscation-pipeline--release-packaging-load-this-folder)


---

## ADR-001: Manifest V3 & Vanilla ES Modules Architecture
- **Status**: `ACCEPTED`
- **Date**: 2026-09-02
- **Context**: Chromium extensions must comply with Manifest V3 standards. Heavy bundlers (Webpack/Vite) introduce complex build pipelines, sourcemap issues during in-page debugging, and slower iteration cycles.
- **Decision**: Build the extension using native Chrome Manifest V3 and pure Vanilla JavaScript (ES6 Modules) located in `src/`.
- **Consequences**:
  - **Positive**: Direct "Load unpacked" capability from `src/` without build steps, zero bundle bloat, maximum execution speed, easy debugging.
  - **Negative**: Requires standard ES module imports and direct browser APIs.

---

## ADR-002: Dual UI Strategy (Toolbar Popup + Draggable In-Page Floating Overlay)
- **Status**: `ACCEPTED`
- **Date**: 2026-09-02
- **Context**: Standard Chrome extension popups close immediately whenever the user clicks outside (e.g. clicking on the microstock web page). This makes multi-step batch review and editing inconvenient.
- **Decision**: Implement a **Dual-Mode UI**:
  1. *Toolbar Popup*: For global configuration, API keys, provider selection, and prompt templates.
  2. *In-Page Draggable Overlay HUD*: Injected directly into contributor tabs. It can be dragged anywhere, minimized to avoid blocking platform buttons (such as Save/Submit), and provides rich batch controls directly on page.
- **Consequences**:
  - **Positive**: High productivity for contributors, persistent workflow across clicks, draggable HUD avoids obstructing platform UI.
  - **Negative**: Requires isolated CSS styling to prevent style pollution from host web pages.

---

## ADR-003: Unified Adapter Pattern for Microstock DOM Automation
- **Status**: `ACCEPTED`
- **Date**: 2026-09-02
- **Context**: Different microstock platforms employ widely disparate frontend frameworks (React Spectrum for Adobe Stock, Material-UI for Shutterstock/Vecteezy, jQuery/Server-rendered for Dreamstime/Depositphotos, Vue/Panda-CSS for Freepik/MiriCanvas).
- **Decision**: Create an abstract `BaseAdapter` defining uniform methods (`getAssetCards()`, `getThumbnailUrl()`, `selectCard()`, `fillMetadata()`, `saveDraft()`, `submitForReview()`). Each platform implements its own adapter class registered in a central registry.
- **Consequences**:
  - **Positive**: Decoupled, modular architecture. Adding or updating a platform requires modifying only its dedicated adapter file without touching the core UI or AI engine.
  - **Negative**: Requires maintaining accurate DOM selector maps per platform.

---

## ADR-004: Universal OpenAI-Compatible Vision API Protocol
- **Status**: `ACCEPTED`
- **Date**: 2026-09-02
- **Context**: AI providers and Vision LLM endpoints evolve rapidly. Restricting the extension to 2 or 3 hardcoded providers limits contributor flexibility (e.g., contributors using Google Gemini, Mistral, OpenAI, OpenRouter, or custom proxy gateways).
- **Decision**: Implement a **Universal OpenAI-Compatible Vision Client**. The engine provides 5 native presets (Google Gemini, Mistral AI, OpenAI, OpenRouter, and Custom Endpoints) and accepts any custom `baseUrl`, `apiKey`, and `modelId`, adhering to the standard multimodal `chat/completions` schema.
- **Consequences**:
  - **Positive**: 100% provider-agnostic. Supports Google Gemini (via OpenAI compatibility layer), Mistral AI, OpenAI, OpenRouter, and any user-configured Custom Endpoint seamlessly.
  - **Negative**: Requires the provider endpoint to support standard multimodal base64 image payloads.


---

## ADR-005: Raycast Design System & Icon Policy
- **Status**: `ACCEPTED`
- **Date**: 2026-09-02
- **Context**: Generic UI frameworks (like Bootstrap) look generic and bloated. Inconsistent emoji usage in UI buttons looks unprofessional and renders unpredictably across OS versions.
- **Decision**: Adopt the **Raycast Dark Precision Design System** (`DESIGN.md`). Enforce a strict **Icon Policy**: **Native emoji are strictly forbidden in UI elements**; all UI icons must use standardized Lucide / Phosphor SVG components.
- **Consequences**:
  - **Positive**: Highly aesthetic, modern dark mode look, consistent rendering across all platforms.
  - **Negative**: Requires explicit SVG icon management.

---

## ADR-006: Permanent Technical Reference Tracking in `docs/references/`
- **Status**: `ACCEPTED`
- **Date**: 2026-09-02
- **Context**: Deep technical reverse-engineering of all 7 microstock platforms was conducted and analyzed. Storing this research only in ignored folders risks losing critical architectural knowledge for future AI agents.
- **Decision**: Maintain all 8 technical analysis files permanently in `docs/references/` inside the git repository.
- **Consequences**:
  - **Positive**: Permanent institutional knowledge, rapid onboarding for incoming agents, clear traceability of DOM selectors.
  - **Negative**: Minor increase in documentation volume.

---

## ADR-007: Granular Multi-Commit Task Execution with Per-Commit Documentation Updates
- **Status**: `ACCEPTED`
- **Date**: 2026-09-02
- **Context**: Bundling an entire phase or large task into a single massive commit obscures the development history, complicates code review, and makes regressions harder to bisect.
- **Decision**: Break each feature branch into well-defined logical scopes/commits. For every scope: complete the code implementation $\to$ update documentation (`docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, `docs/agent-logs/YYYY-MM-DD.md`) $\to$ create the commit $\to$ proceed to the next scope.
- **Consequences**:
  - **Positive**: Clean, granular git history, documentation stays synchronized with every step, atomic commits.
  - **Negative**: Requires discipline in updating docs per commit.

---

## ADR-008: Shadow DOM Encapsulation for In-Page Floating HUD
- **Status**: `ACCEPTED`
- **Date**: 2026-09-05
- **Context**: Injecting custom UI overlays directly into microstock dashboards causes severe CSS style bleed: platform styles (e.g., Bootstrap, Tailwind, React Spectrum, Material-UI) override extension button and input styles, while extension styles inadvertently break contributor portal layouts.
- **Decision**: Mount the In-Page Overlay HUD inside an open-mode Shadow DOM root (`#rj-overlay-host`). Link scoped `overlay.css` directly inside the shadow root via `<link>` or `<style>`.
- **Consequences**:
  - **Positive**: 100% immune from host page styling interference, zero CSS leakage to the host dashboard, consistent Raycast Dark Precision aesthetic everywhere.
  - **Negative**: Sub-elements are isolated from document-level query selectors, requiring explicit references within the shadow root.

---

## ADR-009: Real-Time Reactive Auto-Save & Bidirectional Storage Synchronization
- **Status**: `ACCEPTED`
- **Date**: 2026-09-13
- **Context**: Requiring users to click a manual "Save Settings" button after configuring API keys, custom base URLs, or keyword quotas causes frequent data loss when users accidentally close the popup or switch tabs.
- **Decision**: Implement a centralized real-time auto-save engine in `popup.js`:
  1. Debounce text inputs (300ms) to eliminate redundant storage writes.
  2. Immediately persist switches, steppers, and dropdown selections on `change`.
  3. Listen to `chrome.storage.onChanged` for bidirectional synchronization between Toolbar Popup and In-Page Overlay HUD with anti-loop flags (`isSyncingFromStorage`, `isSavingLocally`).
  4. Repurpose the obsolete "Save Settings" button into a dynamic live progress and support ticker (`#btnSupportProgress`).
- **Consequences**:
  - **Positive**: Effortless user experience, zero unsaved settings loss, immediate synchronization between popup and in-page HUD.
  - **Negative**: Requires careful loop prevention flags to avoid infinite storage change ping-pongs.

---

## ADR-010: Decoupled Batch Automation Orchestrator & Modular Dynamic Form Generators
- **Status**: `ACCEPTED`
- **Date**: 2026-09-13
- **Context**: `overlay.js` and `popup.js` grew excessively large (over 2,000 lines each), mixing UI presentation, drag-and-drop physics, dynamic HTML templating, and complex batch automation loops into monolithic files.
- **Decision**: Perform architectural modularization:
  1. Extract the batch execution loop, asset iteration, carousel mechanics, cooldown pacing, and graceful stop coordination into a dedicated ES module: `src/overlay/AutomationOrchestrator.js`.
  2. Extract platform dynamic HTML form generators and keyword limits dictionary into `src/popup/platform_forms.js`.
- **Consequences**:
  - **Positive**: High maintainability, single-responsibility separation, `overlay.js` reduced by 572 lines, `popup.js` reduced by 257 lines, easy unit testing of orchestrator loops with mock adapters.
  - **Negative**: Requires explicit delegation hooks between controller and orchestrator.

---

## ADR-011: Exclusive Single-Runner Automation Concurrency Lock & Multi-Tab Isolation
- **Status**: `ACCEPTED`
- **Date**: 2026-09-15
- **Context**: When contributors open multiple microstock tabs simultaneously (e.g. Adobe Stock and Dreamstime in separate tabs), starting automation on one tab previously broadcasted global storage events that woke up other tabs, causing race conditions, API rate-limit exhaustion, and browser lockups.
- **Decision**: Enforce an **Exclusive Single-Runner Policy**:
  1. Track `activeAutomationTabId` and partition `rj_automation_state` with `platformId` and `tabId`.
  2. When Platform A is running, all other platform HUDs and the toolbar popup dynamically lock their Start buttons with `.rj-btn-locked`, lock SVG icon, `Running on [Platform]` badge, and informative hover tooltip.
  3. Auto-heal: Background service worker automatically resets state to idle if the active runner tab is closed or navigated away.
- **Consequences**:
  - **Positive**: 100% prevention of multi-tab automation collisions, protected API quotas, clear contributor feedback across tabs.
  - **Negative**: Contributors cannot run two microstocks concurrently in the same browser profile (by design to safeguard API rate limits).

---

## ADR-012: Zero-Text Dependency & Structural Selectors for 100% Multi-Language Resilience
- **Status**: `ACCEPTED`
- **Date**: 2026-09-16
- **Context**: Microstock contributors use dashboards in varied languages (English, Indonesian, Korean, Japanese, German, French, Spanish). Selectors that match English button text (e.g. "Save", "Select all", "No", "Mark all as correct") fail completely on localized portals.
- **Decision**: Eliminate all language-dependent text string queries across platform adapters. Rely strictly on:
  1. Structural attributes: `data-testid`, `data-t`, `data-f`, `name`, `value`, `type`.
  2. DOM hierarchy and positional selectors: `:nth-of-type(1)`, `input[type="radio"][1]`.
  3. SVG path signatures: e.g. MiriCanvas diskette icon `path[d^="M7 19v-6h10v6"]`.
- **Consequences**:
  - **Positive**: Guaranteed 100% resilience across all interface languages without maintaining fragile localized translation dictionaries.
  - **Negative**: Requires reverse-engineering structural attributes and DOM hierarchy per platform.

---

## ADR-013: Bundle-First Production Obfuscation Pipeline & Release Packaging (`LOAD THIS FOLDER/`)
- **Status**: `ACCEPTED`
- **Date**: 2026-09-17
- **Context**: Preparing the extension for public release on Ko-fi, Lynk.id, and GitHub Releases requires code obfuscation to protect intellectual property while preserving open-source transparency in the repository. Naive file-by-file obfuscation on modern ES Modules breaks inter-module import/export bindings. Furthermore, end-users frequently struggle with which folder to select in `chrome://extensions`.
- **Decision**:
  1. Adopt a **Bundle-First Architecture**: Use `esbuild` to bundle all internal ESM modules into self-contained files across the 4 MV3 entry points (`service_worker.js`, `popup.js`, `overlay.js`, `content_main.js`) before running `javascript-obfuscator`.
  2. Configure obfuscator with `disableConsoleOutput: false` (developer logs stay intact in DevTools) and `stringArrayEncoding: ['base64']`.
  3. Package the obfuscated extension into an explicit subfolder: `dist/LOAD THIS FOLDER/` along with root metadata (`README.md`, `LICENSE`, `CHANGELOG.md`, `SUPPORT ME.url`, `SC.url`) and zip to `releases/v[version].zip`.
  4. Keep build tooling (`build.js`, `package.json`, `obfuscator.config.js`, `dist/`, `releases/`) gitignored to keep the source repo pure.
- **Consequences**:
  - **Positive**: Zero ESM import breakage, robust AST obfuscation, crystal-clear end-user installation folder name (`LOAD THIS FOLDER`), clean git status.
  - **Negative**: Requires running `node build.js` to refresh release packages.


