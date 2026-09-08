/**
 * AdobeStockAdapter — Platform Adapter for Adobe Stock Contributor
 *
 * Implements BaseAdapter interface for Adobe Stock (contributor.stock.adobe.com / stock.adobe.com).
 * - React Spectrum controlled input value injection via native prototype setter and dropdown popover interactions.
 * - Commercial mode only (illustrative editorial unchecked / omitted).
 * - 21 numeric category IDs (10001 - 10988).
 * - Generative AI declaration + fictional people/property release checkboxes.
 * - Language selection mapping (English '1', German '2', French '4', Spanish '5', Italian '6', Portuguese '7', Japanese '9', Polish '10', Korean '14' / '10', Chinese '14').
 * - Title (max 200 chars) & Keywords (comma-separated, max 49 tags).
 * - Bulk save strategy: Select All -> Releases to "no" (if non-AI) -> Save work.
 */

import { BaseAdapter } from './BaseAdapter.js';
import {
  setNativeValue,
  waitForElement,
  simulateClick,
  extractThumbnailUrl,
  sleep
} from './utils/dom_helpers.js';

/**
 * Official Adobe Stock 21 numeric category IDs
 */
export const ADOBE_CATEGORIES = {
  10001: 'Animals',
  10092: 'Buildings and Architecture',
  10162: 'Business',
  10209: 'Drinks',
  10235: 'The Environment',
  10255: 'States of Mind',
  10283: 'Food',
  10432: 'Graphic Resources',
  10486: 'Hobbies and Leisure',
  10556: 'Industry',
  10584: 'Landscapes',
  10631: 'Lifestyle',
  10683: 'People',
  10733: 'Plants and Flowers',
  10778: 'Culture and Religion',
  10797: 'Science',
  10834: 'Social Issues',
  10868: 'Sports',
  10927: 'Technology',
  10958: 'Transport',
  10988: 'Travel'
};

/**
 * Maps input string or numeric ID to an official Adobe category ID and label.
 * @param {string|number} catOrId - Category name or numeric ID
 * @returns {{ id: string, name: string }|null}
 */
export function resolveAdobeCategory(catOrId) {
  if (!catOrId) return null;
  const str = String(catOrId).trim();

  // 1. Direct match by numeric ID
  if (ADOBE_CATEGORIES[str]) {
    return { id: str, name: ADOBE_CATEGORIES[str] };
  }

  // 2. Match by exact or partial name (case-insensitive)
  const lower = str.toLowerCase();
  for (const [id, name] of Object.entries(ADOBE_CATEGORIES)) {
    const nameLower = name.toLowerCase();
    if (nameLower === lower || nameLower.includes(lower) || lower.includes(nameLower)) {
      return { id, name };
    }
  }

  return null;
}

/**
 * Adobe Stock language dropdown mapping
 */
export const ADOBE_LANGUAGE_MAP = {
  en: '1',
  english: '1',
  '1': '1',
  de: '2',
  german: '2',
  deutsch: '2',
  '2': '2',
  fr: '4',
  french: '4',
  français: '4',
  '4': '4',
  es: '5',
  spanish: '5',
  español: '5',
  '5': '5',
  it: '6',
  italian: '6',
  italiano: '6',
  '6': '6',
  pt: '7',
  portuguese: '7',
  português: '7',
  '7': '7',
  ja: '9',
  japanese: '9',
  '日本語': '9',
  '9': '9',
  pl: '10',
  polish: '10',
  polski: '10',
  '10': '10',
  ko: '14',
  korean: '14',
  '한국': '14',
  '한국어': '14',
  '14': '14',
  zh: '14',
  chinese: '14'
};

export class AdobeStockAdapter extends BaseAdapter {
  constructor() {
    super('adobestock', 'Adobe Stock');
  }

  /**
   * Matches Adobe Stock contributor URLs.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return url.includes('contributor.stock.adobe.com') || url.includes('stock.adobe.com');
  }

  /**
   * Scans and retrieves distinct upload grid cards without duplicate nested matches.
   * @returns {HTMLElement[]} Array of asset card elements.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];

    const container = document.querySelector('div.content-grid[data-t="assets-content-grid"]');
    if (container) {
      const cards = Array.from(container.querySelectorAll('div.content-grid-elements'));
      if (cards.length > 0) return cards;
    }

    const gridElements = Array.from(document.querySelectorAll('div.content-grid-elements'));
    if (gridElements.length > 0) return gridElements;

    // Fallback: distinct upload tiles (filter out nested elements to prevent duplicate counts)
    const tiles = Array.from(document.querySelectorAll('div.upload-tile, div[data-t="upload-tile"]'));
    return tiles.filter((el, idx, arr) => !arr.some(other => other !== el && typeof other?.contains === 'function' && other.contains(el)));
  }

  /**
   * Extracts the thumbnail image URL from an asset card.
   * @param {HTMLElement} cardElement - Asset card element.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.('img.upload-tile__thumbnail, div.upload-tile img, img');
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an asset card in the grid to display its metadata editor.
   * Targets .upload-tile [role="option"], polls for aria-selected="true" confirmation.
   *
   * @param {HTMLElement} cardElement - Card element to select.
   * @returns {Promise<boolean>} True if selection confirmed.
   */
  async selectCard(cardElement) {
    if (!cardElement) return false;

    try {
      if (typeof cardElement.scrollIntoView === 'function') {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch {
      // Ignore scroll errors
    }

    const uploadTile = cardElement.querySelector?.('.upload-tile [role="option"]')
      || cardElement.querySelector?.('[role="option"]')
      || cardElement;

    // Only click uploadTile if not already selected
    const isAlreadySelected = uploadTile?.getAttribute?.('aria-selected') === 'true';
    if (!isAlreadySelected && uploadTile) {
      simulateClick(uploadTile);
      await sleep(400);
    } else if (!uploadTile) {
      simulateClick(cardElement);
      await sleep(400);
    }

    // Poll up to 6 times (total ~1200ms) verifying aria-selected === 'true'
    let active = false;
    for (let i = 0; i < 6; i++) {
      const currentTile = cardElement.querySelector?.('.upload-tile [role="option"]')
        || cardElement.querySelector?.('[role="option"]');
      if (currentTile && currentTile.getAttribute('aria-selected') === 'true') {
        active = true;
        break;
      }
      await sleep(200);
    }

    if (!active && uploadTile) {
      // Retry click once if not yet active
      simulateClick(uploadTile);
      await sleep(400);
      const currentTile = cardElement.querySelector?.('.upload-tile [role="option"]')
        || cardElement.querySelector?.('[role="option"]');
      active = currentTile?.getAttribute?.('aria-selected') === 'true';
    }

    console.log(
      '%c[RJ AIO Metadata] Card selection confirmed: %s',
      'color: #079183;',
      active ? 'OK' : 'Unconfirmed (Proceeding)'
    );

    await sleep(300);
    return active;
  }

  /**
   * Waits for the tagger editor form to become interactive with a settle buffer.
   * @param {HTMLElement} [cardElement=null] - Selected asset card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    try {
      await waitForElement(
        'textarea[data-t="asset-title-content-tagger"], div.mobile-tagger-details, textarea[name="title"]',
        typeof document !== 'undefined' ? document : null,
        timeoutMs
      );
      // Settle buffer for React state synchronization
      await sleep(500);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears old metadata fields (title, keywords) prior to new injection.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    const titleEl = document.querySelector(
      'textarea[data-t="asset-title-content-tagger"], textarea[name="title"]'
    );
    if (titleEl) {
      setNativeValue(titleEl, '');
    }

    const kwEl = document.querySelector(
      '#content-keywords-ui-textarea, textarea[name="keywordsUITextArea"], textarea[data-t="content-keywords-ui-textarea"]'
    );
    if (kwEl) {
      setNativeValue(kwEl, '');
    }

    return true;
  }

  /**
   * Helper to set either Adobe React Spectrum custom dropdown button or fallback native select.
   * @private
   */
  async _setSpectrumOrNativeDropdown({ buttonSelector, selectSelector, targetKey, targetText, altKeys = [] }) {
    if (typeof document === 'undefined') return false;

    // 1. Check and set native select first if present
    const nativeSelect = document.querySelector(selectSelector);
    if (nativeSelect) {
      const keysToMatch = [String(targetKey), ...altKeys.map(String)];
      let matchedOpt = null;

      if (nativeSelect.options && Array.isArray(Array.from(nativeSelect.options))) {
        for (const opt of Array.from(nativeSelect.options)) {
          if (keysToMatch.includes(String(opt.value))) {
            matchedOpt = opt;
            break;
          }
          if (targetText && (opt.text?.trim().toLowerCase() === targetText.toLowerCase() || opt.text?.trim().toLowerCase().includes(targetText.toLowerCase()))) {
            matchedOpt = opt;
            break;
          }
        }
      }

      if (matchedOpt) {
        nativeSelect.selectedIndex = matchedOpt.index;
        setNativeValue(nativeSelect, matchedOpt.value);
      } else {
        setNativeValue(nativeSelect, String(targetKey));
      }
    }

    // 2. React Spectrum Button Dropdown
    const triggerBtn = document.querySelector(buttonSelector);
    if (triggerBtn) {
      const btnText = (triggerBtn.textContent || '').trim();
      if (targetText && btnText.toLowerCase().includes(targetText.toLowerCase())) {
        return true; // Already selected
      }

      for (let attempt = 1; attempt <= 3; attempt++) {
        const isExpanded = triggerBtn.getAttribute?.('aria-expanded') === 'true';
        if (!isExpanded) {
          simulateClick(triggerBtn);
          await new Promise(r => setTimeout(r, 250));
        }

        const keysToMatch = [String(targetKey), ...altKeys.map(String)];
        let optionEl = null;

        for (const k of keysToMatch) {
          optionEl = document.querySelector(`div[role="option"][data-key="${k}"], li[role="option"][data-key="${k}"], [role="option"][data-key="${k}"]`);
          if (optionEl) break;
        }

        if (!optionEl && targetText) {
          const allOptions = Array.from(document.querySelectorAll('div[role="option"], li[role="option"], .spectrum-Menu-item'));
          optionEl = allOptions.find(el => {
            const t = (el.textContent || '').trim().toLowerCase();
            return t === targetText.toLowerCase() || t.includes(targetText.toLowerCase());
          });
        }

        if (optionEl) {
          simulateClick(optionEl);
          await new Promise(r => setTimeout(r, 350));
          return true;
        }

        if (triggerBtn.getAttribute?.('aria-expanded') === 'true') {
          simulateClick(triggerBtn);
          await new Promise(r => setTimeout(r, 150));
        }
      }
    }

    return true;
  }

  /**
   * Injects sanitized metadata into Adobe Stock tagger form.
   * Commercial mode only.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (isAiGenerated, language, etc.).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    // 1. Metadata Language Dropdown (Sequential Step 1)
    const rawLang = options.language || options.languageId;
    if (rawLang !== undefined && rawLang !== null) {
      const normalizedLangKey = String(rawLang).toLowerCase().trim();
      const mappedLangId = ADOBE_LANGUAGE_MAP[normalizedLangKey] || String(rawLang);
      const isKorean = normalizedLangKey === 'ko' || normalizedLangKey === 'korean';
      const targetText = isKorean ? '한국' : (mappedLangId === '1' ? 'English' : null);
      const altKeys = isKorean ? ['14', '10'] : [];

      console.log('%c[RJ AIO Metadata] Setting language dropdown: %s', 'color: #079183;', targetText || mappedLangId);
      await this._setSpectrumOrNativeDropdown({
        buttonSelector: 'button[data-t="content-tagger-keywords-language-select"], div[data-t="content-tagger-keywords-language-wrapper"] button',
        selectSelector: 'select[name="language"], select[data-t="content-tagger-keywords-language-select"]',
        targetKey: mappedLangId,
        targetText,
        altKeys
      });
      await sleep(500);
    }

    // 2. Category (Sequential Step 2: Adobe Spectrum 21 numeric category IDs: 10001 - 10988)
    const categoryVal = metadata.categoryId || metadata.category;
    const resolvedCat = resolveAdobeCategory(categoryVal);

    if (resolvedCat) {
      console.log('%c[RJ AIO Metadata] Setting category: %s (%s)', 'color: #079183;', resolvedCat.name, resolvedCat.id);
      await this._setSpectrumOrNativeDropdown({
        buttonSelector: 'button[data-t="content-tagger-category-select"], div[data-t="content-tagger-category-wrapper"] button',
        selectSelector: 'select[name="category"], select[data-t="content-tagger-category-select"]',
        targetKey: resolvedCat.id,
        targetText: resolvedCat.name
      });
      await sleep(800);
    }

    // 3. Generative AI Declaration & Fictional Property Release Checkbox (Sequential Step 3)
    const aiCheckbox = document.querySelector(
      '#content-tagger-generative-ai-checkbox, input[name="content-tagger-generative-ai-checkbox"], input[data-t="content-tagger-generative-ai-checkbox"]'
    );
    const isAi = Boolean(options.isAiGenerated);

    if (aiCheckbox) {
      if (isAi && !aiCheckbox.checked) {
        aiCheckbox.click();
        await sleep(300);
      } else if (!isAi && aiCheckbox.checked) {
        aiCheckbox.click();
        await sleep(300);
      }

      if (isAi) {
        const propCheckbox = document.querySelector(
          '#content-tagger-generative-ai-property-release-checkbox, input[name="content-tagger-generative-ai-property-release-checkbox"], input[data-t="content-tagger-generative-ai-property-release-checkbox"]'
        );
        if (propCheckbox && !propCheckbox.checked) {
          propCheckbox.click();
          await sleep(300);
        }
      }
      console.log('%c[RJ AIO Metadata] Setting Generative AI: %s', 'color: #079183;', isAi ? 'Checked' : 'Unchecked');
      await sleep(500);
    }

    // 4. Commercial Mode Guard (Ensure illustrative editorial is NOT checked)
    const editorialCheckbox = document.querySelector(
      'input[data-t="content-tagger-illustrative-editorial-checkbox"], div[data-t="content-tagger-illustrative-editorial"] input[type="checkbox"]'
    );
    if (editorialCheckbox && editorialCheckbox.checked) {
      editorialCheckbox.click();
      await sleep(300);
    }

    // 5. Title (Sequential Step 4: Clear existing if present -> type clean title)
    if (metadata.title) {
      const titleEl = document.querySelector(
        'textarea[data-t="asset-title-content-tagger"], textarea[name="title"], div.mobile-tagger-details textarea'
      );
      if (titleEl) {
        if (titleEl.value && String(titleEl.value).trim()) {
          setNativeValue(titleEl, '');
          await sleep(200);
        }
        const cleanTitle = String(metadata.title).slice(0, 200);
        console.log('%c[RJ AIO Metadata] Setting title: %s', 'color: #079183;', cleanTitle);
        setNativeValue(titleEl, cleanTitle);
        await sleep(500);
      }
    }

    // 6. Keywords (Sequential Step 5: Clear existing if present -> type comma-separated keywords)
    if (metadata.keywords) {
      const kwEl = document.querySelector(
        '#content-keywords-ui-textarea, textarea[name="keywordsUITextArea"], textarea[data-t="content-keywords-ui-textarea"]'
      );
      if (kwEl) {
        if (kwEl.value && String(kwEl.value).trim()) {
          setNativeValue(kwEl, '');
          await sleep(200);
        }
        const tagList = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',').map((t) => t.trim()).filter(Boolean);
        const kwString = tagList.slice(0, 49).join(', ');
        console.log('%c[RJ AIO Metadata] Setting %d keywords: %s', 'color: #079183;', tagList.length, kwString.slice(0, 60) + '...');
        setNativeValue(kwEl, kwString);
        await sleep(500);
      }
    }

    return true;
  }

  /**
   * Saves draft for currently selected asset.
   * @returns {Promise<boolean>}
   */
  async saveDraft() {
    if (typeof document === 'undefined') return true;
    const saveBtn = document.querySelector('button[data-t="save-work"], button.button--action');
    if (saveBtn && !saveBtn.disabled) {
      simulateClick(saveBtn);
      return true;
    }
    return false;
  }

  /**
   * Bulk save strategy:
   * 1. Select All checkbox clicked.
   * 2. If non-AI (isAiGenerated === false), set releases switch to "no".
   * 3. Click "Save work" button.
   *
   * @param {boolean} [isAiGenerated=false] - Whether assets are AI generated.
   * @returns {Promise<boolean>} True if bulk save triggered.
   */
  async bulkSave(isAiGenerated = false) {
    if (typeof document === 'undefined') return true;

    // 1. Select All
    const selectAllText = Array.from(document.querySelectorAll('div.text-sregular.margin-left-xsmall.left'))
      .find(el => el.textContent.trim() === 'Select All');

    if (selectAllText) {
      const icon = selectAllText.previousElementSibling;
      if (icon && icon.classList.contains('icon-checkbox-inactive')) {
        simulateClick(icon);
        await sleep(500);
      }
    } else {
      const selectAllCheckbox = document.querySelector(
        'input[data-t="select-all-checkbox"], div.upload-tile__select-all input, div.content-tagger__select-all input'
      );
      if (selectAllCheckbox && !selectAllCheckbox.checked) {
        simulateClick(selectAllCheckbox);
        await sleep(500);
      }
    }
    await sleep(1000);

    // 2. Releases switch to "no" (for non-AI assets)
    if (!isAiGenerated) {
      const noReleaseRadio = document.querySelector('input[data-t="has-release-no"], input[name="hasReleases"][value="no"]');
      if (noReleaseRadio && !noReleaseRadio.checked) {
        simulateClick(noReleaseRadio);
        await sleep(500);
      }
    }

    // 3. Save work button
    const saveBtn = document.querySelector('button[data-t="save-work"], button.button--action');
    if (saveBtn && !saveBtn.disabled) {
      simulateClick(saveBtn);
      console.log('%c[RJ AIO Metadata] Bulk save executed successfully', 'color: #59d499; font-weight: bold;');
      await sleep(1000);
      return true;
    }

    return true;
  }
}
