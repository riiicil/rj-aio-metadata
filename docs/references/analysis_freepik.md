# Complete Analysis: Freepik Contributor DOM Structure, Selectors & Form Fields
**Technical Documentation of Extracted DOM Recording for Microstock AIO Metadata Browser Extension**  
*Source Recording File: `rekaman-freepik-20260902_131343.json` (953 DOM Events & 241 User Actions)*  
*Analysis Date: September 2, 2026*

---

## 1. Executive Summary & Freepik Architecture

Freepik Contributor uses a modern **Single Page Application (SPA)** interface hosted on `https://contributor.freepik.com/catalog/pending-files/1` (and `contributor.magnific.com`). Contributors manage pending uploads through a batch catalog grid (`div.catalog`) and fill metadata via a responsive sidebar editor (`aside.catalog__sidebar`).

### Key Workflow Highlights:
1. **Catalog Batch Grid (`div.catalog`)**:
   - Contributors can toggle Grid and List layouts (`button > i.icon--grid`, `button > i.icon--list`).
   - Each uploaded file is rendered as a card (`div.catalog__item`).
   - Cards can be selected individually or in bulk via checkbox (`label.checkbox.checkbox--sm input[type="checkbox"]`).
2. **Right-Hand Metadata Sidebar (`aside.catalog__sidebar`)**:
   - **Title (English)**: Multiline text area (`div.inputTitle textarea`, min. 5 characters/words).
   - **Keywords / Tags**: Interactive tag-chip component accepting comma-separated inputs (min. 5 tags, max. 50 tags).
   - **AI-Generated Content ("Created with artificial intelligence")**: Switch toggle activating:
     - **AI Base Model Selector**: Dropdown menu (`div.selector_base_model select`).
     - **AI Prompt**: Textarea for generative prompt description (`textarea#aiPrompt`).
   - **No Category Dropdown**: Freepik does not require manual category selection (indexing is 100% automated based on filetype format, Title, Tags, and AI metadata).
3. **Mandatory Save Draft Step (`button.button-paste-draft`)**:
   - **CRITICAL**: In Freepik's SPA state management, if you fill metadata for Asset A and switch to Asset B **without clicking Save/Create Draft first**, all input for Asset A is immediately discarded and reset to blank.
4. **Submission Flow**:
   - **Create / Paste Draft**: `button.button-paste-draft` / `button:has-text("Create draft")`.
   - **Send to Review**: `button:has-text("Send to review")` / `button.button--submit` (submits selected assets for moderator approval).

---

## 2. Precise DOM Selector Map (Validated Selectors)

| Form Component | Primary Selector (Class / ID) | Fallback Selector | Element Type & Notes |
| :--- | :--- | :--- | :--- |
| **1. Catalog Item Card** | `div.catalog__item` | `div.row.mg-none > div.catalog__item` | Container card for each uploaded pending file |
| **2. Asset Thumbnail** | `div.catalog__item .thumbnail img` | `div.thumbnail > img` | Preview `<img>` (used for LLM Vision processing) |
| **3. Card Checkbox** | `div.catalog__item label.checkbox input` | `input[type="checkbox"].checkbox__input` | Checkbox for selecting / multi-selecting cards |
| **4. Sidebar Editor Panel** | `aside.catalog__sidebar` | `div.catalog > aside.catalog__sidebar` | Sidebar container holding the metadata form |
| **5. Title Input Field** | `div.inputTitle textarea` | `textarea[placeholder*="Enter the title"]` | `<textarea>` for title in English (min. 5 chars) |
| **6. Title Error State** | `textarea.input-wrapper--error` | `div.inputTitle textarea.input-wrapper--error` | Error border styling when title is too short |
| **7. Keyword Tag Input** | `input#inputTag` | `div.inputTag input` | `<input>` text box accepting comma-separated tags |
| **8. Keyword Chip List** | `div.inputTag__list` | `div.inputTag.inputTag--md div.row` | Container wrapper for active tag chips |
| **9. Keyword Tag Item** | `div.inputTag__item` | `div.inputTag__list div.inputTag__item` | Individual tag chip element |
| **10. Remove Tag Button** | `button.inputTag__remove` | `div.inputTag__item button` | Button with `i.icon--cross` icon removing a tag |
| **11. AI Toggle Switch** | `div.aiSelector--container input.switch__input` | `label.switch.switch--sm input` | Switch toggle marking asset as AI generated |
| **12. AI Base Model Select**| `div.selector_base_model select` | `div.selector_base_model div.dropdown__button` | Dropdown selector for generative AI base model |
| **13. AI Base Model Options**| `div.selector_base_model option, div.dropdown__select li` | `ul.dropdown__list li` | Option elements for AI models |
| **14. AI Prompt Input** | `textarea#aiPrompt` | `textarea[placeholder="Enter your prompt"]` | `<textarea>` for the generative prompt text |
| **15. Delete Asset Button** | `button.button--sm > i.icon--trash` | `button:has(i.icon--trash)` | Button to delete selected asset from queue |
| **16. Create Draft Button** | `button.button-paste-draft` | `button:has-text("Create draft")` | **MANDATORY**: Saves draft before switching cards |
| **17. Send to Review Button**| `button:has-text("Send to review")` | `button.button--submit` | Primary button sending selected files to curation |

---

## 3. Metadata Fields & Mandatory State Rules

### A. Title (Description)
- **Language**: Must be written in **English**.
- **Length**: Minimum 5 characters / words (Freepik displays red warning `.input-wrapper--error` if below minimum).
- **Style**: Clear, concise, and factual. Avoid generic keyword stuffing or promotional phrases.

### B. Keywords / Tags
- **Quantity**: Minimum **5 keywords**, Maximum **50 keywords**.
- **Delimiter**: Comma-separated (e.g. `technology, artificial intelligence, neural network, future, innovation`).
- **Clearing Existing Tags**:
  - Programmatically remove all active tag chips:
    ```javascript
    export function clearAllFreepikTags() {
      const removeBtns = document.querySelectorAll('button.inputTag__remove');
      removeBtns.forEach(btn => btn.click());
    }
    ```

### C. Category Note
- **No Manual Category Dropdown**: Freepik categorizes assets automatically based on file format (Vector `.eps`/`.svg`, Photo `.jpg`, PSD `.psd`, Video `.mp4`) and internal AI semantic analysis. The extension does not need to set a category field.

### D. CRITICAL: Mandatory Save Draft Step Per Asset
> [!IMPORTANT]
> **State Persistence Warning**: In Freepik's web application architecture, sidebar metadata is transient. If you modify fields for Item 1 and click Item 2 in the grid without clicking **"Create draft"** (`button.button-paste-draft`), Freepik **discards all unsaved inputs** and reverts Item 1 to empty.
> 
> **Required Batch Processing Loop Sequence:**
> 1. Select Asset Card $N$ (`FreepikAdapter.selectCard(card)`).
> 2. Fill Title, Tags, and AI metadata (`FreepikAdapter.fillMetadata(...)`).
> 3. **MUST Save Draft** (`FreepikAdapter.saveDraft()`).
> 4. Wait $300\text{ms}$ for server synchronization.
> 5. Proceed to Asset Card $N+1$.

---

## 4. AI-Generated Content Workflow & Base Models

When an asset is generated via AI:
1. **Toggle Switch**: Turn on `div.aiSelector--container input.switch__input`.
2. **Select Base Model** (`div.selector_base_model select`):
   - `Adobe Firefly`
   - `Flux 1.0 Fast`
   - `Flux 1.0 Realism`
   - `Midjourney`
   - `Dall-e 1`
   - `Dall-e 2`
   - `Dall-e 3`
   - `Stable Diffusion`
   - `Seedream`
   - `Mystic`
   - `Other`
3. **Enter AI Prompt** (`textarea#aiPrompt`): Fill the exact or descriptive prompt used to generate the image.

---

## 5. Form Automation & Native Dispatcher Guide

Freepik uses standard reactive inputs. To inject metadata via JavaScript:

```javascript
/**
 * Injects value into input or textarea with native input/change dispatching
 * @param {HTMLInputElement|HTMLTextAreaElement} element 
 * @param {string} value 
 */
export function setNativeInputValue(element, value) {
  if (!element) return;
  element.focus();
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}
```

### Keywords Tag Injection:
```javascript
export async function injectFreepikKeywords(keywordsList) {
  const tagInput = document.querySelector("#inputTag, div.inputTag input");
  if (!tagInput) return;

  const tagsString = (Array.isArray(keywordsList) ? keywordsList.slice(0, 50).join(", ") : keywordsList) + ",";
  setNativeInputValue(tagInput, tagsString);
  tagInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
}
```

---

## 6. Complete Freepik Adapter Implementation (`FreepikAdapter.js`)

```javascript
export class FreepikAdapter {
  static isMatch(url) {
    return url.includes("contributor.freepik.com") || url.includes("contributor.magnific.com");
  }

  /**
   * Retrieves all asset cards from the catalog grid
   */
  static getAssetCards() {
    return Array.from(document.querySelectorAll("div.catalog__item"));
  }

  /**
   * Gets thumbnail image URL from a catalog card
   */
  static getThumbnailUrl(cardElement) {
    const img = cardElement.querySelector(".thumbnail img, img");
    return img ? img.src : null;
  }

  /**
   * Selects an asset card in the catalog grid
   */
  static selectCard(cardElement) {
    const checkbox = cardElement.querySelector('label.checkbox input[type="checkbox"]');
    if (checkbox && !checkbox.checked) {
      checkbox.click();
    } else {
      cardElement.click();
    }
  }

  /**
   * Clears all existing keyword chips
   */
  static clearKeywords() {
    const removeButtons = document.querySelectorAll("button.inputTag__remove");
    removeButtons.forEach(btn => btn.click());
  }

  /**
   * Fills all metadata fields in the Freepik sidebar editor
   */
  static async fillMetadata({
    title,
    keywords = [],
    isAiGenerated = false,
    aiModel = "Adobe Firefly", // "Adobe Firefly", "Flux 1.0 Fast", "Midjourney", "Dall-e 3", "Stable Diffusion"
    aiPrompt = "",
    clearExisting = true
  }) {
    // 1. Fill Title
    const titleInput = document.querySelector("div.inputTitle textarea, textarea[placeholder*='Enter the title']");
    if (titleInput && title) {
      setNativeInputValue(titleInput, title.trim());
    }

    // 2. Clear Old Keywords if requested
    if (clearExisting) {
      this.clearKeywords();
      await new Promise(r => setTimeout(r, 60));
    }

    // 3. Inject Keywords
    if (keywords && keywords.length > 0) {
      const tagInput = document.querySelector("#inputTag, div.inputTag input");
      if (tagInput) {
        const cleanTags = (Array.isArray(keywords) ? keywords : keywords.split(","))
          .map(k => k.trim())
          .filter(k => k.length > 1)
          .slice(0, 50)
          .join(", ") + ",";

        setNativeInputValue(tagInput, cleanTags);
        tagInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
      }
    }

    // 4. Configure AI-Generated Content
    const aiSwitch = document.querySelector("div.aiSelector--container input.switch__input, label.switch input");
    if (aiSwitch && aiSwitch.checked !== Boolean(isAiGenerated)) {
      aiSwitch.click();
      await new Promise(r => setTimeout(r, 150));
    }

    if (isAiGenerated) {
      // Set AI Base Model
      const modelSelect = document.querySelector("div.selector_base_model select");
      if (modelSelect && aiModel) {
        modelSelect.value = aiModel;
        modelSelect.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        // Fallback for custom dropdown
        const dropdownBtn = document.querySelector("div.selector_base_model div.dropdown__button");
        if (dropdownBtn) {
          dropdownBtn.click();
          await new Promise(r => setTimeout(r, 100));
          const optionLi = document.querySelector(`div.dropdown__select li:has-text("${aiModel}")`);
          if (optionLi) optionLi.click();
        }
      }

      // Fill AI Prompt
      if (aiPrompt) {
        const promptInput = document.querySelector("textarea#aiPrompt");
        if (promptInput) {
          setNativeInputValue(promptInput, aiPrompt);
        }
      }
    }
  }

  /**
   * MANDATORY: Saves metadata draft before moving to next asset
   */
  static saveDraft() {
    const draftBtn = document.querySelector("button.button-paste-draft, button:has-text('Create draft')");
    if (draftBtn) {
      draftBtn.click();
      return true;
    }
    return false;
  }

  /**
   * Submits selected files for review
   */
  static submitForReview() {
    const submitBtn = document.querySelector("button:has-text('Send to review'), button.button--submit");
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
      return true;
    }
    return false;
  }

  /**
   * Complete batch loop demonstration for Freepik
   */
  static async processBatch(itemsWithMetadata) {
    const cards = this.getAssetCards();
    
    for (let i = 0; i < Math.min(cards.length, itemsWithMetadata.length); i++) {
      const card = cards[i];
      const metadata = itemsWithMetadata[i];

      // 1. Select card
      this.selectCard(card);
      await new Promise(r => setTimeout(r, 200));

      // 2. Fill metadata
      await this.fillMetadata(metadata);
      await new Promise(r => setTimeout(r, 100));

      // 3. CRITICAL: Save draft before selecting next card!
      this.saveDraft();
      await new Promise(r => setTimeout(r, 350));
    }
  }
}
```
