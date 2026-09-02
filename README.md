# RJ AIO Metadata Extension

> **All-In-One AI Metadata Generator & Auto-Submitter for Microstock Contributors**  
> Built for Chromium browsers (Google Chrome, Microsoft Edge, Brave) using Chrome Manifest V3.

---

## Key Features

- **Universal OpenAI-Compatible Vision Engine**: Connect any AI provider supporting OpenAI chat completions format (Google Gemini, Groq, Mistral, OpenAI, OpenRouter, Ollama, LocalAI).
- **Dual-Mode UI Architecture**:
  - **Toolbar Popup**: Configure API keys, custom base URLs, prompt templates, and active platform status.
  - **In-Page Draggable Overlay HUD**: Non-intrusive floating HUD with full batch controls, progress tracking, and metadata preview directly on the contributor dashboard.
- **Unified Microstock Adapters**:
  - **Adobe Stock**: Controlled inputs, 21 categories, AI generative declarations.
  - **Shutterstock**: Image vs Video categories, spelling warnings auto-approval, strict editorial captions.
  - **Dreamstime**: 15 Main / 182 Subcategories taxonomy tree, Mode A vs Mode B batch workflows.
  - **Vecteezy**: Automatic format categories, prohibited terms auto-sanitizer, AI 'Other' custom model input.
  - **Freepik**: Automated save-draft-per-asset batch looping, AI base models selection.
  - **Depositphotos**: 160 items/page batching, fast keyword paste, editorial country/city AJAX selection.
  - **MiriCanvas**: 1,000 items/page batch view, ContentType & ContentTier licensing.
- **Raycast Dark Precision Aesthetic**: Sleek dark UI with glassmorphism and Lucide/Phosphor SVG icons (zero native emoji in UI).

---

## Installation & Getting Started

1. Clone or download this repository:
   ```bash
   git clone https://github.com/riiici1/rj-aio-metadata.git
   ```
2. Open your Chromium browser (Chrome / Edge / Brave) and navigate to:
   ```
   chrome://extensions/
   ```
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** (*Muat yang belum dibongkar*).
5. Select the **`src/`** folder:
   ```
   C:\Users\admin\Desktop\git\RJ_AIO_Metadata\src
   ```
6. Click the RJ AIO Metadata icon in your browser toolbar to enter your API key and start automating!

---

## Project Documentation

- [`AGENTS.md`](./AGENTS.md) — Mandatory AI agent governance & instructions
- [`DESIGN.md`](./DESIGN.md) — Raycast Dark Precision Design System & Icon Policy
- [`docs/DOCS_STYLE.md`](./docs/DOCS_STYLE.md) — Documentation standards & boilerplate templates
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Technical architecture & Mermaid diagrams
- [`docs/CURRENT_STATE.md`](./docs/CURRENT_STATE.md) — Real-time build status & adapter matrix
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Architectural Decision Records (ADRs)
- [`docs/GIT_POLICY.md`](./docs/GIT_POLICY.md) — Branching & Conventional Commit rules
- [`docs/HANDOFF.md`](./docs/HANDOFF.md) — Developer onboarding & platform gotchas guide
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — Phase-by-phase execution milestones
- [`docs/references/`](./docs/references/) — Technical DOM reverse-engineering analysis files

---

## License

MIT License © 2026 Riiicil.
