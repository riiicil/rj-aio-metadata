# Complete Analysis: MiriCanvas DesignHub DOM Structure, Selectors & Form Fields
**Technical Documentation of Extracted DOM Recording for Microstock AIO Metadata Browser Extension**  
*Source Recording File: `rekaman-miricanvas-20260902_142540.json` (2,205 DOM Events & 230 User Actions)*  
*Analysis Date: September 2, 2026*

---

## 1. Executive Summary & MiriCanvas Architecture

MiriCanvas DesignHub operates on `https://designhub.miricanvas.com/en/element/to-do` (with status tabs `/element/to-do`, `/element/pending`, `/element/rejected`, `/element/approved`). It is a modern **Single Page Application (SPA)** using React, Panda-CSS, and Emotion styling.

### Key Workflow Highlights:
1. **High-Capacity Batch Grid (`div.panda-ehlNbj`)**:
   - Contributors can switch items-per-page capacity to `50`, `300`, or **`1000 at a Time`**, enabling mass-tagging of up to 1,000 elements simultaneously!
   - **Select All Checkbox**: Top navbar checkbox (`nav input[type="checkbox"]`) selects all elements currently loaded on the active page.
2. **Right-Hand Metadata Sidebar**:
   - **Content Type (Radio Group `name="contentType"`)**: Distinguishes between `PNG element` (`BITMAP`), `Photo` (`PICTURE`), `Photo(Cut-out)` (`REMOVE_BACKGROUND_PICTURE`), `Background` (`BACKGROUND_PICTURE`), `SVG element` (`VECTOR`), and `GIF`.
   - **Content Tier (Pricing Tier `name="contentTier"`)**: `Standard (Free)` (`STANDARD`) vs `Premium (Paid)` (`PREMIUM`).
   - **AI-Generated Content ("Check if it is a content made with AI image generator")**: Checkbox flag for Generative AI assets.
   - **Element Name (Title)**: Textarea for element title (`textarea[placeholder="Enter Element Name"]`).
   - **Keywords / Tags**: Input accepting comma-separated tags (`input[placeholder*="Separate multiple keywords using commas"]`).
3. **Saving & Submission**:
   - **Save Metadata**: `button:has-text("Save Metadata")` (saves draft to selected elements).
   - **Submit**: `button:has-text("Submit")` (submits checked assets for moderation review).

---

## 2. Precise DOM Selector Map (Validated Selectors)

| Form Component | Primary Selector | Fallback Selector | Element Type & Notes |
| :--- | :--- | :--- | :--- |
| **1. Element Card Container** | `div.css-1qnaji9.e1pyeb4g3` | `div.panda-ehlNbj div.panda-gFNlpN` | Card container for each uploaded element |
| **2. Asset Thumbnail** | `div.css-pzwb7t img.css-l67sxu` | `div.panda-ehlNbj img` | Preview `<img>` (used for LLM Vision processing) |
| **3. Card Checkbox** | `input[type="checkbox"].panda-emssv` | `div.panda-ehlNbj input[type="checkbox"]` | Checkbox selecting an individual element |
| **4. Select All Checkbox** | `nav div.panda-cVAOOe input[type="checkbox"]` | `nav input[type="checkbox"]` | Selects all 1,000 loaded elements on page |
| **5. Capacity Dropdown** | `div.panda-fehQR div.panda-fjGuhS` | `div.panda-fehQR` | Dropdown setting items per page (`50`, `300`, `1000`) |
| **6. Content Type Radio Group**| `input[name="contentType"]` | `label:has(input[name="contentType"])` | Radio inputs for format/content category |
| **7. PNG Element Radio** | `input[name="contentType"][value="BITMAP"]` | `label:has-text("PNG element") input` | Transparent PNG graphic element |
| **8. Photo Radio** | `input[name="contentType"][value="PICTURE"]` | `label:has-text("Photo") input` | Standard JPG photography |
| **9. Cut-out Photo Radio** | `input[name="contentType"][value="REMOVE_BACKGROUND_PICTURE"]` | `label:has-text("Photo(Cut-out)") input` | Isolated object cutout on transparent PNG |
| **10. Background Radio** | `input[name="contentType"][value="BACKGROUND_PICTURE"]` | `label:has-text("Background") input` | Full-bleed background texture/photo |
| **11. SVG Element Radio** | `input[name="contentType"][value="VECTOR"]` | `label:has-text("SVG element") input` | Vector graphics |
| **12. Content Tier Radio Group**| `input[name="contentTier"]` | `label:has(input[name="contentTier"])` | Pricing tier radio buttons |
| **13. Standard (Free) Tier** | `input[name="contentTier"][value="STANDARD"]` | `label:has-text("Standard (Free)") input` | Free element available to all users |
| **14. Premium (Paid) Tier** | `input[name="contentTier"][value="PREMIUM"]` | `label:has-text("Premium (Paid)") input` | Paid element for Pro subscribers |
| **15. AI-Generated Checkbox** | `div:has-text("AI image generator") input[type="checkbox"]` | `div.panda-xPAgg input[type="checkbox"]` | Checkbox marking asset as AI generated |
| **16. Element Name (Title)** | `textarea[placeholder="Enter Element Name"]` | `textarea.panda-eDQUvt` | Textarea for element title |
| **17. Keyword Tag Input** | `input[placeholder*="Separate multiple keywords"]` | `input.panda-eNrFAg` | Text input accepting comma-separated keywords |
| **18. Keyword Chip Container**| `div.panda-ebDdrq` | `div.panda-ebDdrq.panda-fPtSx` | Wrapper holding active keyword chips |
| **19. Keyword Remove Icon** | `div.panda-ebDdrq svg, span.panda-cfsavV svg` | `div.panda-ebDdrq path` | Icon removing an individual tag chip |
| **20. Save Metadata Button** | `button:has-text("Save Metadata")` | `button.panda-YJgQP:has-text("Save Metadata")` | Saves metadata changes to selected element(s) |
| **21. Submit Button** | `button:has-text("Submit")` | `button.panda-YJgQP:has-text("Submit")` | Primary submission button sending to review |

---

## 3. Content Type & Content Tier Taxonomy

### A. Content Type Mapping (`name="contentType"`)

| Value (`value`) | UI Display Label | Recommended File Formats & Use Case |
| :--- | :--- | :--- |
| **`BITMAP`** | **PNG element** | Transparent PNG graphics, icons, illustrations, stickers, cutouts. |
| **`PICTURE`** | **Photo** | Full rectangular JPG photography. |
| **`REMOVE_BACKGROUND_PICTURE`** | **Photo(Cut-out)** | Real-world photographic objects with background removed on transparent PNG. |
| **`BACKGROUND_PICTURE`** | **Background** | Full-canvas background textures, abstract wallpapers, decorative backdrops. |
| **`VECTOR`** | **SVG element** | Vector graphics (.svg) scalable without loss of quality. |
| **`GIF`** | **GIF** | Animated stickers, looping graphic elements. |

### B. Content Tier (Pricing) Mapping (`name="contentTier"`)

| Value (`value`) | UI Display Label | Description & Revenue Model |
| :--- | :--- | :--- |
| **`STANDARD`** | **Standard (Free)** | Free content available to all MiriCanvas basic users. Drives high volume and profile discovery. |
| **`PREMIUM`** | **Premium (Paid)** | Paid content monetized through MiriCanvas Pro subscription royalties. |

---

## 4. Metadata Fields & Tagging Rules

### A. Element Name (Title)
- **Field**: `textarea[placeholder="Enter Element Name"]`.
- **Language**: English or Korean (English strongly recommended for international catalog indexing).
- **Format**: Concise, descriptive phrase without special characters or keyword stuffing.

### B. Keywords / Tags
- **Field**: `input[placeholder*="Separate multiple keywords using commas"]`.
- **Delimiter**: Comma-separated (`tag1, tag2, tag3,`).
- **Tag Injection Rule**: Typing/pasting tags separated by commas and dispatching `Enter` automatically converts them into chips.
- **Clearing Existing Tags**: Click remove `svg` on each tag chip in `div.panda-ebDdrq`.

### C. AI-Generated Content Flag
- **Field**: `div:has-text("AI image generator") input[type="checkbox"]`.
- **Rule**: Must be checked if the asset was generated by Midjourney, Stable Diffusion, DALL-E, Flux, Firefly, etc.

---

## 5. High-Capacity Batch Workflow (Up to 1,000 Elements)

MiriCanvas allows contributors to process up to **1,000 elements at a time**:
1. **Set Capacity to 1,000**:
   - Click `div.panda-fehQR div.panda-fjGuhS` and select `li:has-text("1000")`.
2. **Select All Elements**:
   - Click the top navbar checkbox `nav div.panda-cVAOOe input[type="checkbox"]`.
3. **Batch Fill Metadata & Save**:
   - Apply titles, tags, content type, and tier.
   - Click **`Save Metadata`** (`button:has-text("Save Metadata")`).

---

## 6. Form Automation & Native Dispatcher Guide

MiriCanvas uses React and Panda-CSS. Form values require native prototype setter dispatching:

```javascript
/**
 * Injects value into React controlled inputs
 */
export function setReactInputValue(element, value) {
  if (!element) return;

  const prototype = element instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (nativeSetter) {
    nativeSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}
```

---

## 7. Complete MiriCanvas Adapter Implementation (`MiriCanvasAdapter.js`)

```javascript
export class MiriCanvasAdapter {
  static isMatch(url) {
    return url.includes("designhub.miricanvas.com");
  }

  /**
   * Sets batch view capacity to 1000 items
   */
  static async setMaxCapacity1000() {
    const capacityBtn = document.querySelector('div.panda-fehQR div.panda-fjGuhS, div.panda-fehQR');
    if (capacityBtn && !capacityBtn.textContent.includes("1000")) {
      capacityBtn.click();
      await new Promise(r => setTimeout(r, 150));
      const opt1000 = document.querySelector('li.panda-fAtomh:has-text("1000"), li:has-text("1000")');
      if (opt1000) opt1000.click();
    }
  }

  /**
   * Retrieves all element cards in the grid
   */
  static getElementCards() {
    return Array.from(document.querySelectorAll('div.css-1qnaji9.e1pyeb4g3, div.panda-ehlNbj div.panda-gFNlpN'));
  }

  /**
   * Gets thumbnail URL from an element card
   */
  static getThumbnailUrl(cardElement) {
    const img = cardElement.querySelector('img.css-l67sxu, img');
    return img ? img.src : null;
  }

  /**
   * Selects an element card in the grid
   */
  static selectCard(cardElement) {
    cardElement.click();
  }

  /**
   * Selects all loaded elements on the active page
   */
  static selectAll() {
    const selectAllCheckbox = document.querySelector('nav div.panda-cVAOOe input[type="checkbox"], nav input[type="checkbox"]');
    if (selectAllCheckbox && !selectAllCheckbox.checked) {
      selectAllCheckbox.click();
    }
  }

  /**
   * Clears existing keyword chips
   */
  static clearKeywords() {
    const removeButtons = document.querySelectorAll('div.panda-ebDdrq svg, span.panda-cfsavV svg');
    removeButtons.forEach(btn => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  }

  /**
   * Fills metadata for the selected element
   */
  static async fillMetadata({
    title,
    contentType = "BITMAP", // "BITMAP" (PNG), "PICTURE" (Photo), "REMOVE_BACKGROUND_PICTURE" (Cutout), "BACKGROUND_PICTURE", "VECTOR"
    contentTier = "PREMIUM", // "PREMIUM" (Paid) or "STANDARD" (Free)
    isAiGenerated = false,
    keywords = [],
    clearExisting = true
  }) {
    // 1. Set Content Type Radio
    if (contentType) {
      const typeRadio = document.querySelector(`input[name="contentType"][value="${contentType}"]`);
      if (typeRadio && !typeRadio.checked) {
        typeRadio.click();
      }
    }

    // 2. Set Content Tier (Pricing) Radio
    if (contentTier) {
      const tierRadio = document.querySelector(`input[name="contentTier"][value="${contentTier}"]`);
      if (tierRadio && !tierRadio.checked) {
        tierRadio.click();
      }
    }

    // 3. Set AI-Generated Content Checkbox
    const aiCheckbox = document.querySelector('div:has-text("AI image generator") input[type="checkbox"], div.panda-xPAgg input[type="checkbox"]');
    if (aiCheckbox && aiCheckbox.checked !== Boolean(isAiGenerated)) {
      aiCheckbox.click();
    }

    // 4. Fill Element Name (Title)
    const nameTextarea = document.querySelector('textarea[placeholder="Enter Element Name"], textarea.panda-eDQUvt');
    if (nameTextarea && title) {
      setReactInputValue(nameTextarea, title.trim().slice(0, 100));
    }

    // 5. Clear Old Keywords if requested
    if (clearExisting) {
      this.clearKeywords();
      await new Promise(r => setTimeout(r, 60));
    }

    // 6. Inject Keywords
    if (keywords && keywords.length > 0) {
      const kwInput = document.querySelector('input[placeholder*="Separate multiple keywords"], input.panda-eNrFAg');
      if (kwInput) {
        kwInput.focus();
        const cleanTags = (Array.isArray(keywords) ? keywords : keywords.split(","))
          .map(k => k.trim())
          .filter(k => k.length > 1)
          .slice(0, 30);

        for (const tag of cleanTags) {
          setReactInputValue(kwInput, tag);
          kwInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
          await new Promise(r => setTimeout(r, 30));
        }
      }
    }
  }

  /**
   * Saves metadata draft
   */
  static saveMetadata() {
    const saveBtn = document.querySelector('button:has-text("Save Metadata"), button.panda-YJgQP:has-text("Save Metadata")');
    if (saveBtn) {
      saveBtn.click();
      return true;
    }
    return false;
  }

  /**
   * Submits selected elements for review
   */
  static submitForReview() {
    const submitBtn = document.querySelector('button:has-text("Submit"), button.panda-YJgQP:has-text("Submit")');
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
      return true;
    }
    return false;
  }
}
```
