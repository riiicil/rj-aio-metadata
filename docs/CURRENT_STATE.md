# Current Project State — RJ AIO Metadata Extension

*Last Updated: 2026-09-05*<br>
*Active Branch: `task/draggable-overlay-ui`*<br>
*Current Milestone: Phase 2 (In-Page Draggable Floating Overlay HUD)*

---

## 1. Current Phase Progress

- **Phase 0 — Governance & Research**: [COMPLETE] (Repository governance, design system, reference analyses)
- **Phase 1 — Storage & Popup UI**: [COMPLETE] (Storage engine, background worker, modular platform-dynamic popup UI merged to dev)
- **Phase 2 — In-Page Draggable Overlay HUD**: [COMPLETE] (Shadow DOM HUD, draggable physics, adaptive quick form, live asset counter, bidirectional sync)
- **Phase 3 — Universal Vision Service**: [PLANNED] (OpenAI-compatible client & prompts)
- **Phase 4 — Platform Adapters**: [PLANNED] (DOM injectors for 7 platforms)
- **Phase 5 — End-to-End Testing & Polish**: [PLANNED] (E2E live verification & packaging)

---

## 2. Branches Matrix

| Branch | Status | Purpose |
| :--- | :--- | :--- |
| `main` | Clean (1 empty commit) | Stable production releases only |
| `dev` | Integration (Phase 0 & 1 merged) | Active development integration branch |
| `task/draggable-overlay-ui` | Active (Phase 2 complete) | Phase 2: In-Page Draggable Floating Overlay HUD |

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
  - `docs/agent-logs/2026-09-05.md` — Session Entries (newest on top).
  - `docs/references/` — 8 technical reference analyses for Adobe Stock, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, MiriCanvas, and Vision APIs.
- **Source Code (`src/`):**
  - `src/manifest.json` — Chromium Manifest V3 configuration, permissions, icons, action, service worker, web accessible resources (`overlay/*`, `styles/*`, `icons/*`, `services/*`).
  - `src/icons/` — Extension icons (`icon16.png`, `icon48.png`, `icon128.png`, `logo_rj.png` branding logo).
  - `src/services/StorageService.js` — Storage engine with multi-provider config, schema version 3 migration, multi-key round-robin, and keyword priority.
  - `src/background/service_worker.js` — Dynamic `/v1/models` fetcher with Gemini query auth, active tab evaluator, platform navigator, overlay relay.
  - `src/styles/variables.css` — Raycast Dark Precision design tokens with deep emerald teal (`#079183`) primary accent palette.
  - `src/styles/components.css` — Raycast Dark Precision form components, emerald teal accent interactive states, custom stepper control, floating custom select styles, transparent warning banner, smooth slide-down conditional field animations, and disabled states for buttons, inputs, steppers, and switches.
  - `src/popup/popup.html` — Platform-adaptive toolbar popup interface with brand logo image integration and modular dynamic platform settings container adhering to `DESIGN.md`.
  - `src/popup/popup.css` — 380px dark canvas popup styling with brand logo image styling and sticky header/footer.
  - `src/popup/popup.js` — Popup controller managing live tab matching, file importer, dynamic models, 100% modular platform-dynamic form rendering, bidirectional storage synchronization (`chrome.storage.onChanged`), model selection guard for Start Automation button, and full form disabling during active processing.
  - `src/popup/custom_select.js` — Zero-dependency progressive dropdown enhancer replacing native OS selects with emerald teal highlights.
  - `src/popup/depositphotos_countries.js` — Complete 237 ISO countries catalog extracted for Depositphotos editorial location settings (omitting commercial option).
  - `src/overlay/overlay.css` — Raycast Dark Precision styling for floating HUD inside Shadow DOM scope with zero host bleed, streamlined pill styling, spring transition animations (`cubic-bezier(0.16, 1, 0.3, 1)`), adaptive quick form components, live asset counter bar, and disabled control styles.
  - `src/overlay/overlay.js` — OverlayHUD controller managing Shadow DOM injection, viewport-clamped drag-and-drop physics, fluid minimize/expand animations, live asset card scanner across all 7 platforms, adaptive quick form controls (stepper, specific keywords, adaptive AI declaration), model selection guard for automation toggle, processing state field disabling, and bidirectional synchronization via `chrome.storage.onChanged`.
  - `src/content/content_main.js` — Content script router importing OverlayHUD via dynamic import, auto-mounting HUD, and handling background toggle messages.

---

## 5. What Does NOT Exist Yet

- `src/services/AIService.js` — Universal OpenAI-compatible multimodal vision client (Phase 3).
- `src/services/PromptTemplates.js` — High-converting platform-optimized prompt templates (Phase 3).
- `src/adapters/` — Platform DOM injector adapters (Adobe, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, MiriCanvas) (Phase 4).
- `src/services/TagSanitizer.js` — Platform-specific banned term and keyword sanitizer (Phase 4).

---

## 6. Testing & Build Verification Status

- Manifest V3 configuration validated against all declared file paths (`icons/`, `service_worker.js`, `popup.html`, `content_main.js`, `overlay/`, `styles/`, `services/`).
- Storage schema version 3 migration tested and verified in Node.js (obsolete keys purged, platform keyword limits clamped, legacy models handled).
- Syntax validation passed for `src/overlay/overlay.js`, `src/content/content_main.js`, `src/popup/popup.js`, and `src/services/StorageService.js` via `node --check`.
- Viewport boundary clamping and storage persistence logic verified.
- Depositphotos 237 country catalog and custom select progressive enhancement verified.
- Multi-API key round-robin distribution tested and verified across multi-line inputs.
- Google Gemini query param (`?key=`) and header (`x-goog-api-key`) authentication verified.
- Strict flexbox truncation (`min-width: 0; max-width: 100%;`) verified in popup UI.
- All documentation checked against Zero Native Emoji Policy and standardized under `docs/DOCS_STYLE.md`.

---

## 7. Immediate Next Step

User review and merge `task/draggable-overlay-ui` into `dev`, then proceed to Phase 3 (Universal Vision Service implementation).
