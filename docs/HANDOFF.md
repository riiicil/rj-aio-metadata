# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential architectural context, platform gotchas, and instructions for incoming AI agents resuming work on this codebase.

---

## 1. Project Context & Current Phase

**RJ AIO Metadata** is a Manifest V3 browser extension built with native Vanilla JavaScript (ES Modules). It extracts uploaded thumbnails from microstock contributor dashboards, generates high-converting titles, descriptions, categories, tags, and AI declarations via **Universal OpenAI-Compatible Vision APIs**, and injects the metadata automatically into the host platform's DOM.

- **Current Milestone**: Phase 0 Complete (Governance, Architecture, Documentation Suite, and Scaffolding).
- **Next Milestone**: Phase 1 (Manifest V3 Scaffold, Storage Service & Popup Settings UI).

---

## 2. Platform Quirks & Implementation Gotchas

Every incoming agent must review the technical references in [`docs/references/`](file:///c:/Users/admin/Desktop/git/RJ_AIO_Metadata/docs/references) before touching any platform adapter. Key platform quirks:

### 1. Adobe Stock (`analysis_adobestock.md`)
- **React Spectrum Framework**: Uses controlled inputs wrapped in ShadowDOM / Spectrum components. Modifying input values requires dispatching via `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, val)`.
- **Category Matrix**: Fixed 21 categories. Must dispatch custom `change` events on dropdown triggers.

### 2. Shutterstock (`analysis_shutterstock.md`)
- **Material-UI Structure**: Uses explicit `data-testid` attributes.
- **Category Difference**: Video (19 categories) vs Image (26 categories) are strictly distinct.
- **Spelling Warnings**: When tag chips trigger spelling warnings, auto-approve them via `button[data-testid="mark-all-correct-button"]`.
- **Editorial Caption Rule**: Must follow strict journalistic format: `CITY, COUNTRY - MONTH DAY YEAR: Detailed description...`.

### 3. Dreamstime (`analysis_dreamstime.md`)
- **Hierarchical Categories**: 15 Main Categories and 182 Subcategories. Main category dropdown must trigger `change` to load subcategory options.
- **Dual Workflow Modes**: Mode A (Save Draft with `firstAssetId` loop prevention) vs Mode B (Immediate Submit).
- **Toast Notifications**: Confirm success via `div.noty_bar.noty_type__dt-success`.

### 4. Vecteezy (`analysis_vecteezy.md`)
- **Category is Automatic**: Category dropdown is automatically locked by Vecteezy based on file extension (`.eps` $\to$ Vectors, `.png` $\to$ PNG, `.jpg` $\to$ Photos, `.mp4` $\to$ Videos). Do NOT override.
- **Prohibited Terms Filter**: Banned words (`vector`, `photo`, `video`, `isolated`, `image`) trigger a modal (`div[data-testid="prohibited-terms-modal"]`). Must be sanitized prior to injection.
- **AI "Other" Input**: Selecting "Other" in AI tool menu reveals `input#undefined-input` for custom generator names.

### 5. Freepik (`analysis_freepik.md`)
- **MANDATORY SAVE DRAFT PER ASSET**: Sidebar metadata is transient. You **MUST execute `saveDraft()` (`button.button-paste-draft`)** before moving to the next asset in the batch, otherwise unsaved input is discarded.
- **No Category Dropdown**: Categorization is 100% automated from file format + semantic tags.

### 6. Depositphotos (`analysis_depositphotos.md`)
- **High Capacity**: Paginator (`select._paginator__list`) can be set to **160 items per page**.
- **Editorial Country/City**: Selecting Country (`select._itemeditor__value_location_country_code`) dynamically loads cities via AJAX. City is optional; Country alone is valid.
- **Raw Tag Paste**: `span.paste_editor__tag` opens a raw text paste box for fast batch keyword injection.

### 7. MiriCanvas (`analysis_miricanvas.md`)
- **Massive Batching**: Capacity selector (`div.panda-fehQR`) supports up to **1,000 elements at a time**.
- **ContentType & Tier Radios**: Must set `contentType` (`BITMAP`, `PICTURE`, `REMOVE_BACKGROUND_PICTURE`, `BACKGROUND_PICTURE`, `VECTOR`, `GIF`) and `contentTier` (`STANDARD` vs `PREMIUM`).

---

## 3. How to Run & Verify Locally

1. Open Google Chrome or Microsoft Edge.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** (*Muat yang belum dibongkar*).
5. Select the folder: `C:\Users\admin\Desktop\git\RJ_AIO_Metadata\src`.
6. Navigate to any supported contributor dashboard to verify the extension activation.

---

## 4. Key Architectural Policies

1. **No Native Emoji in UI**: Enforce [DESIGN.md](file:///c:/Users/admin/Desktop/git/RJ_AIO_Metadata/DESIGN.md) Icon Policy — use only Phosphor/Lucide SVG icons.
2. **Universal Vision Engine**: Never restrict to hardcoded vendors. Support custom `baseUrl`, `apiKey`, and `modelId`.
3. **Per-Commit Documentation**: Always update `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, and `docs/agent-logs/YYYY-MM-DD.md` in every commit.
