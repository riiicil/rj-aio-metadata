# Current Project State — RJ AIO Metadata Extension

*Last Updated: 2026-09-02*  
*Active Branch: `task/popup-storage`*  
*Current Milestone: Phase 1 (Manifest V3 Foundation, Storage Service & Popup Settings UI)*

---

## 1. Overall Project Status
Phase 1 execution is in progress. The foundation has been established with `StorageService.js` (supporting Gemini `gemini-2.5-flash-lite`, Mistral `mistral-small-latest`, OpenAI `gpt-5-nano`, OpenRouter `openai/gpt-5-nano`, and Custom endpoints), API key `.txt` file reader, keyword priority engine, and packaged icon assets in `src/icons/`.

---

## 2. Platform Support & Adapter Matrix
| Platform | DOM Mapping | Vision Extraction | Auto-Fill Strategy | Save/Draft Strategy | Implementation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Adobe Stock** | `READY` | `READY` | `READY` | `READY` | `ANALYSIS_COMPLETE` |
| **Shutterstock** | `READY` | `READY` | `READY` | `READY` | `ANALYSIS_COMPLETE` |
| **Dreamstime** | `READY` | `READY` | `READY` | `READY` | `ANALYSIS_COMPLETE` |
| **Vecteezy** | `READY` | `READY` | `READY` | `READY` | `ANALYSIS_COMPLETE` |
| **Freepik** | `READY` | `READY` | `READY` | `READY` | `ANALYSIS_COMPLETE` |
| **Depositphotos** | `READY` | `READY` | `READY` | `READY` | `ANALYSIS_COMPLETE` |
| **MiriCanvas** | `READY` | `READY` | `READY` | `READY` | `ANALYSIS_COMPLETE` |

---

## 3. Component Build Status
| Component | Directory / File | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Repository Governance**| `AGENTS.md`, `DESIGN.md`, `README.md` | `DONE` | Core governance & design system |
| **Documentation Suite** | `docs/*`, `docs/DOCS_STYLE.md` | `DONE` | Rigid format standards & templates |
| **Technical References** | `docs/references/` | `DONE` | 8 platform & API research analyses |
| **Manifest V3 Config** | `src/manifest.json` | `DONE` | MV3 configuration, permissions & icons |
| **Storage Engine** | `src/services/StorageService.js` | `DONE` | Full schema, file reader, keyword priority |
| **Background Worker** | `src/background/service_worker.js` | `IN_PROGRESS` | Dynamic model fetcher & tab router |
| **Popup UI** | `src/popup/` | `IN_PROGRESS` | Platform-adaptive settings UI |
| **Draggable Overlay HUD**| `src/overlay/` | `PENDING` | Scheduled for Phase 2 |
| **Universal Vision Engine**| `src/services/` | `PENDING` | Scheduled for Phase 3 |
| **Platform Adapters** | `src/adapters/` | `PENDING` | Scheduled for Phase 4 |

---

## 4. Immediate Blockers & Active Focus
- **Current Blocker**: None.
- **Active Focus**: Scope 2 — Background service worker dynamic model fetcher (`/v1/models`) and active tab routing.
