# Complete Analysis: Depositphotos Contributor DOM Structure, Selectors & Form Fields
**Technical Documentation of Extracted DOM Recording for Microstock AIO Metadata Browser Extension**  
*Source Recording Files:*  
- *Session 1: `rekaman-depositphotos-20260902_133340.json` (455 DOM Events & 112 User Actions — Photos Flow)*  
- *Session 2: `rekaman-depositphotos-20260902_133426.json` (176 DOM Events & 49 User Actions — Vectors Flow)*  
- *Session 3: `rekaman-depositphotos-20260902_133506.json` (186 DOM Events & 53 User Actions — Keywords / Spellcheck Flow)*  
- *Session 4: `rekaman-depositphotos-20260902_133532.json` (150 DOM Events & 44 User Actions — Video & Editorial Flow)*  
- *Session 5: `rekaman-depositphotos-20260902_140846.json` (294 DOM Events & 4 User Actions — Paginator & 160 Capacity Flow)*  
*Analysis Date: September 2, 2026*

---

## 1. Executive Summary & Depositphotos Architecture

Depositphotos Contributor manages unsubmitted files on `https://depositphotos.com/files/unfinished.html`. The page features a multi-file editor panel (`div.itemeditor`) allowing batch or single-item metadata editing, combined with file type tabs and a high-capacity paginator supporting up to **160 items per page**.

### Key Workflow Highlights:
1. **File Type Navigation (Query Param Routing)**:
   - **Photos / Images**: `https://depositphotos.com/files/unfinished.html?type=image` (or default)
   - **Vectors**: `https://depositphotos.com/files/unfinished.html?type=vector`
   - **Footage / Videos**: `https://depositphotos.com/files/unfinished.html?type=video`
   - **Audio**: `https://depositphotos.com/files/unfinished.html?type=audio`
2. **High-Capacity Paginator (`select._paginator__list`)**:
   - Contributors can configure items per page: `24`, `40`, `80`, or **`160 per page`**. Setting it to `160` allows bulk AI auto-tagging across massive batches.
   - **Select All Checkbox**: `th.unfinished__action i.select-all` selects all loaded items on the active page.
3. **Pre-Existing Metadata Clearing**:
   - Depositphotos provides dedicated reset icons for each field:
     - Clear Title: `a._itemeditor__reset_title`
     - Clear Description: `a._itemeditor__reset_description`
     - Clear Keywords: `a._itemeditor__reset_keywords`
4. **Metadata Form Fields (`div.itemeditor`)**:
   - **Description**: `textarea.itemeditor__input_description` (English only, descriptive).
   - **Keywords / Tags**: `div.tagseditor` supporting raw paste trigger `span.paste_editor__tag`, individual tag remove buttons `i.tagseditor__remove`, and spellcheck warning tags `span.tagseditor__item_misspell`.
   - **Nudity / Mature**: Dropdown `select._itemeditor__value_is_nudity` (`0` = No, `1` = Yes).
   - **Editorial**: Dropdown `select._itemeditor__value_is_editorial` (`0` = No, `1` = Yes). When set to `Yes`, dependent dropdowns for **Country** (`select._itemeditor__value_location_country_code`) and **City** (`select._itemeditor__value_location_city_id`) are activated.
5. **Action Buttons**:
   - **Save Changes**: `button._cp__action_save` (saves metadata to draft).
   - **Submit Selected**: `button._cp__action_submit` (sends checked assets to curation).

---

## 2. Precise DOM Selector Map (Validated Selectors)

| Form Component | Primary Selector (Class / ID) | Fallback Selector | Element Type & Notes |
| :--- | :--- | :--- | :--- |
| **1. File Row / Item Container** | `tr.unfinished__item` | `tbody > tr` | Container row for each uploaded item |
| **2. Item Checkbox** | `td.unfinished__action label.checkbox-wrapper i` | `i.checkbox-bicon` | Checkbox selecting an individual file row |
| **3. Select All Checkbox** | `th.unfinished__action i.select-all` | `i.checkbox-bicon.select-all` | Selects all 160 files on current page |
| **4. Paginator Items Per Page** | `select._paginator__list` | `select.paginator__list` | Dropdown setting page capacity (`24`, `40`, `80`, `160`) |
| **5. Description Textarea** | `textarea.itemeditor__input_description` | `textarea._itemeditor__value_description` | `<textarea>` for asset description/title |
| **6. Clear Description Button**| `a._itemeditor__reset_description` | `div.itemeditor__field a.itemeditor__reset` | Icon button clearing existing description |
| **7. Clear Title Button** | `a._itemeditor__reset_title` | `div.itemeditor__field a.itemeditor__reset` | Icon button clearing existing title |
| **8. Clear Keywords Button** | `a._itemeditor__reset_keywords` | `div.itemeditor__field a.itemeditor__reset` | Icon button clearing all existing tags |
| **9. Keyword Paste Trigger** | `span.paste_editor__tag` | `div.tagseditor span.paste_editor__tag` | Trigger activating raw multi-tag paste box |
| **10. Keyword Tag Items** | `span.tagseditor__item` | `div.tagseditor span.tagseditor__item` | Individual tag chip elements |
| **11. Misspelled Tag Warning** | `span.tagseditor__item_misspell` | `span.tagseditor__item.tagseditor__item_misspell` | Tag chips flagged with spelling errors |
| **12. Remove Tag Button** | `i.tagseditor__remove` | `span.tagseditor__item i.tagseditor__remove` | Remove icon on an individual keyword chip |
| **13. Copy Keywords Button** | `a._itemeditor__action_copy` | `a.itemeditor__copy` | Copies current tags to clipboard |
| **14. Nudity / Mature Select** | `select._itemeditor__value_is_nudity` | `div._itemeditor__field_is_nudity select` | Dropdown (`0`: No, `1`: Yes) |
| **15. Editorial Select** | `select._itemeditor__value_is_editorial` | `div._itemeditor__field_is_editorial select` | Dropdown (`0`: No, `1`: Yes) |
| **16. Country Select (Editorial)**| `select._itemeditor__value_location_country_code` | `div.itemeditor__row_country_select select` | Country dropdown (visible when Editorial=Yes) |
| **17. City Select (Editorial)** | `select._itemeditor__value_location_city_id` | `div.itemeditor__row_city_select select` | City dropdown (visible when Editorial=Yes) |
| **18. Save Draft Button** | `button._cp__action_save` | `button.save.white` | Saves draft changes to current item(s) |
| **19. Submit Selected Button** | `button._cp__action_submit` | `button.submit-selected.blue` | Submits checked files for moderator review |

---

## 3. Metadata Fields & Tagging Rules

### A. Description (Title)
- **Field**: `textarea.itemeditor__input_description`.
- **Requirements**: Minimum 5 words, written in English.
- **Clearing**: Click `a._itemeditor__reset_description` to purge old IPTC captions.

### B. Keywords Management (`div.tagseditor`)
- **Quantity**: Minimum **7 keywords**, Maximum **50 keywords**.
- **Delimiter**: Comma or space separated.
- **Fast Tag Injection via `span.paste_editor__tag`**:
  - Clicking `span.paste_editor__tag` mounts an editable tag field. Injecting comma-separated keywords and triggering `Enter` parses all tags into chips instantly.
- **Misspelled Tag Removal**:
  - Depositphotos flags unrecognized or misspelled tags with `.tagseditor__item_misspell`. The extension can auto-remove them or approve them.

### C. Nudity & Editorial Flags
- **Nudity**: Default is `No` (`value="0"`). Set to `Yes` (`value="1"`) for adult/mature content.
- **Editorial**: Default is `No` (`value="0"`). If set to `Yes` (`value="1"`), Depositphotos requires selecting the **Country** (`select._itemeditor__value_location_country_code`).

---

## 4. Batch Automation & Paginator Capacity (160 Items)

Depositphotos supports processing up to **160 items in a single batch**:
1. **Set Page Capacity to 160**:
   ```javascript
   export function setPaginator160() {
     const paginator = document.querySelector('select._paginator__list');
     if (paginator && paginator.value !== '160') {
       paginator.value = '160';
       paginator.dispatchEvent(new Event('change', { bubbles: true }));
     }
   }
   ```
2. **Select All Items**:
   ```javascript
   export function selectAllItems() {
     const selectAllBtn = document.querySelector('th.unfinished__action i.select-all');
     if (selectAllBtn) selectAllBtn.click();
   }
   ```

---

## 5. Form Automation & Native Dispatcher Guide

Depositphotos uses jQuery and native DOM inputs:

```javascript
/**
 * Injects value into text input/textarea with full event dispatching
 */
export function setInputValue(element, value) {
  if (!element) return;
  element.focus();
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}
```

---

## 6. Complete Depositphotos Adapter Implementation (`DepositphotosAdapter.js`)

```javascript
export class DepositphotosAdapter {
  static isMatch(url) {
    return url.includes("depositphotos.com/files/unfinished.html");
  }

  /**
   * Sets paginator to maximum capacity (160 items per page)
   */
  static setMaxPaginatorCapacity() {
    const paginator = document.querySelector('select._paginator__list, select.paginator__list');
    if (paginator && paginator.value !== '160') {
      paginator.value = '160';
      paginator.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * Selects all items on current page
   */
  static selectAll() {
    const selectAllBtn = document.querySelector('th.unfinished__action i.select-all, i.checkbox-bicon.select-all');
    if (selectAllBtn) selectAllBtn.click();
  }

  /**
   * Clears pre-existing metadata fields
   */
  static clearExistingMetadata() {
    const resetDesc = document.querySelector('a._itemeditor__reset_description');
    if (resetDesc) resetDesc.click();

    const resetKeywords = document.querySelector('a._itemeditor__reset_keywords');
    if (resetKeywords) resetKeywords.click();

    const resetTitle = document.querySelector('a._itemeditor__reset_title');
    if (resetTitle) resetTitle.click();
  }

  /**
   * Fills metadata for the active/selected file in Depositphotos editor
   */
  static async fillMetadata({
    description,
    keywords = [],
    isNudity = false,
    isEditorial = false,
    countryCode = "", // e.g. "US", "ID", "GB"
    clearExisting = true
  }) {
    // 1. Clear existing metadata if requested
    if (clearExisting) {
      this.clearExistingMetadata();
      await new Promise(r => setTimeout(r, 60));
    }

    // 2. Fill Description
    const descTextarea = document.querySelector('textarea.itemeditor__input_description, textarea._itemeditor__value_description');
    if (descTextarea && description) {
      setInputValue(descTextarea, description.trim());
    }

    // 3. Inject Keywords via Paste Trigger
    if (keywords && keywords.length > 0) {
      const pasteTrigger = document.querySelector('span.paste_editor__tag');
      if (pasteTrigger) {
        pasteTrigger.click();
        await new Promise(r => setTimeout(r, 80));

        const activeTagInput = document.querySelector('div.itemeditor__field_focused span.tagseditor__tag, div.tagseditor input');
        if (activeTagInput) {
          const cleanTags = (Array.isArray(keywords) ? keywords : keywords.split(','))
            .map(k => k.trim())
            .filter(k => k.length > 1)
            .slice(0, 50)
            .join(', ');

          activeTagInput.textContent = cleanTags;
          activeTagInput.dispatchEvent(new Event('input', { bubbles: true }));
          activeTagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        }
      }
    }

    // 4. Set Nudity / Mature Select
    const nuditySelect = document.querySelector('select._itemeditor__value_is_nudity');
    if (nuditySelect) {
      nuditySelect.value = isNudity ? '1' : '0';
      nuditySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 5. Set Editorial Select
    const editorialSelect = document.querySelector('select._itemeditor__value_is_editorial');
    if (editorialSelect) {
      editorialSelect.value = isEditorial ? '1' : '0';
      editorialSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 100));

      // If Editorial is Yes, select Country
      if (isEditorial && countryCode) {
        const countrySelect = document.querySelector('select._itemeditor__value_location_country_code');
        if (countrySelect) {
          countrySelect.value = countryCode;
          countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  }

  /**
   * Saves draft metadata changes
   */
  static saveDraft() {
    const saveBtn = document.querySelector('button._cp__action_save, button.save.white');
    if (saveBtn) {
      saveBtn.click();
      return true;
    }
    return false;
  }

  /**
   * Submits selected items for review
   */
  static submitSelected() {
    const submitBtn = document.querySelector('button._cp__action_submit, button.submit-selected.blue');
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
      return true;
    }
    return false;
  }
}
```
