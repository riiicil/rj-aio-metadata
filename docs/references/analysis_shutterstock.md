# Complete Analysis: Shutterstock Contributor DOM Structure, Selectors & Form Fields
**Technical Documentation of Extracted DOM Recordings for Microstock AIO Metadata Browser Extension**  
*Source Recording Files:*  
- *Photo Session: `rekaman-shutterstock-20260901_234459.json` (2,721 DOM Events & 277 User Actions)*  
- *Video Session: `rekaman-shutterstock-20260901_234650.json` (1,310 DOM Events & 131 User Actions)*  
*Analysis Date: September 1, 2026*

---

## 1. Executive Summary & Shutterstock Form Architecture

Shutterstock Contributor uses a **Single Page Application (SPA)** architecture built on **React** with the **Material-UI (MUI)** component library. All UI components use explicit `data-testid` attributes, making them exceptionally stable and reliable for automated extension interaction.

### Workflow on the Asset Submission Page:
1. **Asset Grid (`div[data-testid="asset-card"]`)**:
   - Photos / Vectors: `https://submit.shutterstock.com/portfolio/not_submitted/photo`
   - Videos / Footage: `https://submit.shutterstock.com/portfolio/not_submitted/video`
2. **Editor Sidebar / Dialog Panel (`div[data-testid="editInfo"]`)**:
   - **Description / Title**: Multiline text input (min. 5 words, max 200 characters).
   - **Category 1 (Primary)**: Required Material-UI dropdown selector.
   - **Category 2 (Secondary)**: Optional Material-UI dropdown selector.
   - **Keywords / Tags**: Interactive chip input accepting comma/semicolon-separated lists (up to 50 keywords).
   - **Image Type (Photos only)**: Radio / Checkbox for `Photo` vs `Illustration`.
   - **Editorial**: Toggle / Checkbox marking non-commercial editorial content.
   - **Mature Content (`isAdult`)**: Checkbox indicating explicit/adult material.
   - **Releases**: Modal trigger to attach model or property release files.
3. **Saving & Submission**:
   - **Save Work**: `button[data-testid="edit-dialog-save-button"]` (persists draft).
   - **Submit**: `button[data-testid="edit-dialog-submit-button"]` (sends asset for curator review).

---

## 2. Precise DOM Selector Map (Validated Selectors)

| Form Component | Primary Selector (`data-testid` / ID) | Fallback Selector (CSS Fallback) | Element Type & Notes |
| :--- | :--- | :--- | :--- |
| **1. Asset Card Container** | `div[data-testid="asset-card"]` | `div.MuiPaper-root[data-testid="asset-card"]` | Container card for each uploaded asset |
| **2. Asset Thumbnail** | `img[data-testid^="card-media-"]` | `div[data-testid="asset-card"] img` | `<img>` preview thumbnail (used for both photos and video clips) |
| **3. Asset Checkbox** | `div[data-testid="asset-card"] input[type="checkbox"]` | `input.PrivateSwitchBase-input[type="checkbox"]` | Checkbox to select/multi-select asset cards |
| **4. Description (Title)** | `textarea[name="description"]` | `div[data-testid="description"] textarea` | `<textarea>` (Min. 5 words, max 200 characters) |
| **5. Category 1 (Primary)** | `input[name="category1"]` | `#category1`, `div[data-testid="category1"]` | MUI Select dropdown (Primary category, required) |
| **6. Category 2 (Secondary)**| `input[name="category2"]` | `#category2`, `div[data-testid="category2"]` | MUI Select dropdown (Secondary category, optional) |
| **7. Category Option Items** | `li.MuiMenuItem-root[data-value]` | `ul[role="listbox"] li` | `<li>` popup menu option elements |
| **8. Keyword Input Field** | `div[data-testid="keyword-input-text"] input` | `input[placeholder*="Add keyword"]` | `<input>` text box accepting comma-separated tags |
| **9. Keyword Chips Container**| `div[data-testid="keyword-input"]` | `div[data-testid="keywords-block-all"]` | Wrapper container displaying active tag chips |
| **10. Selected Tag Chip** | `div[data-testid^="selected-keyword-"]` | `div.MuiChip-root[data-testid^="selected-keyword-"]` | Individual keyword chip |
| **11. More Keyword Actions** | `button[data-testid="more-keyword-actions-button"]` | `#more-keyword-actions-button` | Three-dots icon button opening keyword action menu |
| **12. Clear All Keywords** | `li[data-testid="clear-action"]` | `li:has-text("Clear keywords")` | Menu item to wipe all pre-existing keywords |
| **13. Mark All As Correct** | `button:has-text("Mark all as correct")` | `button[data-testid="mark-all-correct-button"]`, `li[data-testid="mark-all-correct"]` | Button/action approving non-dictionary keywords/spelling warnings |
| **14. Illustration Switch** | `input[name="imageType"][value="illustration"]` | `input[name="imageType"]` | Radio/switch for Illustration vs Photo (images only) |
| **15. Editorial Switch** | `input[name="isEditorial"]` | `label:has-text("Editorial") input` | Checkbox/radio for editorial status |
| **16. Mature Content (`isAdult`)**| `input#isAdult[name="isAdult"]` | `input[name="isAdult"][type="checkbox"]` | Checkbox marking mature/adult content |
| **17. Save Draft Button** | `button[data-testid="edit-dialog-save-button"]` | `button:has-text("Save")` | Button to save metadata draft |
| **18. Submit Review Button** | `button[data-testid="edit-dialog-submit-button"]` | `button:has-text("Submit")` | Primary button to submit assets for moderation |
| **19. Delete Asset Button** | `button[data-testid="content_editor_buttons_delete-button"]` | `button[aria-label="Delete"]` | Button to delete selected asset |

---

## 3. Categories Taxonomy: Image vs Video Differences

Shutterstock enforces distinct category catalogs depending on the asset media type. **Videos / Footage omit several categories** (such as *Abstract*, *Beauty/Fashion*, *Celebrities*, *Interiors*, *Miscellaneous*, *Parks/Outdoor*, and *Vintage*):

### A. Full Category Comparison Table

| Category Name | Available in Images (Photos/Vectors) | Available in Videos (Footage) | Focus & Description |
| :--- | :---: | :---: | :--- |
| **Abstract** | [YES] | [NO] | Geometric patterns, 3D shapes, textures, fractal designs |
| **Animals/Wildlife** | [YES] | [YES] | Domestic pets, wildlife, birds, underwater marine life |
| **Arts** | [YES] | [YES] | Performing arts, dance, theater, music concerts, painting |
| **Backgrounds/Textures** | [YES] | [YES] | Wooden textures, gradient wallpapers, motion backgrounds |
| **Beauty/Fashion** | [YES] | [NO] | Runway, makeup, cosmetics, luxury jewelry, lifestyle fashion |
| **Buildings/Landmarks** | [YES] | [YES] | Architecture, cityscapes, aerial drone monuments, bridges |
| **Business/Finance** | [YES] | [YES] | Corporate offices, stock charts, handshakes, team meetings |
| **Celebrities** | [YES] | [NO] | Public figures, red carpet press events, festivals |
| **Education** | [YES] | [YES] | Classrooms, online learning, graduation ceremonies, libraries |
| **Food and drink** | [YES] | [YES] | Cooking recipes, cafe baristas, food plating, cocktails |
| **Healthcare/Medical** | [YES] | [YES] | Hospitals, surgeries, research labs, pharmaceuticals |
| **Holidays** | [YES] | [YES] | Christmas, New Year fireworks, Halloween, seasonal holidays |
| **Industrial** | [YES] | [YES] | Heavy manufacturing, oil refineries, construction machinery |
| **Interiors** | [YES] | [NO] | Modern living rooms, minimalist offices, architecture decor |
| **Miscellaneous** | [YES] | [NO] | General topics not covered elsewhere |
| **Nature** | [YES] | [YES] | Mountain timelapses, oceans, aerial forests, waterfalls |
| **Objects** | [YES] | [YES] | Isolated product shots, tools, tech gadgets |
| **Parks/Outdoor** | [YES] | [NO] | National parks, camping, trekking, public recreational gardens |
| **People** | [YES] | [YES] | Human emotions, diverse age groups, lifestyle portraits |
| **Religion** | [YES] | [YES] | Historic temples, churches, traditional religious ceremonies |
| **Science** | [YES] | [YES] | Astronomy, molecular 3D animations, biology experiments |
| **Signs/Symbols** | [YES] | [YES] | Wayfinding signs, graphical icons, UI/UX badges |
| **Sports/Recreation** | [YES] | [YES] | Extreme sports, fitness workouts, stadium football matches |
| **Technology** | [YES] | [YES] | Artificial intelligence, data centers, futuristic concepts |
| **Transportation** | [YES] | [YES] | High-speed trains, aerial traffic, aircraft takeoffs, highways |
| **Vintage** | [YES] | [NO] | Retro aesthetics, antique objects, historical archival styling |

### B. Summary Lists for Fast Reference

- **Image Categories (26 Categories)**:  
  `Abstract`, `Animals/Wildlife`, `Arts`, `Backgrounds/Textures`, `Beauty/Fashion`, `Buildings/Landmarks`, `Business/Finance`, `Celebrities`, `Education`, `Food and drink`, `Healthcare/Medical`, `Holidays`, `Industrial`, `Interiors`, `Miscellaneous`, `Nature`, `Objects`, `Parks/Outdoor`, `People`, `Religion`, `Science`, `Signs/Symbols`, `Sports/Recreation`, `Technology`, `Transportation`, `Vintage`.

- **Video Categories (19 Categories)**:  
  `Animals/Wildlife`, `Arts`, `Backgrounds/Textures`, `Buildings/Landmarks`, `Business/Finance`, `Education`, `Food and drink`, `Healthcare/Medical`, `Holidays`, `Industrial`, `Nature`, `Objects`, `People`, `Religion`, `Science`, `Signs/Symbols`, `Sports/Recreation`, `Technology`, `Transportation`.

---

## 4. Keyword Management: Clearing Pre-Existing Tags & Spelling Error Overrides

When automating metadata filling on Shutterstock, existing metadata or special keywords require precise handling:

### A. Clearing Pre-Existing Keywords
If an asset already contains old or embedded IPTC tags upon upload, the extension should clear them before applying new AI-generated tags:
1. Click the three-dots menu button: `button[data-testid="more-keyword-actions-button"]`.
2. Click the clear item: `li[data-testid="clear-action"]` (contains text `"Clear keywords"` inside `<p class="MuiTypography-root ...">Clear keywords</p>`).

```javascript
/**
 * Clears all existing keyword chips on Shutterstock
 */
export async function clearExistingKeywords() {
  const moreBtn = document.querySelector('button[data-testid="more-keyword-actions-button"]');
  if (!moreBtn) return;
  
  moreBtn.click();
  await new Promise(r => setTimeout(r, 100));
  
  const clearAction = document.querySelector('li[data-testid="clear-action"]');
  if (clearAction) {
    clearAction.click();
  }
}
```

### B. Spelling Warning / "Mark All as Correct" Handling
When keywords contain foreign words, non-English terminology, technical acronyms, or specific proper nouns, Shutterstock flags them with an orange outline / warning banner:
- Trigger button: `button[data-testid="mark-all-correct-button"]` or `button:has-text("Mark all as correct")`.
- The extension should automatically detect this button and click it to ensure valid submission without curator bounce-back.

```javascript
/**
 * Automatically approves flagged keywords
 */
export function autoApproveKeywords() {
  const markCorrectBtn = document.querySelector('button[data-testid="mark-all-correct-button"], button:has-text("Mark all as correct")');
  if (markCorrectBtn && !markCorrectBtn.disabled) {
    markCorrectBtn.click();
  }
}
```

---

## 5. Editorial Content Guidelines & Caption Formatting Rules

Shutterstock enforces strict **journalistic formatting rules** for all assets marked as **Editorial**:

### Mandatory Editorial Caption Syntax:
```text
CITY, STATE/COUNTRY - MONTH DAY YEAR: Factual and objective description of what is depicted in the image or video footage.
```

### Key Formatting Requirements:
1. **Header in ALL CAPS**: Location and Date must be capitalized (e.g. `LONDON, UNITED KINGDOM - AUGUST 15, 2026:`).
2. **Month Spelled Out in English**: (e.g., `JANUARY`, `FEBRUARY`, `MARCH`, `SEPTEMBER`, etc.).
3. **Punctuation**: Followed by a colon `:` and a single space before the narrative description.
4. **Length**: Minimum 5 descriptive words, maximum 200 characters.
5. **Objectivity**: Must be 100% factual. **Never use subjective or commercial buzzwords** (e.g., *beautiful, amazing, stunning, perfect, best*).

### Valid Editorial Caption Examples:
- **Photo**:  
  `JAKARTA, INDONESIA - SEPTEMBER 1, 2026: Passengers boarding electric commuter trains during evening rush hour at Manggarai station.`
- **Video**:  
  `TOKYO, JAPAN - OCTOBER 12, 2026: Time lapse of dense pedestrian crowd crossing famous Shibuya intersection under neon street lights.`

---

## 6. React & Material-UI Event Dispatcher Mechanism

Shutterstock form fields are React controlled inputs built on Material-UI. Updating fields via standard JavaScript requires native prototype setter dispatching:

```javascript
/**
 * Injects value into React / Material-UI input or textarea
 * @param {HTMLInputElement|HTMLTextAreaElement} element 
 * @param {string} value 
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

## 7. Complete Shutterstock Adapter Implementation (`ShutterstockAdapter.js`)

```javascript
export class ShutterstockAdapter {
  static isMatch(url) {
    return url.includes('submit.shutterstock.com');
  }

  /**
   * Retrieves asset cards from the grid
   */
  static getAssetCards() {
    return Array.from(document.querySelectorAll('div[data-testid="asset-card"]'));
  }

  /**
   * Retrieves thumbnail preview image URL for LLM Vision processing
   */
  static getThumbnailUrl(cardElement) {
    const img = cardElement.querySelector('img[data-testid^="card-media-"], img');
    return img ? img.src : null;
  }

  /**
   * Selects an asset card in the grid
   */
  static selectCard(cardElement) {
    const checkbox = cardElement.querySelector('input[type="checkbox"]');
    if (checkbox && !checkbox.checked) {
      checkbox.click();
    } else {
      cardElement.click();
    }
  }

  /**
   * Clears existing keyword chips
   */
  static async clearKeywords() {
    const moreBtn = document.querySelector('button[data-testid="more-keyword-actions-button"]');
    if (!moreBtn) return;
    moreBtn.click();
    await new Promise(r => setTimeout(r, 80));
    const clearAction = document.querySelector('li[data-testid="clear-action"]');
    if (clearAction) {
      clearAction.click();
    }
  }

  /**
   * Fills all metadata fields in the Shutterstock sidebar editor
   */
  static async fillMetadata({
    description,
    category1,
    category2 = null,
    keywords = [],
    isIllustration = false,
    isEditorial = false,
    isMature = false,
    clearExisting = true
  }) {
    // 1. Fill Description / Title (Min 5 words, max 200 characters)
    const descInput = document.querySelector('textarea[name="description"], div[data-testid="description"] textarea');
    if (descInput && description) {
      setReactInputValue(descInput, description.slice(0, 200));
    }

    // 2. Select Category 1 (Primary)
    if (category1) {
      const cat1Input = document.querySelector('input[name="category1"]');
      if (cat1Input) {
        setReactInputValue(cat1Input, category1);
      }
    }

    // 3. Select Category 2 (Secondary)
    if (category2) {
      const cat2Input = document.querySelector('input[name="category2"]');
      if (cat2Input) {
        setReactInputValue(cat2Input, category2);
      }
    }

    // 4. Clear Old Keywords if requested
    if (clearExisting) {
      await this.clearKeywords();
    }

    // 5. Inject Keywords (Comma-separated into Chip Input)
    if (keywords && keywords.length > 0) {
      const kwInput = document.querySelector('div[data-testid="keyword-input-text"] input, input[placeholder*="Add keyword"]');
      if (kwInput) {
        kwInput.focus();
        const kwString = (Array.isArray(keywords) ? keywords.slice(0, 50).join(', ') : keywords) + ',';
        setReactInputValue(kwInput, kwString);
        kwInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        
        // Auto-approve flagged non-dictionary words after rendering
        setTimeout(() => {
          const markCorrectBtn = document.querySelector('button[data-testid="mark-all-correct-button"], button:has-text("Mark all as correct")');
          if (markCorrectBtn) markCorrectBtn.click();
        }, 150);
      }
    }

    // 6. Set Illustration Toggle (For photo assets)
    if (isIllustration) {
      const illusRadio = document.querySelector('input[name="imageType"][value="illustration"]');
      if (illusRadio && !illusRadio.checked) {
        illusRadio.click();
      }
    }

    // 7. Set Editorial Flag
    if (isEditorial) {
      const editorialCb = document.querySelector('input[name="isEditorial"]');
      if (editorialCb && !editorialCb.checked) {
        editorialCb.click();
      }
    }

    // 8. Set Mature Content (isAdult)
    const adultCb = document.querySelector('input#isAdult, input[name="isAdult"]');
    if (adultCb && adultCb.checked !== Boolean(isMature)) {
      adultCb.click();
    }
  }

  /**
   * Saves the draft metadata
   */
  static saveDraft() {
    const saveBtn = document.querySelector('button[data-testid="edit-dialog-save-button"], button:has-text("Save")');
    if (saveBtn && !saveBtn.disabled) {
      saveBtn.click();
      return true;
    }
    return false;
  }

  /**
   * Submits the asset for curator moderation
   */
  static submitForReview() {
    const submitBtn = document.querySelector('button[data-testid="edit-dialog-submit-button"], button:has-text("Submit")');
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
      return true;
    }
    return false;
  }
}
```
