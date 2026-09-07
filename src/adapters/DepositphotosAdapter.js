/**
 * DepositphotosAdapter — Platform Adapter for Depositphotos Contributor
 *
 * Implements BaseAdapter interface for Depositphotos (depositphotos.com/files/unfinished.html):
 * - URL matching for depositphotos.com/files/unfinished.html.
 * - Row-by-row table card extraction (tr.unfinished__item).
 * - Thumbnail extraction (tr.unfinished__item img, extractThumbnailUrl).
 * - Row selection: clicks row or checkbox (td.unfinished__action label.checkbox-wrapper i).
 * - Editor readiness wait (textarea.itemeditor__input_description).
 * - Description clearing (a._itemeditor__reset_description) and single-string instant injection.
 * - Keywords clearing (a._itemeditor__reset_keywords, i.tagseditor__remove).
 * - Fast Tag Injection: clicks trigger span.paste_editor__tag, injects comma-separated keywords, dispatches Enter.
 * - Editorial & Country Location: select._itemeditor__value_is_editorial ('1' vs '0') and country code.
 * - Nudity / Mature content dropdown (select._itemeditor__value_is_nudity).
 * - Paginator capacity helper (select._paginator__list -> '160').
 * - Bulk Save Strategy: clicks table header select all (th.unfinished__action i.select-all) -> wait 200ms -> button._cp__action_save.
 * - Submit for review: clicks button._cp__action_submit.
 */

import { BaseAdapter } from './BaseAdapter.js';
import {
  setNativeValue,
  waitForElement,
  simulateClick,
  simulateEnterKey,
  extractThumbnailUrl,
  sleep
} from './utils/dom_helpers.js';

export class DepositphotosAdapter extends BaseAdapter {
  constructor() {
    super('depositphotos', 'Depositphotos');
  }

  /**
   * Matches Depositphotos contributor unfinished files page.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return url.includes('depositphotos.com/files/unfinished.html') || url.includes('depositphotos.com/files/unfinished');
  }

  /**
   * Scans and retrieves all item table rows in the unfinished files list.
   * @returns {HTMLElement[]} Array of row elements.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('tr.unfinished__item'));
  }

  /**
   * Extracts the thumbnail image URL from an item table row.
   * @param {HTMLElement} cardElement - Item table row element.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      'tr.unfinished__item img, .unfinished__thumb img, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an item row or checks its action checkbox to open its editor.
   * @param {HTMLElement} cardElement - Item row element.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    const checkbox = cardElement.querySelector?.(
      'td.unfinished__action label.checkbox-wrapper i, td.unfinished__action i, i.checkbox-bicon'
    );
    if (checkbox) {
      simulateClick(checkbox);
    } else {
      simulateClick(cardElement);
    }
  }

  /**
   * Waits for the editor sidebar/form to become interactive.
   * @param {HTMLElement} [cardElement=null] - Selected item element.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    try {
      await waitForElement(
        'textarea.itemeditor__input_description',
        typeof document !== 'undefined' ? document : null,
        timeoutMs
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears old metadata fields (description, keywords, title) prior to injection.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    // 1. Clear Description
    const resetDesc = document.querySelector('a._itemeditor__reset_description');
    if (resetDesc) {
      simulateClick(resetDesc);
    } else {
      const descTextarea = document.querySelector(
        'textarea.itemeditor__input_description, textarea._itemeditor__value_description'
      );
      if (descTextarea) setNativeValue(descTextarea, '');
    }

    // 2. Clear Keywords
    const resetKeywords = document.querySelector('a._itemeditor__reset_keywords');
    if (resetKeywords) {
      simulateClick(resetKeywords);
    }

    // 3. Clear Title if present
    const resetTitle = document.querySelector('a._itemeditor__reset_title');
    if (resetTitle) {
      simulateClick(resetTitle);
    }

    await sleep(60);
    return true;
  }

  /**
   * Clears keyword tags.
   * @returns {Promise<boolean>}
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;

    const resetKeywords = document.querySelector('a._itemeditor__reset_keywords');
    if (resetKeywords) {
      simulateClick(resetKeywords);
    } else {
      const removeIcons = Array.from(document.querySelectorAll('i.tagseditor__remove'));
      for (const icon of removeIcons) {
        simulateClick(icon);
      }
    }
    return true;
  }

  /**
   * Injects sanitized metadata into Depositphotos item editor.
   * - Description (English, min 5 words): single-string instant injection.
   * - Keywords (7-50 tags): fast tag injection via paste trigger span.paste_editor__tag + Enter.
   * - Editorial & Country Location: selects editorial '1' vs '0', country code.
   * - Nudity / Mature: selects '1' vs '0'.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (isEditorial, editorialCountry, isNudity, clearExisting).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    if (options.clearExisting !== false) {
      await this.clearMetadata();
    }

    // 1. Description: Single-string instant injection into textarea
    const descTextarea = document.querySelector(
      'textarea.itemeditor__input_description, textarea._itemeditor__value_description'
    );
    if (descTextarea && metadata.description) {
      setNativeValue(descTextarea, metadata.description.trim());
    }

    // 2. Keywords: Fast Tag Injection via paste trigger
    if (metadata.keywords && metadata.keywords.length > 0) {
      const pasteTrigger = document.querySelector(
        'span.paste_editor__tag, div.tagseditor span.paste_editor__tag'
      );
      if (pasteTrigger) {
        simulateClick(pasteTrigger);
        await sleep(80);
      }

      const activeTagInput = document.querySelector(
        'div.itemeditor__field_focused span.tagseditor__tag, div.tagseditor input, div.tagseditor textarea, input.tagseditor__input, span.tagseditor__tag'
      );

      if (activeTagInput) {
        const rawKeywords = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',');

        const cleanTags = rawKeywords
          .map((k) => (typeof k === 'string' ? k.trim() : ''))
          .filter((k) => k.length > 0)
          .slice(0, 50)
          .join(', ');

        setNativeValue(activeTagInput, cleanTags);
        simulateEnterKey(activeTagInput);
      }
    }

    // 3. Editorial & Country Location
    const editorialSelect = document.querySelector(
      'select._itemeditor__value_is_editorial, div._itemeditor__field_is_editorial select'
    );
    if (editorialSelect) {
      const isEditorial = Boolean(options.isEditorial || options.licenseType === 'editorial');
      editorialSelect.value = isEditorial ? '1' : '0';
      editorialSelect.dispatchEvent(new Event('change', { bubbles: true }));

      if (isEditorial) {
        await sleep(100);
        const countryCode = options.editorialCountry || options.countryCode || 'US';
        const countrySelect = document.querySelector(
          'select._itemeditor__value_location_country_code, div.itemeditor__row_country_select select'
        );
        if (countrySelect) {
          countrySelect.value = countryCode;
          countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    // 4. Nudity / Mature Content
    const nuditySelect = document.querySelector(
      'select._itemeditor__value_is_nudity, div._itemeditor__field_is_nudity select'
    );
    if (nuditySelect) {
      nuditySelect.value = options.isNudity ? '1' : '0';
      nuditySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return true;
  }

  /**
   * Helper to set paginator capacity dropdown (e.g. '160').
   * @param {string|number} [capacity='160'] - Target capacity.
   * @returns {boolean} True if changed.
   */
  setPaginatorCapacity(capacity = '160') {
    if (typeof document === 'undefined') return false;

    const paginator = document.querySelector('select._paginator__list, select.paginator__list');
    if (paginator && paginator.value !== String(capacity)) {
      paginator.value = String(capacity);
      paginator.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  /**
   * Bulk Save Strategy: Selects all table items then clicks control panel Save button.
   * @returns {Promise<boolean>} True if bulk save executed.
   */
  async bulkSave() {
    if (typeof document === 'undefined') return false;

    // 1. Click table header "Select all" checkbox
    const selectAllBtn = document.querySelector(
      'th.unfinished__action i.select-all, i.checkbox-bicon.select-all'
    );
    if (selectAllBtn) {
      simulateClick(selectAllBtn);
    }

    await sleep(200);

    // 2. Click control panel Save button
    const saveBtn = document.querySelector('button._cp__action_save, button.save.white');
    if (saveBtn) {
      simulateClick(saveBtn);
      return true;
    }

    return false;
  }

  /**
   * Saves draft metadata changes.
   * @returns {Promise<boolean>} True if saved.
   */
  async saveDraft() {
    return this.bulkSave();
  }

  /**
   * Submits checked items for review.
   * @returns {Promise<boolean>} True if submitted.
   */
  async submitForReview() {
    if (typeof document === 'undefined') return false;

    const submitBtn = document.querySelector(
      'button._cp__action_submit, button.submit-selected.blue'
    );
    if (submitBtn && !submitBtn.disabled) {
      simulateClick(submitBtn);
      return true;
    }
    return false;
  }
}
