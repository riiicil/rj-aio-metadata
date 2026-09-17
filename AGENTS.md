# AGENTS.md — RJ AIO Metadata Extension

> **Mandatory first-read for every AI agent working on this project.**  
> Read this file completely before taking any action or writing code.

---

## 1. Project Identity

**RJ AIO Metadata** is a modern Chromium browser extension (Manifest V3) that automates AI-powered metadata generation (Titles, Descriptions, Categories, Tag Chips, Licensing, AI Declarations) across top microstock and design contributor platforms using **Universal OpenAI-Compatible Vision APIs**.

- **Runtime Target**: Manifest V3 (Chrome, Edge, Brave, Chromium)
- **Source Root**: `src/` (Loaded via `chrome://extensions` -> *Load unpacked*)
- **UI Architecture**: Dual-Mode (Toolbar Popup + In-Page Draggable Floating Overlay)
- **Design System**: Raycast Dark Precision (Pure dark canvas, no native emoji, Lucide/Phosphor SVG icons)
- **Supported Platforms**: Adobe Stock, Shutterstock, Dreamstime, Vecteezy, Freepik, Depositphotos, MiriCanvas.

---

## 2. Required Reading Order

Before doing any work, read these files **strictly in this order**:

1. `AGENTS.md` (this file)
2. `docs/DOCS_STYLE.md` *(Enforces uniform document structure & templates)*
3. `docs/ARCHITECTURE.md` *(MV3 lifecycle, component map, data flow diagrams)*
4. `docs/GIT_POLICY.md` *(Branching model, commit formats, PR rules)*
5. `docs/CURRENT_STATE.md` *(Active tasks, progress status, build state)*
6. `docs/HANDOFF.md` *(Session handoff notes, platform quirks & gotchas)*
7. `docs/ROADMAP.md` *(Phase milestones and execution roadmap)*
8. `docs/references/` *(Technical DOM analyses for each platform)*

---

## 3. Core Technical Standards

### A. Universal OpenAI-Compatible Vision API Protocol
The extension is **provider-agnostic**. It supports any AI provider adhering to the standard OpenAI chat completions format with multimodal image support across 5 native presets (Google Gemini, Mistral AI, OpenAI, OpenRouter, and Custom Endpoints):
- Custom base URLs (e.g. `https://generativelanguage.googleapis.com/v1beta/openai/`, `https://api.mistral.ai/v1`, `https://api.openai.com/v1`, `https://openrouter.ai/api/v1`, or user-supplied custom OpenAI-compatible proxy gateways).
- Direct browser-to-API communication or routed through `background/service_worker.js` to bypass CORS.


### B. Icon Policy
- **Native Emoji are STRICTLY FORBIDDEN in the UI**. Do not use native emoji characters (e.g., 🔴, ⏹️, 📁, 🚀, 💡, etc.) in buttons, labels, or modals.
- **Use SVG Icon Systems**: Use Lucide Icons or Phosphor Icons via packaged SVG components with consistent 16px/20px sizing.

### C. Design System Compliance
- All UI components must strictly follow [DESIGN.md](file:///c:/Users/admin/Desktop/git/RJ_AIO_Metadata/DESIGN.md) (Dark canvas `#07080a`, elevated surface `#0d0d0d`, hairline `#242728`, accent cyan `#57c1ff`, success `#59d499`).

---

## 4. Branch & Git Rules

- **Branch Hierarchy**: `main` (stable releases only) $\leftarrow$ `dev` (integration) $\leftarrow$ `task/*` (feature branches).
- **Branch Naming**: `task/<kebab-case-description>` (e.g., `task/governance-docs`, `task/storage-service`). No phase number prefixes.
- **Never commit directly to `main` or `dev`**.
- **Conventional Commits**: `<type>(<scope>): <description>` (e.g., `feat(overlay): add draggable header handler`).
- **Merge Strategy**: Always use `git merge --no-ff`.
- **Do not push to remote** or merge into `dev`/`main` without explicit user instruction.

---

## 5. Hard Safety Rules

- **Never commit**: `.env`, `*.log`, `bahan/`, `dev-tools/`, `scratch/`, `node_modules/`, `*.key`, `*.pem`.
- Keep all temporary scratch scripts, recorded session dumps, and ad-hoc tests inside `scratch/` or `dev-tools/`.

---

## 6. Documentation Workflow

For every task/commit:
1. Complete the implementation scope in `src/`.
2. Update `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, and `docs/agent-logs/YYYY-MM-DD.md` following the exact templates defined in `docs/DOCS_STYLE.md`.
3. Include doc updates in the same commit as the code changes.
