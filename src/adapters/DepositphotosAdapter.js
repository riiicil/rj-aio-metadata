/**
 * DepositphotosAdapter — Platform Adapter for Depositphotos Contributor
 *
 * Implements BaseAdapter interface for Depositphotos (depositphotos.com/files/unfinished.html):
 * - URL matching for depositphotos.com/files/unfinished.html.
 * - Multi-item list card extraction (.itemslist > div.itemeditor, tr.unfinished__item).
 * - Thumbnail extraction (img.itemeditor__thumb, .itemeditor__thumbwrap img).
 * - Row selection: tracks activeCard and selects checkbox (.itemeditor__checkboxcell).
 * - Progressive scroll & editor readiness: scrollIntoView, waits for .itemeditor_stub removal.
 * - Granular condition-checked clearing: description (a._itemeditor__reset_description.itemeditor__reset_active) and keywords (a._itemeditor__reset_keywords.itemeditor__reset_active).
 * - Card-scoped metadata injection: description, keywords (span.paste_editor__tag), editorial ('yes'/'no'), country code, nudity.
 * - Paginator capacity helper (select._paginator__list -> '160').
 * - Bulk Save Strategy: to-top button (i.to-top-bicon) -> table header select all (i.checkbox-bicon.select-all) -> button._cp__action_save.
 * - Submit for review: clicks button._cp__action_submit.
 * - Full LoggerService integration.
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
import { logger } from '../services/LoggerService.js';

export class DepositphotosAdapter extends BaseAdapter {
  constructor() {
    super('depositphotos', 'Depositphotos');
    this.activeCard = null;
    this.logger = logger;
  }

  /**
   * Matches Depositphotos contributor unfinished files page.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return (
      url.includes('depositphotos.com/files/unfinished.html') ||
      url.includes('depositphotos.com/files/unfinished')
    );
  }

  /**
   * Scans and retrieves all item cards in the unfinished files list.
   * Targets modern .itemslist > div.itemeditor with tr.unfinished__item fallback.
   * @returns {HTMLElement[]} Array of item elements.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    const modernCards = Array.from(document.querySelectorAll('.itemslist > div.itemeditor, div.itemeditor[id]'));
    if (modernCards.length > 0) return modernCards;
    return Array.from(document.querySelectorAll('tr.unfinished__item'));
  }

  /**
   * Extracts the thumbnail image URL from an item card.
   * @param {HTMLElement} cardElement - Item element.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      'img.itemeditor__thumb, img._itemeditor__thumb, .itemeditor__thumbwrap img, tr.unfinished__item img, .unfinished__thumb img, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Extracts current numeric asset ID from an item card.
   * @param {HTMLElement} [cardElement=null] - Item element.
   * @returns {string|null} Numeric ID or null.
   */
  getCurrentAssetId(cardElement = null) {
    const target = cardElement || this.activeCard;
    if (!target) return null;

    const idBox = target.querySelector?.('span.itemeditor__idbox, .itemeditor__idbox');
    if (idBox) {
      const match = idBox.textContent.match(/\d+/);
      if (match) return match[0];
    }

    const thumb = this.getThumbnailUrl(target);
    if (thumb) {
      const match = thumb.match(/depositphotos_(\d+)/i);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Selects an item card and stores it as activeCard.
   * @param {HTMLElement} cardElement - Item element.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    this.activeCard = cardElement;

    const checkbox = cardElement.querySelector?.(
      'div.itemeditor__checkboxcell, i.itemeditor__selectaction, td.unfinished__action label.checkbox-wrapper i, td.unfinished__action i, i.checkbox-bicon'
    );
    if (checkbox) {
      const isSelected =
        cardElement.classList?.contains('itemeditor__container_selected') ||
        cardElement.querySelector?.('.itemeditor__container_selected');
      if (!isSelected) {
        simulateClick(checkbox);
      }
    } else {
      simulateClick(cardElement);
    }
  }

  /**
   * Scoped query selector helper. Queries target container first,
   * falling back to document if not found (supports both modern card scoping and legacy table/external panel).
   * @private
   * @param {HTMLElement|Document} root - Container to query within.
   * @param {string} selector - CSS selector.
   * @returns {HTMLElement|null}
   */
  _queryScoped(root, selector) {
    if (!selector) return null;
    const fromRoot = root?.querySelector?.(selector);
    if (fromRoot) return fromRoot;
    if (root && root !== document && typeof document !== 'undefined') {
      return document.querySelector(selector);
    }
    return null;
  }

  /**
   * Waits for the editor on the card to become interactive.
   * Scrolls the card into view and waits for .itemeditor_stub removal.
   * @param {HTMLElement} [cardElement=null] - Selected item element.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    const target = cardElement || this.activeCard;
    if (!target) return true;

    // 1. Progressive scroll into view
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(150);
    }

    // 2. Wait for itemeditor_stub class to be removed if virtualized
    let waited = 0;
    while (target.classList?.contains('itemeditor_stub') && waited < 2000) {
      await sleep(100);
      waited += 100;
    }

    // 3. Verify description textarea presence
    const desc = this._queryScoped(
      target,
      'textarea.itemeditor__input_description, textarea._itemeditor__value_description'
    );
    if (desc) return true;

    try {
      await waitForElement(
        'textarea.itemeditor__input_description, textarea._itemeditor__value_description',
        target || (typeof document !== 'undefined' ? document : null),
        timeoutMs
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears old metadata fields (description, keywords, title) on the card prior to injection.
   * Uses condition checks (itemeditor__reset_active) to avoid unnecessary clicks.
   * @param {HTMLElement} [cardElement=null] - Target card element.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata(cardElement = null) {
    const root = cardElement || this.activeCard || (typeof document !== 'undefined' ? document : null);
    if (!root) return true;

    // 1. Clear Description
    const resetDesc = this._queryScoped(
      root,
      'a._itemeditor__reset_description, .itemeditor__row_description a.itemeditor__reset, div.itemeditor__fock a.itemeditor__reset'
    );
    if (
      resetDesc &&
      (resetDesc.classList?.contains('itemeditor__reset_active') ||
        (!resetDesc.classList?.contains('itemeditor__reset_hidden') && resetDesc.offsetParent !== null) ||
        (!resetDesc.classList?.contains('itemeditor__reset_hidden') && typeof resetDesc.offsetParent === 'undefined'))
    ) {
      (this.logger || logger).step('Clearing description...');
      simulateClick(resetDesc);
      await sleep(60);
    } else {
      const descTextarea = this._queryScoped(
        root,
        'textarea.itemeditor__input_description, textarea._itemeditor__value_description'
      );
      if (descTextarea && descTextarea.value) setNativeValue(descTextarea, '');
    }

    // 2. Clear Keywords
    const resetKeywords = this._queryScoped(
      root,
      'a._itemeditor__reset_keywords, .itemeditor__row_tags a.itemeditor__reset'
    );
    if (
      resetKeywords &&
      (resetKeywords.classList?.contains('itemeditor__reset_active') ||
        (!resetKeywords.classList?.contains('itemeditor__reset_hidden') && resetKeywords.offsetParent !== null) ||
        (!resetKeywords.classList?.contains('itemeditor__reset_hidden') && typeof resetKeywords.offsetParent === 'undefined'))
    ) {
      (this.logger || logger).step('Clearing keywords...');
      simulateClick(resetKeywords);
      await sleep(60);
    }

    // 3. Clear Title if present and active
    const resetTitle = this._queryScoped(root, 'a._itemeditor__reset_title');
    if (
      resetTitle &&
      (resetTitle.classList?.contains('itemeditor__reset_active') ||
        (!resetTitle.classList?.contains('itemeditor__reset_hidden') && resetTitle.offsetParent !== null) ||
        (!resetTitle.classList?.contains('itemeditor__reset_hidden') && typeof resetTitle.offsetParent === 'undefined'))
    ) {
      simulateClick(resetTitle);
      await sleep(40);
    }

    return true;
  }

  /**
   * Clears keyword tags.
   * @param {HTMLElement} [cardElement=null] - Target card element.
   * @returns {Promise<boolean>}
   */
  async clearKeywords(cardElement = null) {
    const root = cardElement || this.activeCard || (typeof document !== 'undefined' ? document : null);
    if (!root) return true;

    const resetKeywords = this._queryScoped(
      root,
      'a._itemeditor__reset_keywords, .itemeditor__row_tags a.itemeditor__reset'
    );
    if (resetKeywords) {
      simulateClick(resetKeywords);
      await sleep(60);
    } else {
      const removeIcons = Array.from(root.querySelectorAll?.('i.tagseditor__remove') || []);
      for (const icon of removeIcons) {
        simulateClick(icon);
      }
    }
    return true;
  }

  /**
   * Injects sanitized metadata into Depositphotos item editor.
   * Scoped strictly to target cardElement to prevent cross-card contamination.
   * - Description (English, min 5 words): single-string instant injection.
   * - Keywords (7-50 tags): fast tag injection via paste trigger span.paste_editor__tag + Enter.
   * - Editorial & Country Location: selects editorial 'yes' vs 'no', country code.
   * - Nudity / Mature: selects 'yes' vs 'no'.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (isEditorial, editorialCountry, isNudity, clearExisting).
   * @param {HTMLElement} [cardElement=null] - Target card element.
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}, cardElement = null) {
    const root = cardElement || this.activeCard || (typeof document !== 'undefined' ? document : null);
    if (!root || !metadata) return false;

    if (options.clearExisting !== false) {
      await this.clearMetadata(root);
    }

    // 1. Description: Single-string instant injection into textarea
    const descTextarea = this._queryScoped(
      root,
      'textarea.itemeditor__input_description, textarea._itemeditor__value_description'
    );
    if (descTextarea && metadata.description) {
      (this.logger || logger).step('Injecting description', metadata.description.slice(0, 45) + '...');
      setNativeValue(descTextarea, metadata.description.trim());
    }

    // 2. Keywords: Fast Tag Injection via paste trigger
    if (metadata.keywords && metadata.keywords.length > 0) {
      const rawKeywords = Array.isArray(metadata.keywords)
        ? metadata.keywords
        : String(metadata.keywords).split(',');

      const cleanTags = rawKeywords
        .map((k) => (typeof k === 'string' ? k.trim() : ''))
        .filter((k) => k.length > 0)
        .slice(0, 50)
        .join(', ');

      (this.logger || logger).step('Injecting keywords', `${cleanTags.split(',').length} tags`);

      const pasteTrigger = this._queryScoped(
        root,
        'span.paste_editor__tag, div.tagseditor span.paste_editor__tag'
      );
      if (pasteTrigger) {
        simulateClick(pasteTrigger);
        await sleep(80);
      }

      const activeTagInput = this._queryScoped(
        root,
        'div.itemeditor__field_focused span.tagseditor__tag, div.tagseditor input, div.tagseditor textarea, input.tagseditor__input, span.tagseditor__item_new span.tagseditor__tag, span.tagseditor__tag'
      );

      if (activeTagInput) {
        setNativeValue(activeTagInput, cleanTags);
        simulateEnterKey(activeTagInput);
      } else if (pasteTrigger) {
        setNativeValue(pasteTrigger, cleanTags);
        simulateEnterKey(pasteTrigger);
      }
    }

    // 3. Editorial & Country Location
    const editorialSelect = this._queryScoped(
      root,
      'select._itemeditor__value_is_editorial, div._itemeditor__field_is_editorial select, select[class*="_value_is_editorial"]'
    );
    if (editorialSelect) {
      const isEditorial = Boolean(options.isEditorial || options.licenseType === 'editorial');
      // Depositphotos values are "yes" and "no" (also support "1"/"0" in mock)
      const targetVal = isEditorial ? 'yes' : 'no';
      const fallbackVal = isEditorial ? '1' : '0';

      const hasOption = Array.from(editorialSelect.options || []).some(o => o.value === targetVal);
      const valToSet = hasOption ? targetVal : fallbackVal;

      (this.logger || logger).step('Setting Editorial', isEditorial ? 'Yes' : 'No');
      editorialSelect.value = valToSet;
      editorialSelect.dispatchEvent(new Event('change', { bubbles: true }));

      if (isEditorial) {
        await sleep(150);
        const countryCode = options.editorialCountry || options.countryCode || 'US';
        const countrySelect = this._queryScoped(
          root,
          'select._itemeditor__value_location_country_code, div.itemeditor__row_country_select select, select[class*="_value_location_country_code"]'
        );
        if (countrySelect) {
          (this.logger || logger).step('Setting Country', countryCode);
          countrySelect.value = countryCode;
          countrySelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    // 4. Nudity / Mature Content
    const nuditySelect = this._queryScoped(
      root,
      'select._itemeditor__value_is_nudity, div._itemeditor__field_is_nudity select, select[class*="_value_is_nudity"]'
    );
    if (nuditySelect) {
      const isNudity = Boolean(options.isNudity);
      const targetVal = isNudity ? 'yes' : 'no';
      const fallbackVal = isNudity ? '1' : '0';
      const hasOption = Array.from(nuditySelect.options || []).some(o => o.value === targetVal);
      nuditySelect.value = hasOption ? targetVal : fallbackVal;
      nuditySelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    (this.logger || logger).success('Item metadata injected successfully');
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
   * Bulk Save Strategy:
   * 1. Scrolls back to top via i.to-top-bicon.
   * 2. Clicks table header "Select all" checkbox if not already selected.
   * 3. Clicks control panel Save button and waits for sync completion.
   * @returns {Promise<boolean>} True if bulk save executed.
   */
  async bulkSave() {
    if (typeof document === 'undefined') return false;
    (this.logger || logger).banner('Depositphotos: Initiating bulk save...');

    // 1. Scroll back to top
    const toTopBtn = document.querySelector('i.to-top-bicon, .to-top-bicon, a.to-top-bicon');
    if (toTopBtn) {
      (this.logger || logger).step('Scrolling back to top...');
      simulateClick(toTopBtn);
    } else if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    await sleep(500);

    // 2. Click "Select all" checkbox if not already selected
    const selectAllBtn = document.querySelector(
      'i.checkbox-bicon.select-all, th.unfinished__action label.checkbox-wrapper > i, th.unfinished__action i.select-all, .select-all'
    );
    if (selectAllBtn) {
      const isSelected =
        selectAllBtn.classList?.contains('selected') || selectAllBtn.classList?.contains('active');
      if (!isSelected) {
        (this.logger || logger).step('Clicking Select All checkbox...');
        simulateClick(selectAllBtn);
        await sleep(300);
      }
    }

    // 3. Click control panel Save button
    const saveBtn = document.querySelector(
      '#unfinished-editor div.unfinished__cp button.white, button._cp__action_save, div.unfinished__cp button.save, button.save.white'
    );
    if (saveBtn) {
      (this.logger || logger).step('Clicking Save button...');
      simulateClick(saveBtn);

      // 4. Wait for sync completion
      await sleep(500);
      let waited = 0;
      while (waited < 5000) {
        const syncIndicator = document.querySelector('._cp__indicator_sync:not(.unfinished__indicator_hidden)');
        if (!syncIndicator && !saveBtn.disabled) break;
        await sleep(250);
        waited += 250;
      }
      (this.logger || logger).success('Bulk save completed successfully');
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
      'button.submit-selected.blue, button._cp__action_submit, #unfinished-editor button.submit-selected'
    );
    if (submitBtn && !submitBtn.disabled) {
      (this.logger || logger).step('Clicking Submit button...');
      simulateClick(submitBtn);
      return true;
    }
    return false;
  }
}
