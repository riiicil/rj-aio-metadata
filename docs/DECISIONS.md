# Architectural Decision Records (ADR) — RJ AIO Metadata Extension

## Index
- [ADR-001: Manifest V3 & Vanilla ES Modules Architecture](#adr-001-manifest-v3--vanilla-es-modules-architecture)
- [ADR-002: Dual UI Strategy (Toolbar Popup + Draggable In-Page Floating Overlay)](#adr-002-dual-ui-strategy-toolbar-popup--draggable-in-page-floating-overlay)
- [ADR-003: Unified Adapter Pattern for Microstock DOM Automation](#adr-003-unified-adapter-pattern-for-microstock-dom-automation)
- [ADR-004: Universal OpenAI-Compatible Vision API Protocol](#adr-004-universal-openai-compatible-vision-api-protocol)
- [ADR-005: Raycast Design System & Icon Policy](#adr-005-raycast-design-system--icon-policy)
- [ADR-006: Permanent Technical Reference Tracking in `docs/references/`](#adr-006-permanent-technical-reference-tracking-in-docsreferences)
- [ADR-007: Granular Multi-Commit Task Execution with Per-Commit Documentation Updates](#adr-007-granular-multi-commit-task-execution-with-per-commit-documentation-updates)

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
- **Context**: AI providers and Vision LLM endpoints evolve rapidly. Restricting the extension to 2 or 3 hardcoded providers limits contributor flexibility (e.g., contributors using OpenRouter, Mistral, Groq, local Ollama, DeepSeek, or custom proxy gateways).
- **Decision**: Implement a **Universal OpenAI-Compatible Vision Client**. The engine accepts any custom `baseUrl`, `apiKey`, and `modelId`, adhering to the standard multimodal `chat/completions` schema.
- **Consequences**:
  - **Positive**: 100% provider-agnostic. Supports Google Gemini (via OpenAI compatibility layer), Groq, OpenAI, Mistral, OpenRouter, and self-hosted models seamlessly.
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

