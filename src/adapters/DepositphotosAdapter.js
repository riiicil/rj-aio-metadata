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
   * Pre-automation preparation:
   * Checks if the table header "Select all" checkbox is checked.
   * If checked (or items are selected), unchecks it before card processing begins.
   * This prevents multi-edit broadcasting across cards.
   * @returns {Promise<boolean>}
   */
  async prepareAutomation() {
    if (typeof document === 'undefined') return true;

    const selectAllBtn = document.querySelector(
      'i._checkbox.checkbox-bicon.select-all, i.checkbox-bicon.select-all, th.unfinished__action i.select-all, .select-all'
    );
    const qtySelectedEl = document.querySelector('span._cp__qty_selected, ._cp__qty_selected');
    const selectedQty = qtySelectedEl ? parseInt(qtySelectedEl.textContent.trim() || '0', 10) : 0;

    const isChecked = Boolean(
      (selectAllBtn && (selectAllBtn.classList?.contains('selected') || selectAllBtn.classList?.contains('active'))) ||
      selectedQty > 0 ||
      document.querySelector('.itemeditor__container_selected')
    );

    if (isChecked && selectAllBtn) {
      (this.logger || logger).step('Depositphotos: Unchecking initial Select All to isolate card edits...');
      simulateClick(selectAllBtn);
      await sleep(300);
    } else {
      (this.logger || logger).info('Depositphotos: Select All is already unchecked, proceeding...');
    }

    return true;
  }

  /**
   * Tracks target item card as activeCard without toggling card checkboxes.
   * On Depositphotos, checking card checkboxes triggers multi-item selection mode,
   * causing single-card edits to overwrite all checked cards.
   * @param {HTMLElement} cardElement - Item element.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    this.activeCard = cardElement;
    // Scoped editing on Depositphotos happens directly within each card container.
    // Do NOT click the card checkbox here to prevent multi-edit grouping.
  }

  /**
   * Scoped query selector helper. Queries target container strictly.
   * If root is null or element is not found within root, returns null (never leaks to document).
   * @private
   * @param {HTMLElement|Document} root - Container to query within.
   * @param {string} selector - CSS selector.
   * @returns {HTMLElement|null}
   */
  _queryScoped(root, selector) {
    if (!selector) return null;
    return root?.querySelector?.(selector) || null;
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
  /**
   * Injects sanitized metadata into Depositphotos item editor.
   * Scoped strictly to target cardElement to prevent cross-card contamination.
   * Sequential workflow:
   * 1. Clear old description if exists via x button (a._itemeditor__reset_description).
   * 2. Inject description into textarea._itemeditor__value_description.
   * 3. Defocus description: click .itemeditor__row.itemeditor__namerow (or label) to blur.
   * 4. Clear old keywords if exists via x button (a._itemeditor__reset_keywords).
   * 5. Inject keywords via span.paste_editor__tag + Enter key.
   * 6. Defocus keywords: click .itemeditor__row.itemeditor__namerow (or label) to blur.
   * 7. Editorial & Country Location (if enabled in preferences; skipped otherwise).
   * 8. Nudity / Mature (if enabled in preferences).
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (isEditorial, editorialCountry, isNudity).
   * @param {HTMLElement} [cardElement=null] - Target card element.
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}, cardElement = null) {
    const root = cardElement || this.activeCard;
    if (!root || !metadata) return false;

    // Helper for defocusing active field by clicking namerow
    const defocusField = async (sourceElement = null) => {
      if (sourceElement && typeof sourceElement.blur === 'function') {
        sourceElement.blur();
      }
      if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      const nameRow = this._queryScoped(
        root,
        'div.itemeditor__row.itemeditor__namerow span.itemeditor__name, div.itemeditor__row.itemeditor__namerow, .itemeditor__row.itemeditor__namerow, div.itemeditor__namerow, .itemeditor__namerow .itemeditor__label, .itemeditor__namerow'
      );
      if (nameRow) {
        simulateClick(nameRow);
        await sleep(100);
      }
    };

    // 1. Clear old description if exists with x button
    const resetDesc = this._queryScoped(
      root,
      'a._itemeditor__reset_description, .itemeditor__row_description a.itemeditor__reset, div.itemeditor__row:nth-of-type(3) a.itemeditor__reset'
    );
    const descTextarea = this._queryScoped(
      root,
      'textarea.itemeditor__input_description, textarea._itemeditor__value_description'
    );
    const hasOldDesc = Boolean(
      (resetDesc && (resetDesc.classList?.contains('itemeditor__reset_active') ||
        (!resetDesc.classList?.contains('itemeditor__reset_hidden') && resetDesc.offsetParent !== null) ||
        (!resetDesc.classList?.contains('itemeditor__reset_hidden') && typeof resetDesc.offsetParent === 'undefined'))) ||
      (descTextarea && descTextarea.value && descTextarea.value.trim().length > 0)
    );
    if (resetDesc && hasOldDesc) {
      (this.logger || logger).step('Clearing description...');
      simulateClick(resetDesc);
      await sleep(80);
    }
    if (descTextarea && descTextarea.value) {
      setNativeValue(descTextarea, '');
    }

    // 2. Fill description
    if (descTextarea && metadata.description) {
      (this.logger || logger).step('Injecting description', metadata.description.slice(0, 45) + '...');
      setNativeValue(descTextarea, metadata.description.trim());
      await sleep(100);
    }

    // 3. Defocus description: click itemeditor__namerow
    await defocusField(descTextarea);

    // 4. Clear old keywords if exists with x button
    const resetKeywords = this._queryScoped(
      root,
      'a._itemeditor__reset_keywords, .itemeditor__row_tags a.itemeditor__reset, div.itemeditor__row.itemeditor__row_tags a.itemeditor__reset'
    );
    const hasExistingTags = Boolean(
      (resetKeywords && (resetKeywords.classList?.contains('itemeditor__reset_active') ||
        (!resetKeywords.classList?.contains('itemeditor__reset_hidden') && resetKeywords.offsetParent !== null) ||
        (!resetKeywords.classList?.contains('itemeditor__reset_hidden') && typeof resetKeywords.offsetParent === 'undefined'))) ||
      (root.querySelectorAll?.('span.tagseditor__item:not(.tagseditor__item_new)')?.length > 0)
    );
    if (resetKeywords && hasExistingTags) {
      (this.logger || logger).step('Clearing keywords...');
      simulateClick(resetKeywords);
      await sleep(80);
    }

    // 5. Fill keywords
    if (metadata.keywords && metadata.keywords.length > 0) {
      const rawKeywords = Array.isArray(metadata.keywords)
        ? metadata.keywords
        : String(metadata.keywords).split(',');

      const cleanTagsList = rawKeywords
        .map((k) => (typeof k === 'string' ? k.trim() : ''))
        .filter((k) => k.length > 0)
        .slice(0, 50);

      const cleanTagsString = cleanTagsList.join(', ');

      (this.logger || logger).step('Injecting keywords', `${cleanTagsList.length} tags`);

      // A. Activate tags editor container on THIS card
      const tagsEditor = this._queryScoped(
        root,
        'div.tagseditor, span.paste_editor__tag'
      );
      if (tagsEditor) {
        simulateClick(tagsEditor);
        await sleep(100);
      }

      // Helper to query the active typing input (strictly ignoring existing committed chips)
      const getActiveInput = () => {
        return this._queryScoped(
          root,
          'span.tagseditor__item_new span.tagseditor__tag, span.tagseditor__item[data-type="input"] span.tagseditor__tag, .tagseditor__item_new .tagseditor__tag'
        );
      };

      let activeInput = getActiveInput();
      if (!activeInput && tagsEditor) {
        simulateClick(tagsEditor);
        await sleep(80);
        activeInput = getActiveInput();
      }

      // B. Primary: Single-string comma injection + Enter
      // Depositphotos Collection.Tags natively splits strings by /[,;]/g into individual chips!
      if (activeInput) {
        if (typeof activeInput.focus === 'function') activeInput.focus();
        activeInput.textContent = cleanTagsString;
        if (activeInput.innerText !== undefined) activeInput.innerText = cleanTagsString;
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(60);

        simulateEnterKey(activeInput);
        const itemParent = activeInput.closest?.('._tagseditor__item, span.tagseditor__item');
        if (itemParent && itemParent !== activeInput) {
          simulateEnterKey(itemParent);
        }
        await sleep(250);
      }

      // C. Verification & Fallback: Ensure all chips are created without overwriting
      let createdChips = Array.from(root.querySelectorAll?.('span.tagseditor__item:not(.tagseditor__item_new)') || []);
      const minExpected = Math.min(cleanTagsList.length, 5);

      if (createdChips.length < minExpected) {
        // If a single unsplit chip with commas was created, remove it before fallback
        if (createdChips.length === 1) {
          const singleChipText = createdChips[0].textContent || '';
          if (singleChipText.includes(',')) {
            const removeBtn = createdChips[0].querySelector?.('i.tagseditor__remove');
            if (removeBtn) {
              simulateClick(removeBtn);
              await sleep(60);
            }
          }
        }

        if (tagsEditor) {
          simulateClick(tagsEditor);
          await sleep(60);
        }

        for (const tag of cleanTagsList) {
          let inputEl = getActiveInput();
          if (!inputEl && tagsEditor) {
            simulateClick(tagsEditor);
            await sleep(50);
            inputEl = getActiveInput();
          }

          if (inputEl) {
            if (typeof inputEl.focus === 'function') inputEl.focus();
            inputEl.textContent = tag;
            if (inputEl.innerText !== undefined) inputEl.innerText = tag;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            simulateEnterKey(inputEl);
            const parent = inputEl.closest?.('._tagseditor__item, span.tagseditor__item');
            if (parent && parent !== inputEl) {
              simulateEnterKey(parent);
            }
            await sleep(60);
          }
        }
      }
      await sleep(100);
    }

    // 6. Defocus keywords: click itemeditor__namerow
    await defocusField();

    // 7. Editorial & Country Location (Only if enabled in preferences)
    const isEditorial = Boolean(options.isEditorial || options.licenseType === 'editorial');
    if (isEditorial) {
      const editorialSelect = this._queryScoped(
        root,
        'select._itemeditor__value_is_editorial, div._itemeditor__field_is_editorial select, select[class*="_value_is_editorial"]'
      );
      if (editorialSelect) {
        const targetVal = 'yes';
        const fallbackVal = '1';
        const hasOption = Array.from(editorialSelect.options || []).some((o) => o.value === targetVal);
        const valToSet = hasOption ? targetVal : fallbackVal;

        (this.logger || logger).step('Setting Editorial', 'Yes');
        editorialSelect.value = valToSet;
        editorialSelect.dispatchEvent(new Event('change', { bubbles: true }));
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
          await sleep(100);
        }
      }
    }

    // 8. Nudity / Mature Content (Only if explicitly specified)
    if (options.isNudity !== undefined) {
      const nuditySelect = this._queryScoped(
        root,
        'select._itemeditor__value_is_nudity, div._itemeditor__field_is_nudity select, select[class*="_value_is_nudity"]'
      );
      if (nuditySelect) {
        const isNudity = Boolean(options.isNudity);
        const targetVal = isNudity ? 'yes' : 'no';
        const fallbackVal = isNudity ? '1' : '0';
        const hasOption = Array.from(nuditySelect.options || []).some((o) => o.value === targetVal);
        nuditySelect.value = hasOption ? targetVal : fallbackVal;
        nuditySelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
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
   * 3. Clicks control panel Save button and waits for sync completion / button disabled.
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
    }
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    await sleep(600);

    // 2. Click "Select all" checkbox if not already selected
    const selectAllBtn = document.querySelector(
      'i._checkbox.checkbox-bicon.select-all, i.checkbox-bicon.select-all, th.unfinished__action label.checkbox-wrapper > i, th.unfinished__action i.select-all, .select-all'
    );
    if (selectAllBtn) {
      const isSelected =
        selectAllBtn.classList?.contains('selected') || selectAllBtn.classList?.contains('active');
      if (!isSelected) {
        (this.logger || logger).step('Clicking Select All checkbox...');
        simulateClick(selectAllBtn);
        await sleep(400);
      }
    }

    // 3. Click control panel Save button
    const saveBtn = document.querySelector(
      '#unfinished-editor div.unfinished__cp button.white, button._cp__action_save, div.unfinished__cp button.save, button.save.white'
    );
    if (saveBtn) {
      (this.logger || logger).step('Clicking Save button...');
      simulateClick(saveBtn);

      // 4. Wait until save button becomes disabled or sync finishes
      await sleep(600);
      let waited = 0;
      const maxTimeout = 10000;
      while (waited < maxTimeout) {
        const syncIndicator = document.querySelector('._cp__indicator_sync:not(.unfinished__indicator_hidden)');
        const isButtonDisabled = saveBtn.disabled || saveBtn.classList?.contains('disabled');
        const isButtonSaving = saveBtn.classList?.contains('active');

        if (isButtonDisabled) {
          (this.logger || logger).step('Save button disabled, changes committed.');
          break;
        }

        if (!syncIndicator && !isButtonSaving && waited > 1500) {
          break;
        }
        await sleep(300);
        waited += 300;
      }
      (this.logger || logger).success('Bulk save completed successfully');

      // Uncheck select-all after save completes to avoid leaving all cards selected
      if (selectAllBtn) {
        await sleep(300);
        const isStillChecked =
          selectAllBtn.classList?.contains('selected') || selectAllBtn.classList?.contains('active');
        if (isStillChecked) {
          simulateClick(selectAllBtn);
        }
      }

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
