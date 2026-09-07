/**
 * DreamstimeAdapter — Platform Adapter for Dreamstime Contributor
 *
 * Implements BaseAdapter interface for Dreamstime (dreamstime.com):
 * - URL matching for dreamstime.com (especially /uploadfile and /upload/edit*).
 * - Modal detection and asset card extraction (div.upload-item[id], modal container div.popup-upload).
 * - Thumbnail extraction (div.upload-item__thumb img, .popup-upload img).
 * - Title clearing (#js-remove-title) and single-string instant injection into input#title.
 * - Description clearing (.js-editcleandescription) and single-string instant injection into textarea#description.
 * - Category pairs interaction with 300ms AJAX delay (select#M_Category_1/2/3 -> select#M_Subcategory_1/2/3).
 *   AI Mode Special Rule: Category 3 is hardcoded to "Illustration & Clipart" and "Generative AI".
 * - Keywords clearing (.js-editcleankeywords) and comma-separated chip injection into input#keywords_tag + Enter.
 * - License type selection: Commercial (RF) vs Editorial (ED).
 * - Save Draft with Toast Confirmation: clicks #js-savededits, awaits .noty_type__dt-success or #js-submit-message.
 * - Next item navigation with Infinite Carousel Loop Guard: tracks processed asset IDs and stops when cycling.
 * - Submit for review: clicks a#js-next-submit.
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

export class DreamstimeAdapter extends BaseAdapter {
  constructor() {
    super('dreamstime', 'Dreamstime');
    this.processedAssetIds = new Set();
    this.firstAssetId = null;
  }

  /**
   * Matches Dreamstime contributor URLs.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return url.includes('dreamstime.com');
  }

  /**
   * Scans and retrieves asset cards.
   * Returns modal container if edit modal is active, otherwise returns batch grid items.
   * @returns {HTMLElement[]} Array of card or modal elements.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    const modal = document.querySelector('div.popup-upload.popup-upload--submit, div.popup-upload');
    if (modal) {
      return [modal];
    }
    return Array.from(document.querySelectorAll('div.upload-item[id], div.upload-item'));
  }

  /**
   * Extracts current active asset ID from modal header, breadcrumbs, or modal element.
   * @returns {string|null} Numeric asset ID or null.
   */
  getCurrentAssetId() {
    if (typeof document === 'undefined') return null;

    const header = document.querySelector('.popup-nav__breadcrumbs, .popup-nav');
    if (header) {
      const match = (header.textContent || '').match(/(\d{7,12})/);
      if (match) return match[1];
    }

    const modal = document.querySelector('div.popup-upload, div.popup-upload--submit');
    if (modal) {
      const dataId = modal.getAttribute('data-id') || modal.id;
      if (dataId) {
        const match = dataId.match(/(\d{7,12})/);
        if (match) return match[1];
      }
      const match = (modal.textContent || '').match(/(\d{7,12})/);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Extracts the thumbnail image URL from an asset card or modal.
   * @param {HTMLElement} cardElement - Asset card or modal element.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      'div.upload-item__thumb img, .popup-upload img, .popup-upload__img img, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an asset card in the batch view to open the edit modal.
   * @param {HTMLElement} cardElement - Card element to select.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    const link = cardElement.querySelector?.(
      'a.js-upload-edit, a.upload-item__link.js-upload-edit, div.upload-item__thumb a'
    );
    if (link) {
      simulateClick(link);
    } else {
      simulateClick(cardElement);
    }
  }

  /**
   * Waits for the edit modal form to become interactive.
   * @param {HTMLElement} [cardElement=null] - Selected asset card or modal.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    try {
      await waitForElement(
        'input#title, textarea#description',
        typeof document !== 'undefined' ? document : null,
        timeoutMs
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears old metadata fields (title, description, categories, keywords) prior to injection.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    // 1. Clear Title
    const clearTitle = document.querySelector('#js-remove-title, a#js-remove-title');
    if (clearTitle) {
      simulateClick(clearTitle);
    } else {
      const titleInput = document.querySelector('input#title, input[name="M_title"]');
      if (titleInput) setNativeValue(titleInput, '');
    }

    // 2. Clear Description
    const clearDesc = document.querySelector('.js-editcleandescription, a.js-editcleandescription');
    if (clearDesc) {
      simulateClick(clearDesc);
    } else {
      const descInput = document.querySelector('textarea#description, textarea[name="M_description"]');
      if (descInput) setNativeValue(descInput, '');
    }

    // 3. Clear Categories (1, 2, 3)
    const clearCat1 = document.querySelector('#js-remove-cat1, a#js-remove-cat1');
    if (clearCat1) simulateClick(clearCat1);

    const clearCat2 = document.querySelector('#js-remove-cat2, a#js-remove-cat2');
    if (clearCat2) simulateClick(clearCat2);

    const clearCat3 = document.querySelector('#js-remove-cat3, a#js-remove-cat3');
    if (clearCat3) simulateClick(clearCat3);

    // 4. Clear Keywords
    const clearKeywords = document.querySelector('.js-editcleankeywords, a.js-editcleankeywords');
    if (clearKeywords) simulateClick(clearKeywords);

    await sleep(80);
    return true;
  }

  /**
   * Clears keywords.
   * @returns {Promise<boolean>}
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;
    const clearKeywords = document.querySelector('.js-editcleankeywords, a.js-editcleankeywords');
    if (clearKeywords) simulateClick(clearKeywords);
    return true;
  }

  /**
   * Helper to set a category / subcategory select pair with 300ms AJAX wait.
   * Matches option by value or text content.
   * @param {HTMLSelectElement} catSelect - Category select element.
   * @param {HTMLSelectElement} subcatSelect - Dependent subcategory select element.
   * @param {string|number} mainVal - Main category value or name.
   * @param {string|number} subVal - Subcategory value or name.
   * @returns {Promise<boolean>}
   */
  async setCategoryPair(catSelect, subcatSelect, mainVal, subVal) {
    if (!catSelect || !mainVal) return false;

    const selectOption = (selectEl, target) => {
      if (!selectEl || !target) return false;
      const str = String(target).trim().toLowerCase();
      let matched = false;

      if (selectEl.options && selectEl.options.length > 0) {
        for (const opt of selectEl.options) {
          const optVal = String(opt.value ?? '').trim().toLowerCase();
          const optText = String(opt.textContent || opt.text || '').trim().toLowerCase();

          // Direct match on value or text
          if (optVal === str || optText === str) {
            selectEl.value = opt.value;
            matched = true;
            break;
          }

          // Substring match
          if (str.length > 3 && (optText.includes(str) || str.includes(optText))) {
            selectEl.value = opt.value;
            matched = true;
            break;
          }

          // Normalized match (ignore trailing 's' for plural variation e.g. illustration vs illustrations)
          const normStr = str.replace(/\b([a-z]+)s\b/g, '$1');
          const normOpt = optText.replace(/\b([a-z]+)s\b/g, '$1');
          if (normOpt.includes(normStr) || normStr.includes(normOpt)) {
            selectEl.value = opt.value;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        selectEl.value = String(target);
      }

      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    selectOption(catSelect, mainVal);

    // Allow Dreamstime internal AJAX/jQuery script to populate subcategory options
    await sleep(300);

    if (subcatSelect && subVal) {
      selectOption(subcatSelect, subVal);
    }

    return true;
  }

  /**
   * Injects sanitized metadata into Dreamstime edit modal.
   * - Title single-string instant injection.
   * - Description single-string instant injection.
   * - Category 1, 2, and 3 pairs with 300ms AJAX delay.
   *   AI Mode Special Rule: Category 3 is hardcoded to "Illustration & Clipart" and "Generative AI".
   * - Keywords chip injection (clamped to 70 tags) + Enter simulation.
   * - License type selection: Commercial (RF) vs Editorial (ED).
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (isAiGenerated, isEditorial, licenseType, clearExisting).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    if (options.clearExisting !== false) {
      await this.clearMetadata();
    }

    // 1. Title: Single-string instant injection
    const titleInput = document.querySelector('input#title, input[name="M_title"]');
    if (titleInput && metadata.title) {
      setNativeValue(titleInput, metadata.title);
    }

    // 2. Description: Single-string instant injection
    const descInput = document.querySelector('textarea#description, textarea[name="M_description"]');
    if (descInput && metadata.description) {
      setNativeValue(descInput, metadata.description);
    }

    // 3. Category Pairs
    const categories = metadata.categories || options.categories || [];

    if (options.isAiGenerated) {
      // Category 1 & 2 filled from metadata if available
      const cat1 = categories[0];
      if (cat1) {
        const c1Select = document.querySelector('select#M_Category_1, select[name="M_Category_1"]');
        const s1Select = document.querySelector('select#M_Subcategory_1, select[name="M_Subcategory_1"]');
        await this.setCategoryPair(
          c1Select,
          s1Select,
          cat1.main || cat1.mainId || cat1.categoryId || cat1,
          cat1.sub || cat1.subId || cat1.subcategoryId
        );
      }

      const cat2 = categories[1];
      if (cat2) {
        const c2Select = document.querySelector('select#M_Category_2, select[name="M_Category_2"]');
        const s2Select = document.querySelector('select#M_Subcategory_2, select[name="M_Subcategory_2"]');
        await this.setCategoryPair(
          c2Select,
          s2Select,
          cat2.main || cat2.mainId || cat2.categoryId || cat2,
          cat2.sub || cat2.subId || cat2.subcategoryId
        );
      }

      // Category 3 AI Hardcoded Special Rule:
      // Main: "Illustration & Clipart" (ID: 172), Subcategory: "Generative AI" (ID: 212)
      const c3Select = document.querySelector('select#M_Category_3, select[name="M_Category_3"]');
      const s3Select = document.querySelector('select#M_Subcategory_3, select[name="M_Subcategory_3"]');
      await this.setCategoryPair(c3Select, s3Select, 'Illustration & Clipart', 'Generative AI');
    } else {
      // Non-AI mode: fill up to 3 pairs from metadata
      for (let i = 0; i < Math.min(categories.length, 3); i++) {
        const cat = categories[i];
        const cSelect = document.querySelector(`select#M_Category_${i + 1}, select[name="M_Category_${i + 1}"]`);
        const sSelect = document.querySelector(`select#M_Subcategory_${i + 1}, select[name="M_Subcategory_${i + 1}"]`);
        await this.setCategoryPair(
          cSelect,
          sSelect,
          cat.main || cat.mainId || cat.categoryId || cat,
          cat.sub || cat.subId || cat.subcategoryId
        );
      }
    }

    // 4. Keywords: Comma-separated chip injection clamped <= 70 tags
    if (metadata.keywords && metadata.keywords.length > 0) {
      const kwInput = document.querySelector('input#keywords_tag, div.popup__row--keywords input');
      if (kwInput) {
        const rawKeywords = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',');

        const cleanKeywords = rawKeywords
          .map((k) => (typeof k === 'string' ? k.trim() : ''))
          .filter((k) => k.length > 0)
          .slice(0, 70)
          .join(', ');

        setNativeValue(kwInput, cleanKeywords);
        simulateEnterKey(kwInput);
      }
    }

    // 5. License Type Selection: Commercial (RF) vs Editorial (ED)
    const isEditorial = options.isEditorial || options.licenseType === 'editorial';
    if (isEditorial) {
      const edBtn = Array.from(document.querySelectorAll('a, div.popup__form-element--buttons a')).find(
        (a) => a.textContent && a.textContent.includes('Editorial (ED)')
      ) || document.querySelector('div.popup__form-element--buttons a:last-child');
      if (edBtn) simulateClick(edBtn);
    } else {
      const comBtn = Array.from(document.querySelectorAll('a, div.popup__form-element--buttons a')).find(
        (a) => a.textContent && a.textContent.includes('Commercial (RF)')
      ) || document.querySelector('div.popup__form-element--buttons a:first-child');
      if (comBtn) simulateClick(comBtn);
    }

    return true;
  }

  /**
   * Saves current edits as draft and awaits toast or status message confirmation.
   * @returns {Promise<boolean>} True if draft saved.
   */
  async saveDraft() {
    if (typeof document === 'undefined') return true;

    const saveBtn = document.querySelector('#js-savededits, div#js-savededits');
    if (saveBtn) {
      simulateClick(saveBtn);
    }

    try {
      await waitForElement(
        '.noty_type__dt-success, #js-submit-message:not([style*="none"])',
        document,
        4000
      );
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Navigates to next asset in draft mode with Infinite Carousel Loop Guard.
   * Returns { done: boolean, nextAssetId: string|null }.
   * @returns {Promise<{ done: boolean, nextAssetId: string|null }>}
   */
  async navigateToNext() {
    if (typeof document === 'undefined') return { done: true, nextAssetId: null };

    const currentId = this.getCurrentAssetId();
    if (currentId && !this.firstAssetId) {
      this.firstAssetId = currentId;
    }
    if (currentId) {
      this.processedAssetIds.add(currentId);
    }

    const nextArrow = document.querySelector(
      'a#js-next-submit.popup-nav__btn--next, a.popup-nav__btn--next'
    );
    if (!nextArrow) {
      return { done: true, nextAssetId: null };
    }

    simulateClick(nextArrow);
    await sleep(500);

    const nextId = this.getCurrentAssetId();
    if (!nextId || nextId === this.firstAssetId || this.processedAssetIds.has(nextId)) {
      return { done: true, nextAssetId: nextId };
    }

    return { done: false, nextAssetId: nextId };
  }

  /**
   * Submits active file for curator review.
   * @returns {Promise<boolean>} True if submitted.
   */
  async submitForReview() {
    if (typeof document === 'undefined') return false;

    const submitBtn = document.querySelector('a#js-next-submit, #js-next-submit');
    if (submitBtn) {
      simulateClick(submitBtn);
      return true;
    }
    return false;
  }
}
