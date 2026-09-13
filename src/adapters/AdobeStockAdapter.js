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
import { logger } from '../services/LoggerService.js';
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
  fr: '2',
  french: '2',
  français: '2',
  '2': '2',
  de: '4',
  german: '4',
  deutsch: '4',
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
  '14': '14'
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

    (this.logger || logger).info(
      `Card selection confirmed: ${active ? 'OK' : 'Unconfirmed (Proceeding)'}`
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
   * Operates strictly by invariant numeric ID (data-key/value) without relying on UI labels,
   * and manages scrollbar container positioning to prevent zoom/overflow clipping.
   *
   * @private
   */
  async _setSpectrumOrNativeDropdown({ buttonSelector, selectSelector, targetKey }) {
    if (typeof document === 'undefined') return false;

    const stringTargetKey = String(targetKey);

    // 1. Check and set native select strictly by target option value ID
    const nativeSelect = document.querySelector(selectSelector);
    if (nativeSelect) {
      let matchedOpt = null;
      if (nativeSelect.options && Array.isArray(Array.from(nativeSelect.options))) {
        for (const opt of Array.from(nativeSelect.options)) {
          if (String(opt.value) === stringTargetKey) {
            matchedOpt = opt;
            break;
          }
        }
      }

      if (matchedOpt) {
        nativeSelect.selectedIndex = matchedOpt.index;
        setNativeValue(nativeSelect, matchedOpt.value);
      } else {
        setNativeValue(nativeSelect, stringTargetKey);
      }
    }

    // 2. React Spectrum Button Dropdown
    const triggerBtn = document.querySelector(buttonSelector);
    if (triggerBtn) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const isExpanded = triggerBtn.getAttribute?.('aria-expanded') === 'true';
        if (!isExpanded) {
          simulateClick(triggerBtn);
          await sleep(250);
        }

        // Find listbox container
        const listbox = document.querySelector('div[role="listbox"], .spectrum-Menu, [role="listbox"]');
        let optionEl = listbox
          ? listbox.querySelector(`[role="option"][data-key="${stringTargetKey}"], [data-key="${stringTargetKey}"], [id$="-option-${stringTargetKey}"]`)
          : document.querySelector(`div[role="option"][data-key="${stringTargetKey}"], [role="option"][data-key="${stringTargetKey}"]`);

        // If listbox has scrollbar and optionEl is not immediately in DOM (e.g. virtualized), scan by scrolling
        if (listbox && !optionEl && listbox.scrollHeight > listbox.clientHeight) {
          const maxScroll = listbox.scrollHeight - listbox.clientHeight;
          const step = Math.max(50, Math.floor(listbox.clientHeight * 0.7));
          for (let pos = 0; pos <= maxScroll && !optionEl; pos += step) {
            listbox.scrollTop = pos;
            await sleep(100);
            optionEl = listbox.querySelector(`[role="option"][data-key="${stringTargetKey}"], [data-key="${stringTargetKey}"], [id$="-option-${stringTargetKey}"]`);
          }
        }

        if (optionEl) {
          // Scroll listbox container to vertically center the target option (prevents boundary clipping across zoom levels)
          if (listbox && listbox.scrollHeight > listbox.clientHeight) {
            const optionTop = optionEl.offsetTop;
            const optionHeight = optionEl.offsetHeight || 32;
            const listboxHeight = listbox.clientHeight;
            listbox.scrollTop = Math.max(0, optionTop - (listboxHeight / 2) + (optionHeight / 2));
            await sleep(100);
          }

          if (typeof optionEl.scrollIntoView === 'function') {
            try {
              optionEl.scrollIntoView({ block: 'center', behavior: 'instant' });
            } catch {
              // Ignore scroll errors in mock environments
            }
          }
          await sleep(150);

          // Click target: prefer inner item label/grid if present, fallback to optionEl
          const clickTarget = optionEl.querySelector?.('.spectrum-Menu-itemLabel, .spectrum-Menu-itemGrid, span') || optionEl;
          simulateClick(clickTarget);
          if (clickTarget !== optionEl) {
            simulateClick(optionEl);
          }

          // Keyboard Enter navigation fallback
          if (typeof optionEl.focus === 'function') {
            try {
              optionEl.focus();
              simulateEnterKey(optionEl);
            } catch {
              // Ignore focus errors
            }
          }

          await sleep(350);
          return true;
        }

        // Close dropdown before retry attempt if still expanded
        if (triggerBtn.getAttribute?.('aria-expanded') === 'true') {
          simulateClick(triggerBtn);
          await sleep(150);
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

    // 1. Category (Sequential Step 1: Adobe Spectrum 21 numeric category IDs)
    const categoryVal = metadata.categoryId || metadata.category;
    const resolvedCat = resolveAdobeCategory(categoryVal);

    if (resolvedCat) {
      (this.logger || logger).step('category', `${resolvedCat.name} (${resolvedCat.id})`);
      await this._setSpectrumOrNativeDropdown({
        buttonSelector: 'button[data-t="content-tagger-category-select"], div[data-t="content-tagger-category-wrapper"] button',
        selectSelector: 'select[name="category"], select[data-t="content-tagger-category-select"]',
        targetKey: resolvedCat.id
      });
      await sleep(800);
    }

    // 2. Generative AI Declaration / Property Release or Non-AI Releases Switch (Sequential Step 2: Kondisional)
    const isAi = Boolean(options.isAiGenerated);
    const aiCheckbox = document.querySelector(
      '#content-tagger-generative-ai-checkbox, input[name="content-tagger-generative-ai-checkbox"], input[data-t="content-tagger-generative-ai-checkbox"]'
    );

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
      (this.logger || logger).step('Generative AI', isAi ? 'Checked' : 'Unchecked');
      await sleep(300);
    }

    // For Non-AI assets: Set 'Recognizable people or property?' to 'No'
    if (!isAi) {
      const noReleaseRadio = document.querySelector(
        'input[data-t="has-release-no"], input[name="hasReleases"][value="no"]'
      );
      if (noReleaseRadio) {
        if (!noReleaseRadio.checked) {
          const clickTarget = noReleaseRadio.parentElement?.querySelector?.('label, .switch__body') || noReleaseRadio;
          simulateClick(clickTarget);
          if (clickTarget !== noReleaseRadio) simulateClick(noReleaseRadio);
          try {
            noReleaseRadio.checked = true;
            noReleaseRadio.dispatchEvent(new Event('change', { bubbles: true }));
          } catch {
            // Ignore dispatch errors
          }
          (this.logger || logger).step('Recognizable people or property', 'No');
          await sleep(300);
        }
      } else {
        // Fallback: search within elements mentioning Recognizable people or property
        const candidateContainers = Array.from(document.querySelectorAll('div, fieldset, section')).filter(el =>
          el.querySelector?.('input[name="hasReleases"]') ||
          (el.textContent && el.textContent.includes('Recognizable people or property'))
        );
        for (const container of candidateContainers) {
          const noBtn = Array.from(container.querySelectorAll('label, span, button')).find(
            b => b.textContent?.trim() === 'No'
          );
          if (noBtn) {
            simulateClick(noBtn);
            (this.logger || logger).step('Recognizable people or property', 'No (container match)');
            await sleep(300);
            break;
          }
        }
      }
    }
    await sleep(500);

    // Commercial Mode Guard (Ensure illustrative editorial is NOT checked)
    const editorialCheckbox = document.querySelector(
      'input[data-t="content-tagger-illustrative-editorial-checkbox"], div[data-t="content-tagger-illustrative-editorial"] input[type="checkbox"]'
    );
    if (editorialCheckbox && editorialCheckbox.checked) {
      editorialCheckbox.click();
      await sleep(300);
    }

    // 3. Metadata Language Dropdown (Sequential Step 3)
    const rawLang = options.language || options.languageId;
    if (rawLang !== undefined && rawLang !== null) {
      const normalizedLangKey = String(rawLang).toLowerCase().trim();
      const mappedLangId = ADOBE_LANGUAGE_MAP[normalizedLangKey] || String(rawLang);

      (this.logger || logger).step('language dropdown', mappedLangId);
      await this._setSpectrumOrNativeDropdown({
        buttonSelector: 'button[data-t="content-tagger-keywords-language-select"], div[data-t="content-tagger-keywords-language-wrapper"] button',
        selectSelector: 'select[name="language"], select[data-t="content-tagger-keywords-language-select"]',
        targetKey: mappedLangId
      });
      await sleep(500);
    }

    // 4. Title (Sequential Step 4: Hapus title lama jika ada -> isi title baru)
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
        (this.logger || logger).step('title', cleanTitle);
        setNativeValue(titleEl, cleanTitle);
        await sleep(500);
      }
    }

    // 5. Keywords (Sequential Step 5: Hapus keyword lama jika ada -> isi keyword baru)
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
        (this.logger || logger).step(`${tagList.length} keywords`, kwString.slice(0, 60) + '...');
        setNativeValue(kwEl, kwString);
        await sleep(500);
      }
    }

    return true;
  }

  /**
   * Helper to strictly find the Save Work button, explicitly avoiding the Submit button.
   * @private
   */
  _findSaveWorkButton() {
    if (typeof document === 'undefined') return null;

    // 1. Direct attribute match
    const directSaveBtn = document.querySelector('button[data-t="save-work"]');
    if (directSaveBtn && !directSaveBtn.disabled) return directSaveBtn;

    // 2. Filter buttons strictly matching 'Save work' or 'Save' text, excluding 'submit'
    const candidateButtons = Array.from(document.querySelectorAll('button'));
    return candidateButtons.find((btn) => {
      const dataT = (btn.getAttribute('data-t') || '').toLowerCase();
      if (dataT.includes('submit')) return false;

      const txt = (btn.textContent || '').trim().toLowerCase();
      return (txt === 'save work' || txt === 'save') && !btn.disabled;
    }) || null;
  }

  /**
   * Saves draft for currently selected asset.
   * @returns {Promise<boolean>}
   */
  async saveDraft() {
    if (typeof document === 'undefined') return true;
    const saveBtn = this._findSaveWorkButton();
    if (saveBtn) {
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
      if (noReleaseRadio) {
        if (!noReleaseRadio.checked) {
          const clickTarget = noReleaseRadio.parentElement?.querySelector?.('label, .switch__body') || noReleaseRadio;
          simulateClick(clickTarget);
          if (clickTarget !== noReleaseRadio) simulateClick(noReleaseRadio);
          try {
            noReleaseRadio.checked = true;
            noReleaseRadio.dispatchEvent(new Event('change', { bubbles: true }));
          } catch {
            // Ignore dispatch errors
          }
          await sleep(500);
        }
      }
    }

    // 3. Save work button (Strictly Save work, NEVER Submit)
    let saveBtn = null;
    for (let i = 0; i < 6; i++) {
      saveBtn = this._findSaveWorkButton();
      if (saveBtn) break;
      await sleep(500);
    }

    if (saveBtn) {
      simulateClick(saveBtn);
      (this.logger || logger).success('Bulk save executed successfully');
      await sleep(1000);
      return true;
    }

    return true;
  }
}
