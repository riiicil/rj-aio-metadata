# Complete Analysis: Adobe Stock Contributor DOM Structure, Selectors & Form Fields
**Technical Documentation of Extracted DOM Recording for Microstock AIO Metadata Browser Extension**  
*Source Recording File: `rekaman-adobestock-20260901_225753.json` (1,211 DOM Events & 143 User Actions)*  
*Analysis Date: September 1, 2026*

---

## 1. Session Summary & Adobe Stock Form Architecture

Adobe Stock Contributor uses a **Single Page Application (SPA)** architecture built on **React** with the **Adobe Spectrum Design System**. All form interactions are managed via *React Controlled Components* featuring highly stable `data-t` (*data-test*) identifier attributes.

### Workflow on the Upload / Tagger Page:
1. **Asset Grid (`div.upload-tile`)**: User selects one or multiple image/vector/video asset cards.
2. **Right Form Panel (`div.mobile-tagger-details`)**: Displays all metadata fields:
   - **File Type / Media Type**: Photos, Illustrations, Vectors, Videos.
   - **Category**: Dropdown of 21 standard Adobe Stock categories.
   - **Illustrative Editorial**: Checkbox for illustrative editorial assets.
   - **Generative AI & Property Release**: Checkboxes for AI-generated content.
   - **Recognizable People or Property**: Yes / No switch.
   - **Title Language (Title & Keywords Language)**: Language selection dropdown (English, 日本語, Deutsch, etc.).
   - **Title**: Textarea with a maximum of 200 characters.
   - **Keywords / Tags**: Textarea accepting comma-separated tags (up to 49-50 tags max).
3. **Saving**: Clicking the **"Save work"** button (`POST /en/indexation/save?m=1`) or **"Submit for moderation"**.

---

## 2. Precise DOM Selector Map (Validated Selectors)

Below is the complete list of all extracted form element selectors:

| Form Component | Primary Selector (Data Attribute / ID) | Fallback Selector (CSS Fallback) | Element Type & Notes |
| :--- | :--- | :--- | :--- |
| **1. File Type / Media Type** | `div[data-t="content-tagger-file-type-wrapper"]` | `div.content-tagger__file-type` | Container picker for file types (Photos, Illustrations, Vectors) |
| **2. Category Dropdown** | `button[data-t="content-tagger-category-select"]` | `select[name="category"]`, `div[data-t="content-tagger-category-wrapper"]` | Spectrum Dropdown (21 numeric category IDs) |
| **3. Refresh Auto Category** | `button[data-t="refresh-auto-category"]` | `button[aria-label="Refresh Category"]` | Reset auto-category button powered by Adobe AI |
| **4. Illustrative Editorial Checkbox** | `input[data-t="content-tagger-illustrative-editorial-checkbox"]` | `div[data-t="content-tagger-illustrative-editorial"] input[type="checkbox"]` | Checkbox for illustrative editorial content |
| **5. Title & Keywords Language** | `button[data-t="content-tagger-keywords-language-select"]` | `select[name="language"]`, `div[data-t="content-tagger-keywords-language-wrapper"]` | Metadata language dropdown (English = `1`, 日本語 = `9`, etc.) |
| **6. Title Input** | `textarea[data-t="asset-title-content-tagger"]` | `textarea[name="title"]`, `div.mobile-tagger-details textarea` | `<textarea>` (Max 200 characters) |
| **7. Keywords Input (Tags)** | `#content-keywords-ui-textarea` | `textarea[data-t="content-keywords-ui-textarea"]`, `textarea[name="keywordsUITextArea"]` | `<textarea>` (Accepts comma-separated tag strings) |
| **8. Trigger Paste Keywords** | `div:has-text("Paste Keywords...")` | `[data-t="paste-keywords-button"]` | Button/div triggering the paste keywords area |
| **9. Remaining Tags Counter** | `div.margin-bottom-xsmall span.grey.dove-text` | `span:has-text("Remaining keywords:")` | Tag quota indicator (e.g., "Remaining keywords: 42") |
| **10. Generative AI Checkbox** | `#content-tagger-generative-ai-checkbox` | `input[name="content-tagger-generative-ai-checkbox"]` | Checkbox for AI-generated assets |
| **11. AI Property Release Checkbox** | `#content-tagger-generative-ai-property-release-checkbox` | `input[name="content-tagger-generative-ai-property-release-checkbox"]` | Checkbox for property/people releases on AI assets |
| **12. Releases Switch (Yes/No)** | `input[name="hasReleases"]` | `label.switch.switch--button input[name="hasReleases"]` | Model/property release switch (value: `yes` / `no`) |
| **13. Asset Card / Grid Tile** | `div.upload-tile` | `div[data-t="upload-tile"]`, `div.upload-tile__wrapper` | Asset item card container |
| **14. Asset Image Thumbnail** | `img.upload-tile__thumbnail` | `div.upload-tile img` | `<img>` thumbnail source URL to fetch for LLM Vision |
| **15. Asset Selection Checkbox** | `div.upload-tile input[type="checkbox"]` | `div.upload-tile label input` | Multi-select asset checkbox in grid |
| **16. Save Work Button** | `button[data-t="save-work"]` | `button.button.button--action:has-text("Save work")` | Saves metadata draft |
| **17. Submit Moderation Button** | `button[data-t="submit-moderation-button"]` | `button.button.button--action.green-600-background` | Submits assets to Adobe moderators |

---

## 3. Complete List of 21 Adobe Stock Categories (Category Key Mapping)

Adobe Stock uses numeric values (`data-key` / `value`) for each category:

| Category ID | Category Name (English) | Description & Focus | Relevant Keywords |
| :---: | :--- | :--- | :--- |
| **`10001`** | **Animals** | Animals & Wildlife | Wildlife, pets, dogs, cats, birds, insects |
| **`10092`** | **Buildings and Architecture** | Buildings & Architecture | Houses, skyscrapers, interior, exterior, city |
| **`10162`** | **Business** | Business & Finance | Office, corporate, finance, meeting, startup |
| **`10209`** | **Drinks** | Beverages & Drinks | Coffee, tea, cocktails, beer, juice, bar |
| **`10235`** | **The Environment** | Environment & Ecology | Ecology, recycling, green energy, climate |
| **`10255`** | **States of Mind** | Emotions & Feelings | Happiness, sadness, stress, contemplation |
| **`10283`** | **Food** | Food & Culinary | Cooking, restaurant, meal, fruit, vegetables |
| **`10432`** | **Graphic Resources** | Graphic Resources | Backgrounds, textures, patterns, banners |
| **`10486`** | **Hobbies and Leisure** | Hobbies & Leisure | Gaming, crafts, music, reading, camping |
| **`10556`** | **Industry** | Industry & Manufacturing | Factory, construction, engineering, oil |
| **`10584`** | **Landscapes** | Natural Landscapes | Mountains, beach, sunset, forest, sky |
| **`10631`** | **Lifestyle** | Lifestyle & Living | Family, home, wellness, daily life, leisure |
| **`10683`** | **People** | People & Portraits | Portraits, diverse groups, children, elders |
| **`10733`** | **Plants and Flowers** | Plants & Botanical | Trees, floral, garden, leaves, botanical |
| **`10778`** | **Culture and Religion** | Culture & Religion | Festivals, holidays, traditional art, church |
| **`10797`** | **Science** | Science & Laboratory | Chemistry, space, medicine, research |
| **`10834`** | **Social Issues** | Social Issues & Society | Poverty, protests, politics, healthcare |
| **`10868`** | **Sports** | Sports & Fitness | Football, fitness, gym, running, athletics |
| **`10927`** | **Technology** | Technology & Computers | AI, software, internet, gadgets, hardware |
| **`10958`** | **Transport** | Transportation & Vehicles | Cars, airplanes, trains, ships, roads |
| **`10988`** | **Travel** | Travel & Tourism | Vacation, tourism, landmarks, luggage |

---

## 4. Title & Keywords Language Mapping

Adobe Stock stores metadata language preferences in `select[name="language"]`:

| Data Key / Value | Language | Display Label |
| :---: | :--- | :--- |
| **`1`** | **English** (Default) | English |
| **`2`** | **Deutsch** | Deutsch |
| **`4`** | **Français** | Français |
| **`5`** | **Español** | Español |
| **`6`** | **Italiano** | Italiano |
| **`7`** | **Português** | Português |
| **`9`** | **日本語** | 日本語 |
| **`10`** | **한국어** | 한국어 |
| **`14`** | **繁體中文** | 繁體中文 |

---

## 5. File Type & Asset Format Logic (Auto-Detection)

The extension detects the asset type from the original filename or extension:
- **Photos (`photo` / `1`)**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic` (non-vector/illustration photographic images).
- **Illustrations (`illustration` / `2`)**: Digital raster artworks / 3D renders (`.jpg`, `.png`).
- **Vectors (`vector` / `3`)**: Vector files `.ai`, `.eps`, `.svg` (Adobe Stock automatically marks them as Vectors).
- **Videos (`video` / `4`)**: Video files `.mp4`, `.mov`.

---

## 6. Value Injection Mechanism for React (Event Dispatcher)

Because Adobe Stock forms use React Controlled Components, updating a field value requires calling the *native prototype setter* and dispatching `input`, `change`, and `blur` events:

```javascript
/**
 * Injects value into React input/textarea triggering internal state update
 */
export function setReactInputValue(element, value) {
  if (!element) return;

  const prototype = element instanceof HTMLTextAreaElement 
    ? window.HTMLTextAreaElement.prototype 
    : (element instanceof HTMLSelectElement 
        ? window.HTMLSelectElement.prototype 
        : window.HTMLInputElement.prototype);

  const nativeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (nativeValueSetter) {
    nativeValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}
```

---

## 7. Complete Adobe Stock Adapter Template (`AdobeStockAdapter.js`)

```javascript
export class AdobeStockAdapter {
  static isMatch(url) {
    return url.includes('contributor.stock.adobe.com');
  }

  /**
   * Retrieves asset item cards from the upload grid
   */
  static getUploadTiles() {
    return Array.from(document.querySelectorAll('div.upload-tile, div[data-t="upload-tile"]'));
  }

  /**
   * Retrieves image thumbnail URL from an asset tile
   */
  static getThumbnailUrl(tileElement) {
    const img = tileElement.querySelector('img.upload-tile__thumbnail');
    return img ? img.src : null;
  }

  /**
   * Fills all metadata fields in the Adobe Stock tagger panel
   */
  static fillMetadata({
    title,
    keywords = [],
    categoryId = null,
    isIllustrativeEditorial = false,
    isAiGenerated = false,
    hasReleases = false,
    languageId = "1"
  }) {
    // 1. Fill Title (Max 200 characters)
    const titleInput = document.querySelector('textarea[data-t="asset-title-content-tagger"], textarea[name="title"]');
    if (titleInput && title) {
      setReactInputValue(titleInput, title.slice(0, 200));
    }

    // 2. Fill Keywords (Comma-separated string)
    const keywordsInput = document.querySelector('#content-keywords-ui-textarea, textarea[name="keywordsUITextArea"]');
    if (keywordsInput && keywords && keywords.length > 0) {
      const keywordsString = Array.isArray(keywords) ? keywords.slice(0, 49).join(', ') : keywords;
      setReactInputValue(keywordsInput, keywordsString);
    }

    // 3. Set Category (Based on Category ID 10001 - 10988)
    if (categoryId) {
      const categorySelect = document.querySelector('select[name="category"]');
      if (categorySelect) {
        setReactInputValue(categorySelect, String(categoryId));
      }
    }

    // 4. Set Illustrative Editorial Checkbox
    const editorialCheckbox = document.querySelector('input[data-t="content-tagger-illustrative-editorial-checkbox"]');
    if (editorialCheckbox && editorialCheckbox.checked !== Boolean(isIllustrativeEditorial)) {
      editorialCheckbox.click();
    }

    // 5. Set Generative AI Checkbox
    const aiCheckbox = document.querySelector('#content-tagger-generative-ai-checkbox');
    if (aiCheckbox && aiCheckbox.checked !== Boolean(isAiGenerated)) {
      aiCheckbox.click();
    }

    // 6. Set Recognizable People/Property Releases Switch
    const releaseRadio = document.querySelector(`input[name="hasReleases"][value="${hasReleases ? 'yes' : 'no'}"]`);
    if (releaseRadio && !releaseRadio.checked) {
      releaseRadio.click();
    }

    // 7. Set Language (Default 1: English)
    const langSelect = document.querySelector('select[name="language"]');
    if (langSelect && languageId) {
      setReactInputValue(langSelect, String(languageId));
    }
  }

  /**
   * Clicks the save draft metadata button
   */
  static saveWork() {
    const saveBtn = document.querySelector('button[data-t="save-work"], button.button--action:has-text("Save work")');
    if (saveBtn && !saveBtn.disabled) {
      saveBtn.click();
      return true;
    }
    return false;
  }
}
```

---

## 8. Recorded Adobe Stock Backend API Endpoints

- **`POST /en/indexation/save?m=1`**: Main endpoint called when "Save work" is clicked to persist Title, Keywords, Category, Releases, and Editorial flags.
- **`POST /en/sensei/generative-art`**: Adobe Sensei Generative AI validation/detection endpoint.
- **`POST /en/user/keywords/language`**: Endpoint saving user metadata language preferences.
