# Complete Analysis: Vecteezy Contributor DOM Structure, Selectors & Form Fields
**Technical Documentation of Extracted DOM Recording for Microstock AIO Metadata Browser Extension**  
*Source Recording Files:*  
- *Session 1: `rekaman-vecteezy-20260902_125703.json` (1,870 DOM Events & 288 User Actions)*  
- *Session 2: `rekaman-vecteezy-20260902_130420.json` (171 DOM Events & 16 User Actions — AI Tool "Other" Flow)*  
*Analysis Date: September 2, 2026*

---

## 1. Executive Summary & Vecteezy Architecture

Vecteezy Contributor uses a modern **Single Page Application (SPA)** built with **React, Styled-Components, and Material-UI (MUI)**. The submission workflow is hosted on `https://contributors.vecteezy.com/portfolio/add_data`.

### Workflow Highlights:
1. **Batch Grid View (`div[data-testid="resource-list"]`)**:
   - Contributors can switch grid sizing (`#grid-size-small`, `#grid-size-medium`, `#grid-size-large`).
   - "Select all" / "Deselect all" buttons allow multi-selection batch processing.
   - Individual cards (`div[data-testid="resource-card"]`) can be clicked to open/edit metadata in the right-hand sidebar.
2. **Right-Hand Sidebar Metadata Editor**:
   - **License Selection**: Radio group (`Pro`, `Free`, `Editorial`).
   - **Category (Auto-Assigned Content Type)**: Automatically detected and populated by Vecteezy from uploaded file formats (`Vectors`, `PNG`, `Photos`, `Videos`).
   - **Title**: Standard text input (`#title-input`).
   - **Keywords**: Tagging chip component supporting comma-separated inputs (min. 5, max. 50 tags).
   - **AI-Generated Content**: Checkbox trigger revealing AI generator model selector (`Midjourney`, `Stable Diffusion`, `DALL-E`, `Other`). Selecting **"Other"** displays an extra text input (`input#undefined-input`) to type the specific generator name (e.g., `Flux.1`, `Adobe Firefly`, `Leonardo.ai`, `Ideogram`).
   - **Releases**: Model & Property release management.
3. **Saving & Submission**:
   - **Save Changes**: `div[data-testid="save-changes-icon"]` (saves draft).
   - **Submit for Review**: `button[data-testid="submit-button"]` (submits selected assets for moderation).

---

## 2. Precise DOM Selector Map (Validated Selectors)

| Form Component | Primary Selector (`data-testid` / ID) | Fallback Selector | Element Type & Notes |
| :--- | :--- | :--- | :--- |
| **1. Resource Card Container** | `div[data-testid="resource-card"]` | `div.sc-dhNZpn` | Container for each uploaded asset card |
| **2. Asset Thumbnail** | `div[data-testid="resource-card-preview"] img` | `div[data-testid="resource-card"] img` | Preview `<img>` (used for LLM Vision processing) |
| **3. Select All Button** | `div[data-testid="filter-bar"] button:has-text("Select all")` | `button:has-text("Select all")` | Selects all cards in the batch |
| **4. Deselect All Button** | `div[data-testid="filter-bar"] button:has-text("Deselect all")` | `button:has-text("Deselect all")` | Deselects all cards |
| **5. License Radio Group** | `div[data-testid="radio-group"]` | `section div[data-testid="input-wrapper"]` | Radio container for license types |
| **6. Pro License Radio** | `label[data-testid="radio-input"]:has-text("Pro") input` | `input[value="Pro"]` | Sets license to Pro (Paid Premium) |
| **7. Free License Radio** | `label[data-testid="radio-input"]:has-text("Free") input` | `input[value="Free"]` | Sets license to Free (Attribution/Revenue share) |
| **8. Editorial License Radio** | `label[data-testid="radio-input"]:has-text("Editorial") input` | `input[value="Editorial"]` | Sets license to Editorial non-commercial |
| **9. Category Input Field** | `div[data-testid="category-input"] input` | `input[placeholder="Select Category"]` | MUI Autocomplete input (**Auto-selected based on file type**) |
| **10. Title Input Field** | `input#title-input` | `input[name="title"]` | Text input for asset title |
| **11. Keyword Tag Input** | `div[data-testid="tagger-input"] input` | `input.sc-bFqpvU.sc-idvBfp` | Text input for adding keyword tags |
| **12. Active Tags List** | `ul[data-testid="tags-list"]` | `div[data-testid="tagger-input"] ul` | Wrapper `<ul>` containing active tag chips |
| **13. Tag Chip** | `div[data-testid="tag"]` | `ul[data-testid="tags-list"] li div` | Individual keyword tag chip |
| **14. Tag Remove Icon** | `svg[data-testid="tag-remove"]` | `div[data-testid="tag"] svg` | Remove icon to delete an individual tag chip |
| **15. AI-Generated Checkbox** | `div[data-testid="ai-generated-section"] input[type="checkbox"]` | `span[data-testid="checkbox-no-label"] input` | Checkbox marking asset as AI generated |
| **16. AI Tool Dropdown Item** | `li[data-value="midjourney"], li[data-value="other"]` | `ul.MuiMenu-list li` | Option elements for AI generator model |
| **17. AI Custom Tool Text Input**| `input#undefined-input` | `div[data-testid="ai-generated-section"] input[type="text"]` | Text input for custom AI generator name (when "Other" is chosen) |
| **18. Prohibited Terms Modal** | `div[data-testid="prohibited-terms-modal"]` | `div.sc-hLznAM` | Warning modal when banned terms are entered |
| **19. Close Prohibited Modal** | `div[data-testid="modal-actions"] button` | `button:has-text("Close")` | Button to dismiss prohibited terms warning |
| **20. Save Changes Button** | `div[data-testid="save-changes-icon"]` | `div.sc-bTuCdP` | Draft save icon button in top toolbar |
| **21. Submit for Review Button**| `button[data-testid="submit-button"]` | `button:has-text("Submit")` | Primary submission button |

---

## 3. Category System: Automatic Filetype Detection

On Vecteezy Contributor, the **Category** field (`div[data-testid="category-input"]`) represents the **Asset Content Format / Media Type**, not subject matter themes. Vecteezy **automatically detects and selects the category upon upload** based on the file extension and MIME type:

| Uploaded File Type / Extension | Auto-Assigned Category | Description & Behavior |
| :--- | :---: | :--- |
| `.ai`, `.eps`, `.svg` | **Vectors** | Automatically assigned to vector graphics. |
| `.png` (transparent background) | **PNG** | Automatically assigned to transparent PNG cutouts and clipart. |
| `.jpg`, `.jpeg` | **Photos** | Automatically assigned to photography and raster images. |
| `.mp4`, `.mov` | **Videos** | Automatically assigned to video footage and motion clips. |

> [!NOTE]
> Because Vecteezy handles Category assignment 100% automatically during file ingestion, the browser extension **does not need to manually fill or override the category field**.

---

## 4. License Types: Pro vs Free vs Editorial

| License Tier | Description | Requirements & Restrictions |
| :--- | :--- | :--- |
| **Pro (Premium)** | Paid content available exclusively to Vecteezy Pro subscribers. | Standard commercial terms. Model/property releases required if recognizable people/private property exist. |
| **Free (Standard)** | Free tier accessible to all users with attribution or ad revenue share. | Commercial use allowed. Model/property releases required if applicable. |
| **Editorial** | Non-commercial journalistic content depicting real-world news, events, logos, or public figures. | No model release needed. Factual title and location/event context required. |

---

## 5. Prohibited Terms Filter & Auto-Sanitization

Vecteezy employs an automated **Prohibited Terms validation filter**. If contributors input non-descriptive generic keywords or filetype descriptors in the Title or Keywords, Vecteezy triggers `div[data-testid="prohibited-terms-modal"]` (*"Warning: Prohibited Term(s)"*):

### Common Prohibited / Banned Words on Vecteezy:
- **File formats & media types**: `vector`, `vectors`, `eps`, `svg`, `jpg`, `png`, `video`, `footage`, `photo`, `image`, `images`, `clipart`, `illustration`, `graphics`.
- **Generic quality buzzwords**: `isolated`, `white background`, `transparent`, `high quality`, `best`, `popular`.
- **Special characters**: Punctuation symbols (other than hyphens or commas as delimiters) like `[`, `]`, `{`, `}`, `*`, `#`, `@`.

### Automatic Sanitization Rule for Extension:
Before injecting Title and Keywords, sanitize the input:
```javascript
export function sanitizeVecteezyText(text) {
  const bannedRegex = /\b(vector|vectors|eps|svg|jpg|png|video|footage|photo|image|images|clipart|illustration|isolated|high quality)\b/gi;
  return text
    .replace(bannedRegex, "")
    .replace(/[\[\]{}*#@]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
```

---

## 6. Keywords Management & Tag Chips

1. **Tag Count**: Minimum **5 keywords**, Maximum **50 keywords**.
2. **Format**: Comma-separated (`tag1, tag2, tag3,`).
3. **Chip Removal / Clear Existing**:
   - To clear individual tags, click `svg[data-testid="tag-remove"]` on each chip in `ul[data-testid="tags-list"]`.
   - To clear all tags programmatically:
     ```javascript
     export function clearAllVecteezyTags() {
       const removeButtons = document.querySelectorAll('svg[data-testid="tag-remove"]');
       removeButtons.forEach(btn => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
     }
     ```

---

## 7. AI-Generated Content Workflow & Custom Tool Specification

When an asset is created using Generative AI:
1. Check the AI checkbox: `div[data-testid="ai-generated-section"] input[type="checkbox"]`.
2. A dropdown list opens. Select the generator model:
   - **Midjourney**: `li[data-value="midjourney"]`
   - **Stable Diffusion**: `li[data-value="stable_diffusion"]`
   - **DALL-E**: `li[data-value="dall_e"]`
   - **Other**: `li[data-value="other"]`
3. **When "Other" is Selected**:
   - A secondary text input (`input#undefined-input` or `div[data-testid="ai-generated-section"] input.MuiInputBase-input[type="text"]`) immediately appears below the dropdown.
   - The contributor / extension can type any custom AI generator model name (e.g., `Flux.1`, `Adobe Firefly`, `Leonardo.ai`, `Ideogram`, `ComfyUI`).

```javascript
/**
 * Sets AI Generated status and specifies custom AI generator tool name
 */
export async function setAiGenerator(isAi, toolName = "Midjourney") {
  const aiCheckbox = document.querySelector('div[data-testid="ai-generated-section"] input[type="checkbox"]');
  if (!aiCheckbox) return;

  if (aiCheckbox.checked !== Boolean(isAi)) {
    aiCheckbox.click();
    await new Promise(r => setTimeout(r, 150));
  }

  if (isAi) {
    const knownTools = ["midjourney", "stable_diffusion", "dall_e"];
    const lowerTool = toolName.toLowerCase().replace(/[\s-]/g, "_");
    
    if (knownTools.includes(lowerTool)) {
      const option = document.querySelector(`li[data-value="${lowerTool}"]`);
      if (option) option.click();
    } else {
      // Choose "Other"
      const otherOption = document.querySelector('li[data-value="other"]');
      if (otherOption) {
        otherOption.click();
        await new Promise(r => setTimeout(r, 100));
        
        // Fill custom tool name in text input
        const customToolInput = document.querySelector('input#undefined-input, div[data-testid="ai-generated-section"] input[type="text"]');
        if (customToolInput) {
          setReactInputValue(customToolInput, toolName);
        }
      }
    }
  }
}
```

---

## 8. React Event Dispatcher & Form Automation Mechanism

Vecteezy components are React controlled components. Updating input values requires native prototype setter dispatching:

```javascript
/**
 * Injects value into React input or textarea
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

## 9. Complete Vecteezy Adapter Implementation (`VecteezyAdapter.js`)

```javascript
export class VecteezyAdapter {
  static isMatch(url) {
    return url.includes("contributors.vecteezy.com");
  }

  /**
   * Retrieves all resource cards from the grid
   */
  static getResourceCards() {
    return Array.from(document.querySelectorAll('div[data-testid="resource-card"]'));
  }

  /**
   * Gets thumbnail image URL from a resource card
   */
  static getThumbnailUrl(cardElement) {
    const img = cardElement.querySelector('div[data-testid="resource-card-preview"] img, img');
    return img ? img.src : null;
  }

  /**
   * Selects a card to open its editor in the sidebar
   */
  static selectCard(cardElement) {
    cardElement.click();
  }

  /**
   * Clears all existing keyword chips
   */
  static clearKeywords() {
    const removeButtons = document.querySelectorAll('svg[data-testid="tag-remove"]');
    removeButtons.forEach(btn => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  }

  /**
   * Sanitizes title and keywords to avoid Prohibited Terms modal
   */
  static sanitizeText(text) {
    const bannedRegex = /\b(vector|vectors|eps|svg|jpg|png|video|footage|photo|image|images|clipart|illustration|isolated)\b/gi;
    return text.replace(bannedRegex, "").replace(/[\[\]{}*#@]/g, "").replace(/\s{2,}/g, " ").trim();
  }

  /**
   * Fills all metadata fields in the Vecteezy sidebar editor
   */
  static async fillMetadata({
    title,
    license = "Pro", // "Pro", "Free", or "Editorial"
    keywords = [],
    isAiGenerated = false,
    aiModel = "Midjourney", // "Midjourney", "Stable Diffusion", "DALL-E", or custom like "Flux.1", "Adobe Firefly"
    clearExisting = true
  }) {
    // 1. Dismiss Prohibited Modal if already open
    const closeProhibitedBtn = document.querySelector('div[data-testid="modal-actions"] button, div[data-testid="prohibited-terms-modal"] button');
    if (closeProhibitedBtn) closeProhibitedBtn.click();

    // 2. Set License Type Radio
    const licenseRadio = document.querySelector(`label[data-testid="radio-input"]:has-text("${license}") input, input[value="${license}"]`);
    if (licenseRadio && !licenseRadio.checked) {
      licenseRadio.click();
    }

    // 3. Fill Title (Sanitized)
    const titleInput = document.querySelector("#title-input, input[name='title']");
    if (titleInput && title) {
      const cleanTitle = this.sanitizeText(title).slice(0, 100);
      setReactInputValue(titleInput, cleanTitle);
    }

    // 4. Clear Old Keywords if requested
    if (clearExisting) {
      this.clearKeywords();
      await new Promise(r => setTimeout(r, 80));
    }

    // 5. Inject Keywords (Comma-separated into Tagger Input)
    if (keywords && keywords.length > 0) {
      const kwInput = document.querySelector('div[data-testid="tagger-input"] input');
      if (kwInput) {
        kwInput.focus();
        const cleanTags = (Array.isArray(keywords) ? keywords : keywords.split(","))
          .map(k => this.sanitizeText(k.trim()))
          .filter(k => k.length > 1)
          .slice(0, 50);

        for (const tag of cleanTags) {
          setReactInputValue(kwInput, tag);
          kwInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
          await new Promise(r => setTimeout(r, 30));
        }
      }
    }

    // 6. Set AI-Generated Content Checkbox & Model
    const aiCheckbox = document.querySelector('div[data-testid="ai-generated-section"] input[type="checkbox"]');
    if (aiCheckbox && aiCheckbox.checked !== Boolean(isAiGenerated)) {
      aiCheckbox.click();
      await new Promise(r => setTimeout(r, 150));
    }

    if (isAiGenerated && aiModel) {
      const known = ["midjourney", "stable_diffusion", "dall_e"];
      const lower = aiModel.toLowerCase().replace(/[\s-]/g, "_");
      
      if (known.includes(lower)) {
        const option = document.querySelector(`li[data-value="${lower}"]`);
        if (option) option.click();
      } else {
        // Select 'Other' and fill text input
        const otherOption = document.querySelector('li[data-value="other"]');
        if (otherOption) {
          otherOption.click();
          await new Promise(r => setTimeout(r, 100));
          
          const customToolInput = document.querySelector('input#undefined-input, div[data-testid="ai-generated-section"] input[type="text"]');
          if (customToolInput) {
            setReactInputValue(customToolInput, aiModel);
          }
        }
      }
    }
  }

  /**
   * Saves metadata changes as draft
   */
  static saveDraft() {
    const saveIcon = document.querySelector('div[data-testid="save-changes-icon"]');
    if (saveIcon) {
      saveIcon.click();
      return true;
    }
    return false;
  }

  /**
   * Submits selected assets for moderation review
   */
  static submitForReview() {
    const submitBtn = document.querySelector('button[data-testid="submit-button"]');
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
      return true;
    }
    return false;
  }
}
```
