# Current Project State — RJ AIO Metadata Extension

*Last Updated: 2026-09-07*<br>
*Active Branch: `task/platform-adapters`*<br>
*Current Milestone: Phase 4: Platform Adapters (Sub-phase 4.1 Complete)*

---

## 1. Current Phase Progress

- **Phase 0 — Governance & Research**: [COMPLETE] (Repository governance, design system, reference analyses)
- **Phase 1 — Storage & Popup UI**: [COMPLETE] (Storage engine, background worker, modular platform-dynamic popup UI merged to dev)
- **Phase 2 — In-Page Draggable Overlay HUD**: [COMPLETE] (Shadow DOM HUD, draggable physics, adaptive quick form, live asset counter, multi-platform media detection, popup toggle, bidirectional sync merged to dev)
- **Phase 3 — Universal Vision Service**: [COMPLETE] (Step 3.1 Prompt Engine, Step 3.2 Sanitizer Engine, Step 3.3 Universal Vision Client & Background Proxy Worker complete, merged to dev)
- **Phase 4 — Platform Adapters**: [IN_PROGRESS] (Sub-phase 4.1 Complete: Vecteezy & Freepik popup AI model taxonomies aligned, Schema v4 migrated; Sub-phase 4.2 Core Adapter Foundation next)
- **Phase 5 — End-to-End Testing & Polish**: [PLANNED] (E2E live verification & packaging)

---

## 2. Branches Matrix

| Branch | Status | Purpose |
| :--- | :--- | :--- |
| `main` | Clean (1 empty commit) | Stable production releases only |
| `dev` | Integration (Phase 0, 1, 2, 3 merged) | Active development integration branch |
| `task/platform-adapters` | Active (Sub-phase 4.1 Complete) | Phase 4: Platform Adapters & Automation Engine |

---

## 3. Platform Support & Adapter Matrix

| Platform | DOM Mapping | Vision Extraction | Auto-Fill Strategy | Save/Draft Strategy | Implementation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Adobe Stock** | READY | READY | READY | READY | [ANALYSIS_COMPLETE] |
| **Shutterstock** | READY | READY | READY | READY | [ANALYSIS_COMPLETE] |
| **Dreamstime** | READY | READY | READY | READY | [ANALYSIS_COMPLETE] |
| **Vecteezy** | READY | READY | READY | READY | [ANALYSIS_COMPLETE] |
| **Freepik** | READY | READY | READY | READY | [ANALYSIS_COMPLETE] |
| **Depositphotos** | READY | READY | READY | READY | [ANALYSIS_COMPLETE] |
| **MiriCanvas** | READY | READY | READY | READY | [ANALYSIS_COMPLETE] |

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
  - `src/services/AiPrompt.js` — Platform-adaptive prompt engine, official category dictionaries (Adobe Stock 21 IDs, Shutterstock 26 Image / 19 Video, Dreamstime 15 Main & subcategories), dynamic JSON schemas with safety bounds (Adobe/Vecteezy title <=185, Freepik/MiriCanvas title <=90, descriptions <=230), Vecteezy schema strictly restricted to title and keywords without description, flat 80-keyword generator, and multimodal OpenAI payload builder with model-safe parameter guards.
  - `src/services/SanitizerService.js` — Comprehensive microstock sanitizer engine with robust JSON extractor/repairer, keyword validation pipeline (word count <=2, punctuation stripping, Vecteezy/general prohibited terms, custom keyword index-0 priority, case-insensitive deduplication, platform quota clamping), title and description smart boundary clamping (sentence boundary, word boundary without mid-word cuts, trailing period), Shutterstock editorial prefix normalization, and unified metadata facade.
  - `src/services/AiService.js` — Universal OpenAI-compatible multimodal vision client, image base64 converter (Data URL, raw base64, HTTP/Blob), end-to-end generateMetadata pipeline facade, and injectable dispatcher.
  - `src/services/StorageService.js` — Storage engine with multi-provider config, schema version 4 migration, official Freepik 47 base models catalog, Vecteezy software generator options, multi-key round-robin, keyword priority, and loadConfig alias with non-extension environment fallback.
  - `src/background/service_worker.js` — ES module background worker with dynamic `/v1/models` fetcher, active tab evaluator, platform navigator, overlay relay, and `GENERATE_VISION_METADATA` proxy router with multi-key round-robin rotation, provider authentication mapping (Gemini, OpenRouter, OpenAI, Mistral, Custom), and exponential backoff retry handler (429/5xx).
  - `src/styles/variables.css` — Raycast Dark Precision design tokens with deep emerald teal (`#079183`) primary accent palette.
  - `src/styles/components.css` — Raycast Dark Precision form components, emerald teal accent interactive states, custom stepper control, floating custom select styles, transparent warning banner, active HUD button outline style (`.rj-btn-active`), top-right stacked toast notification system (`.rj-toast-container`, `.rj-toast-item`, `.rj-toast-text`, `.rj-toast-close`), and disabled states for buttons, inputs, steppers, and switches.
  - `src/popup/popup.html` — Platform-adaptive toolbar popup interface with brand logo image integration, modular dynamic platform settings container, and top-right stacked toast container adhering to `DESIGN.md`.
  - `src/popup/popup.css` — 380px dark canvas popup styling with brand logo image styling and sticky header/footer.
  - `src/popup/popup.js` — Popup controller managing live tab matching, file importer, dynamic models, 100% modular platform-dynamic form rendering with official Vecteezy software dropdown & conditional custom software input, verified 47 Freepik official base models catalog, bidirectional storage synchronization (`chrome.storage.onChanged`), model selection guard for Start Automation button, full form disabling during active processing, interactive in-place HUD toggle button with active outline state, and 3-item FIFO stacked toast notification queue with 2-line clamping, auto-dismiss (4500ms), and manual close button.
  - `src/popup/custom_select.js` — Zero-dependency progressive dropdown enhancer replacing native OS selects with emerald teal highlights.
  - `src/popup/depositphotos_countries.js` — Complete 237 ISO countries catalog extracted for Depositphotos editorial location settings (omitting commercial option).
  - `src/overlay/overlay.css` — Raycast Dark Precision styling for floating HUD inside Shadow DOM scope with zero host bleed, streamlined pill styling with SVG status icons (`.rj-status-icon-ready`, `.rj-status-icon-layers`, `.rj-status-icon-not-ready`), warning banner styles, spring transition animations (`cubic-bezier(0.16, 1, 0.3, 1)`), adaptive quick form components, live asset counter bar, and disabled control styles.
  - `src/overlay/overlay.js` — OverlayHUD controller managing Shadow DOM injection, viewport-clamped drag-and-drop physics, fluid minimize/expand animations, live asset scanner with specific Depositphotos and Shutterstock subtab media detection (`32 Images Detected`, `3 Videos Detected`), Dreamstime single-asset ID detection (`In ID 473814624`), pill Layers icon on detected assets, checkmark on empty ready tab, non-microstock warning state and labels (`Unknown Page`, `Assets Not Detected`), adaptive quick form controls (stepper, specific keywords, adaptive AI declaration), model selection guard for automation toggle, processing state field disabling, and bidirectional synchronization via `chrome.storage.onChanged`.
  - `src/content/content_main.js` — Content script router importing OverlayHUD via dynamic import, auto-mounting HUD, and handling background toggle, ping, and status messages.

---

## 5. What Does NOT Exist Yet

- `src/adapters/` — Platform DOM injector adapters (Adobe, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, MiriCanvas) (Phase 4).

---

## 6. Testing & Build Verification Status

- Manifest V3 configuration validated against all declared file paths (`icons/`, `service_worker.js`, `popup.html`, `content_main.js`, `overlay/`, `styles/`, `services/`).
- `src/services/AiPrompt.js` syntax verified with `node --check` and tested with `scratch/test_ai_prompt.mjs` (65/65 assertions passed).
- `src/services/SanitizerService.js` syntax verified with `node --check` and tested with `scratch/test_sanitizer_service.mjs` (86/86 assertions passed).
- `src/services/AiService.js` and `src/background/service_worker.js` syntax verified with `node --check` and tested with `scratch/test_ai_service.mjs` (76/76 assertions passed).
- Storage schema version 4 migration and default configuration tested and verified with `scratch/test_storage_v4.mjs` (38/38 assertions passed).
- Entire Phase 3 and Phase 4.1 test suites verified passing 265/265 assertions across `test_ai_prompt.mjs`, `test_sanitizer_service.mjs`, `test_ai_service.mjs`, and `test_storage_v4.mjs`.
- Syntax validation passed for `src/overlay/overlay.js`, `src/content/content_main.js`, `src/popup/popup.js`, and `src/services/StorageService.js` via `node --check`.
- Viewport boundary clamping and storage persistence logic verified.
- Depositphotos 237 country catalog and custom select progressive enhancement verified.
- Multi-API key round-robin distribution tested and verified across multi-line inputs.
- Google Gemini query param (`?key=`) and header (`x-goog-api-key`) authentication verified.
- Strict flexbox truncation (`min-width: 0; max-width: 100%;`) verified in popup UI.
- All documentation checked against Zero Native Emoji Policy and standardized under `docs/DOCS_STYLE.md`.

---

## 7. Immediate Next Step

Implement Sub-phase 4.2: Core Adapter Foundation (`src/adapters/dom_helpers.js` and `src/adapters/BaseAdapter.js`).
