# DOCS_STYLE.md — Documentation Standards & Templates
**Standardization Guide for All Project Documentation in `docs/`**

> **Purpose**: This document establishes rigid structure templates and formatting rules for all documentation across the **RJ AIO Metadata** repository. Every AI agent and human contributor must follow these exact templates to ensure uniform consistency across sessions.

---

## 1. General Formatting Rules

1. **Language**: All formal documentation in `docs/` must be written in **English**.
2. **Alert Blocks**: Use GitHub markdown alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) for emphasis. Never nest alerts.
3. **Mermaid Diagrams**: Use valid Mermaid code blocks (`mermaid`) with quoted node labels when special characters are used.
4. **File Links**: Always use markdown link syntax with file basenames or relative repo paths (e.g., [`AGENTS.md`](file:///c:/Users/admin/Desktop/git/RJ_AIO_Metadata/AGENTS.md) or [`src/manifest.json`](file:///c:/Users/admin/Desktop/git/RJ_AIO_Metadata/src/manifest.json)).
5. **No Native Emoji in Code/UI**: Emojis are permitted only as visual section bullet accents in markdown docs, but strictly prohibited in UI code.

---

## 2. Standard Template: `docs/agent-logs/YYYY-MM-DD.md`

Every session log MUST follow this exact format:

```markdown
# Agent Session Log — YYYY-MM-DD

## Session Overview
- **Date**: YYYY-MM-DD
- **Active Branch**: `task/<branch-name>`
- **Session Goal**: <One-sentence summary of the main objective>
- **Status**: `COMPLETED` | `IN_PROGRESS` | `BLOCKED`

---

## Work Accomplished
1. **<Milestone/Feature 1 Name>**:
   - <Detailed bullet describing what was done>
   - <Key technical implementation details>
2. **<Milestone/Feature 2 Name>**:
   - <Detailed bullet describing what was done>

---

## Files Created / Modified
| File Path | Action | Description |
| :--- | :---: | :--- |
| `path/to/file1.ext` | `NEW` | <Brief explanation of changes> |
| `path/to/file2.ext` | `MODIFY` | <Brief explanation of changes> |
| `path/to/file3.ext` | `DELETE` | <Brief explanation of changes> |

---

## Architectural & Technical Decisions
- **<Decision Title>**: <Short description of decision and rationale>

---

## Verification & Testing
- [x] <Command/Test 1 executed and result>
- [x] <Manual verification item 2>

---

## Next Steps / Immediate Priorities
1. <Next action item for subsequent session>
2. <Pending task>
```

---

## 3. Standard Template: `docs/CURRENT_STATE.md`

`CURRENT_STATE.md` serves as the real-time project dashboard and must contain:

```markdown
# Current Project State — RJ AIO Metadata Extension

*Last Updated: YYYY-MM-DD*  
*Active Branch: `task/<branch-name>`*  
*Current Milestone: Phase X (<Phase Name>)*

---

## 1. Overall Project Status
<1-2 paragraphs summarizing the current build status and operational state>

---

## 2. Platform Support & Adapter Matrix
| Platform | DOM Mapping | Extraction (Vision) | Auto-Fill | Auto-Save / Draft | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Adobe Stock** | `READY` | `READY` | `READY` | `READY` | `COMPLETED` |
| **Shutterstock** | `READY` | `READY` | `READY` | `READY` | `COMPLETED` |
| **Dreamstime** | `READY` | `READY` | `READY` | `READY` | `COMPLETED` |
| **Vecteezy** | `READY` | `READY` | `READY` | `READY` | `COMPLETED` |
| **Freepik** | `READY` | `READY` | `READY` | `READY` | `COMPLETED` |
| **Depositphotos** | `READY` | `READY` | `READY` | `READY` | `COMPLETED` |
| **MiriCanvas** | `READY` | `READY` | `READY` | `READY` | `COMPLETED` |

---

## 3. Component Build Status
| Component | Directory / File | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Manifest V3** | `src/manifest.json` | `DONE` | MV3 configuration |
| **Background Worker** | `src/background/` | `IN_PROGRESS` | CORS proxy & storage sync |
| **Popup UI** | `src/popup/` | `PENDING` | Settings & API keys |
| **Draggable Overlay**| `src/overlay/` | `PENDING` | In-page control HUD |
| **AI Vision Service** | `src/services/` | `PENDING` | Universal OpenAI-compatible client |
| **Platform Adapters** | `src/adapters/` | `PENDING` | Unified DOM injectors |

---

## 4. Immediate Blockers & Active Focus
- **Current Blocker**: None.
- **Immediate Task**: <Next task to execute>.
```

---

## 4. Standard Template: `docs/HANDOFF.md`

`HANDOFF.md` must provide a comprehensive onboarding guide for incoming agents:

```markdown
# Agent Handoff Guide — RJ AIO Metadata Extension

> **Purpose**: Essential context, architectural summary, platform gotchas, and instructions for incoming agents resuming work on this codebase.

---

## 1. Project Context & Current Phase
<Summary of what is currently built and what phase is in flight>

---

## 2. Platform Quirks & Gotchas
<Specific DOM anomalies discovered per platform, e.g. React controlled inputs, required save draft steps, prohibited terms, etc.>

---

## 3. How to Run & Verify Locally
<Step-by-step instructions on loading unpacked in chrome://extensions and testing>

---

## 4. Common Developer Workflows & FAQs
<Common troubleshooting steps>
```

---

## 5. Standard Template: `docs/DECISIONS.md`

Architectural Decision Records (ADRs) must be formatted as:

```markdown
# Architectural Decision Records (ADR) — RJ AIO Metadata Extension

## Index
- [ADR-001: Manifest V3 & Vanilla ES Modules Architecture](#adr-001-manifest-v3--vanilla-es-modules-architecture)
- [ADR-002: Dual UI Strategy](#adr-002-dual-ui-strategy)
...

---

## ADR-001: <Title>
- **Status**: `ACCEPTED` | `PROPOSED` | `SUPERSEDED`
- **Date**: YYYY-MM-DD
- **Context**: <Problem statement and requirements>
- **Decision**: <What was decided>
- **Consequences**:
  - **Positive**: <Benefits>
  - **Negative / Trade-offs**: <Known limitations>
```

---

## 6. Document Update Checklist (Mandatory per Commit)

Before creating any git commit:
- [ ] Has `docs/CURRENT_STATE.md` been updated to reflect the new state?
- [ ] Has `docs/HANDOFF.md` been updated with any new platform quirks or workflows?
- [ ] Has `docs/agent-logs/YYYY-MM-DD.md` been updated with the work accomplished in this session?
- [ ] Are all headings and tables aligned with `docs/DOCS_STYLE.md`?
