/**
 * DreamstimeAdapter — Platform Adapter for Dreamstime Contributor
 *
 * Implements BaseAdapter interface for Dreamstime (dreamstime.com):
 * - URL matching for dreamstime.com (especially /uploadfile and /upload/edit*).
 * - Modal detection and asset card extraction (div.upload-item[id], modal container div.popup-upload).
 * - Thumbnail extraction (div.upload-item__thumb img, .popup-upload img, background-image).
 * - Granular condition-checked metadata clearing (#js-remove-title, #js-remove-all-description, #js-remove-cat*, #js-remove-all-key).
 * - Category pairs interaction with asynchronous subcategory option polling (select#M_Category_1/2/3 -> select#M_Subcategory_1/2/3).
 *   AI Mode Special Rule: Category 3 is hardcoded to "Illustration & Clipart" and "Generative AI".
 * - Keywords single-word per tag splitting, deduplication, and chip injection (clamped <= 70 tags).
 * - License type selection: Commercial (RF) vs Editorial (ED) in #licensesubmissiontype.
 * - Save Draft with Toast Confirmation: clicks #js-savededits, awaits toast appearance AND disappearance.
 * - Submit for Review: clicks #submitbutton, awaits toast appearance AND disappearance.
 * - Next item navigation with Infinite Carousel Loop Guard: tracks processed asset IDs and stops when cycling.
 * - Comprehensive LoggerService integration across all steps.
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
import { PLATFORM_CATEGORIES } from '../services/AiPrompt.js';

/**
 * Resolves a Dreamstime category or subcategory name (or ID) to its numeric ID.
 *
 * @param {string|number} target - Category name, alias, or numeric ID
 * @param {string|number} [parentMainId=null] - Optional parent main category ID for scoping subcategories
 * @returns {string|null} Numeric ID string or null if unresolvable
 */
export function resolveDreamstimeCategoryId(target, parentMainId = null) {
  if (target === null || target === undefined) return null;
  const str = String(target).trim();
  if (/^\d+$/.test(str)) {
    return str;
  }

  const norm = str
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\bdan\b/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Check Main Categories
  const mainMap = {
    'abstract': '38',
    'animals': '29',
    'animal': '29',
    'arts architecture': '69',
    'arts': '69',
    'art': '69',
    'the arts': '69',
    'architecture': '69',
    'business': '74',
    'editorial': '177',
    'holidays': '188',
    'holiday': '188',
    'seasonal': '188',
    'it c': '108',
    'it': '108',
    'computers': '108',
    'illustrations clipart': '172',
    'illustration clipart': '172',
    'illustrations': '172',
    'illustration': '172',
    'clipart': '172',
    'industries': '86',
    'industry': '86',
    'industrial': '86',
    'nature': '8',
    'objects': '133',
    'object': '133',
    'people': '114',
    'person': '114',
    'portraits': '114',
    'technology': '103',
    'transportation': '55',
    'transport': '55',
    'travel': '55',
    'web design graphics': '197',
    'web design': '197',
    'graphics': '197'
  };

  if (mainMap[norm]) {
    return mainMap[norm];
  }

  // Indonesian Main Category Translations
  const idMainTranslations = {
    'abstrak': '38',
    'hewan': '29',
    'seni arsitektur': '69',
    'seni': '69',
    'arsitektur': '69',
    'bisnis': '74',
    'liburan': '188',
    'ti k': '108',
    'ti': '108',
    'komputer': '108',
    'ilustrasi clipart': '172',
    'ilustrasi': '172',
    'industri': '86',
    'alam': '8',
    'objek': '133',
    'orang': '114',
    'teknologi': '103',
    'perjalanan': '55',
    'transportasi': '55',
    'grafis desain web': '197',
    'desain web': '197'
  };

  if (idMainTranslations[norm]) {
    return idMainTranslations[norm];
  }

  // 2. Check Subcategories from PLATFORM_CATEGORIES.dreamstime
  const checkSubMap = (subcategories) => {
    for (const [id, name] of Object.entries(subcategories || {})) {
      const nameNorm = name
        .toLowerCase()
        .replace(/&/g, ' ')
        .replace(/\band\b/g, ' ')
        .replace(/\bdan\b/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (nameNorm === norm || name.toLowerCase() === str.toLowerCase()) {
        return String(id);
      }
    }
    return null;
  };

  // If parent main category provided, check its subcategories first
  if (parentMainId && PLATFORM_CATEGORIES?.dreamstime) {
    for (const catData of Object.values(PLATFORM_CATEGORIES.dreamstime)) {
      if (String(catData.id) === String(parentMainId) && catData.subcategories) {
        const found = checkSubMap(catData.subcategories);
        if (found) return found;
      }
    }
  }

  // Search all subcategories across all main categories
  if (PLATFORM_CATEGORIES?.dreamstime) {
    for (const catData of Object.values(PLATFORM_CATEGORIES.dreamstime)) {
      if (catData.subcategories) {
        const found = checkSubMap(catData.subcategories);
        if (found) return found;
      }
    }
  }

  // Indonesian / common subcategory overrides
  const commonSubOverrides = {
    'generative ai': '212',
    'ai generatif': '212',
    'artificial intelligence': '210',
    'kecerdasan buatan': '210',
    '3d computer generated': '166',
    '3d buatan komputer': '166',
    'hand drawn artistic': '167',
    'lukisan tangan': '167',
    'vector': '186',
    'vektor': '186',
    'landscapes': '146',
    'landscape': '146',
    'pemandangan': '146',
    'backgrounds': '112',
    'background': '112',
    'latar belakang': '112',
    'wildlife': '168',
    'satwa liar': '168',
    'celebrities': '178',
    'artis': '178'
  };

  if (commonSubOverrides[norm]) {
    return commonSubOverrides[norm];
  }

  return null;
}

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

    // 1. Direct filename link
    const filenameLink = document.querySelector('#js-originalfilename');
    if (filenameLink) {
      const match = (filenameLink.textContent || '').match(/(\d{7,12})/);
      if (match) return match[1];
    }

    // 2. Breadcrumbs container
    const header = document.querySelector('.popup-nav__breadcrumbs, .popup-nav');
    if (header) {
      const match = (header.textContent || '').match(/(\d{7,12})/);
      if (match) return match[1];
    }

    // 3. Modal container attributes
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

    // 4. URL path fallback (e.g. /upload/edit473814624)
    if (typeof window !== 'undefined' && window.location?.pathname) {
      const match = window.location.pathname.match(/\/upload\/edit(\d{7,12})/i);
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

    // 1. Check img tags
    const img = cardElement.querySelector?.(
      'div.upload-item__thumb img, .popup-upload img, .popup-upload__img img, img'
    );
    if (img) {
      const url = extractThumbnailUrl(img);
      if (url) return url;
    }

    // 2. Check CSS background-image on preview containers
    const bgContainer = cardElement.querySelector?.(
      '.popup-upload__img, div.upload-item__thumb, [style*="background-image"]'
    );
    if (bgContainer && bgContainer.style && bgContainer.style.backgroundImage) {
      const match = bgContainer.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/i);
      if (match && match[1]) return match[1];
    }

    return extractThumbnailUrl(cardElement);
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
        'input#title, textarea#description, select#M_Category_1',
        typeof document !== 'undefined' ? document : null,
        timeoutMs
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears pre-existing title if populated using button x (#js-remove-title).
   */
  async clearTitleIfNotEmpty() {
    if (typeof document === 'undefined') return;
    const titleInput = document.querySelector('input#title, input[name="M_title"]');
    const clearBtn = document.querySelector('#js-remove-title, a#js-remove-title');
    const hasValue = Boolean(titleInput && titleInput.value && titleInput.value.trim().length > 0);
    const isBtnVisible = Boolean(clearBtn && clearBtn.getAttribute('data-state') !== 'hidden');

    if (hasValue || isBtnVisible) {
      logger.step('Clearing pre-existing title...');
      if (clearBtn) {
        simulateClick(clearBtn);
      } else if (titleInput) {
        setNativeValue(titleInput, '');
      }
      await sleep(150);
      if (titleInput && titleInput.value.trim().length > 0) {
        setNativeValue(titleInput, '');
      }
    } else {
      logger.info('Title is already empty. Skipping clear.');
    }
  }

  /**
   * Clears pre-existing description if populated using button x (#js-remove-all-description).
   */
  async clearDescriptionIfNotEmpty() {
    if (typeof document === 'undefined') return;
    const descInput = document.querySelector('textarea#description, textarea[name="M_description"]');
    const clearBtn = document.querySelector(
      '#js-remove-all-description, a#js-remove-all-description, .js-editcleandescription'
    );
    const hasValue = Boolean(descInput && descInput.value && descInput.value.trim().length > 0);
    const isBtnVisible = Boolean(clearBtn && clearBtn.getAttribute('data-state') !== 'hidden');

    if (hasValue || isBtnVisible) {
      logger.step('Clearing pre-existing description...');
      if (clearBtn) {
        simulateClick(clearBtn);
      } else if (descInput) {
        setNativeValue(descInput, '');
      }
      await sleep(150);
      if (descInput && descInput.value.trim().length > 0) {
        setNativeValue(descInput, '');
      }
    } else {
      logger.info('Description is already empty. Skipping clear.');
    }
  }

  /**
   * Clears pre-existing categories if populated using button x (#js-remove-cat or #js-remove-cat1/2/3).
   */
  async clearCategoriesIfNotEmpty() {
    if (typeof document === 'undefined') return;
    const c1 = document.querySelector('select#M_Category_1, select[name="M_Category_1"]');
    const c2 = document.querySelector('select#M_Category_2, select[name="M_Category_2"]');
    const c3 = document.querySelector('select#M_Category_3, select[name="M_Category_3"]');
    const clearAllBtn = document.querySelector(
      '#js-remove-cat, a#js-remove-cat, .popup__row--categories .js-editcleancategories'
    );
    const cat1Btn = document.querySelector('#js-remove-cat1, a#js-remove-cat1');
    const cat2Btn = document.querySelector('#js-remove-cat2, a#js-remove-cat2');
    const cat3Btn = document.querySelector('#js-remove-cat3, a#js-remove-cat3');

    const isAnySet = (c1 && c1.value && c1.value !== '0') ||
                     (c2 && c2.value && c2.value !== '0') ||
                     (c3 && c3.value && c3.value !== '0');
    const isBtnVisible = Boolean(
      (clearAllBtn && clearAllBtn.getAttribute('data-state') !== 'hidden') ||
      (cat1Btn && cat1Btn.getAttribute('data-state') !== 'hidden') ||
      (cat2Btn && cat2Btn.getAttribute('data-state') !== 'hidden') ||
      (cat3Btn && cat3Btn.getAttribute('data-state') !== 'hidden')
    );

    if (isAnySet || isBtnVisible || cat1Btn || clearAllBtn) {
      logger.step('Clearing pre-existing categories...');
      if (clearAllBtn) {
        simulateClick(clearAllBtn);
        await sleep(150);
      }
      if (cat1Btn) simulateClick(cat1Btn);
      if (cat2Btn) simulateClick(cat2Btn);
      if (cat3Btn) simulateClick(cat3Btn);
      await sleep(150);
    } else {
      logger.info('Categories already empty. Skipping clear.');
    }
  }

  /**
   * Clears pre-existing keywords if populated using button x (#js-remove-all-key).
   */
  async clearKeywordsIfNotEmpty() {
    if (typeof document === 'undefined') return;
    const clearBtn = document.querySelector(
      '#js-remove-all-key, a#js-remove-all-key, .js-editcleankeywords'
    );
    const kwInput = document.querySelector('input#keywords_tag, div.popup__row--keywords input');
    const existingChips = document.querySelectorAll(
      'div.popup__row--keywords .tag, div.popup__row--keywords .label-tag, div.popup__row--keywords [data-tag]'
    );
    const isBtnVisible = Boolean(clearBtn && clearBtn.getAttribute('data-state') !== 'hidden');
    const hasChips = existingChips.length > 0 || Boolean(kwInput && kwInput.value && kwInput.value.trim().length > 0);

    if (hasChips || isBtnVisible) {
      logger.step('Clearing pre-existing keywords...');
      if (clearBtn) {
        simulateClick(clearBtn);
      } else if (kwInput) {
        setNativeValue(kwInput, '');
      }
      await sleep(150);
    } else {
      logger.info('Keywords already empty. Skipping clear.');
    }
  }

  /**
   * Clears old metadata fields (title, description, categories, keywords) prior to injection.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    await this.clearTitleIfNotEmpty();
    await this.clearDescriptionIfNotEmpty();
    await this.clearCategoriesIfNotEmpty();
    await this.clearKeywordsIfNotEmpty();
    await sleep(100);
    return true;
  }

  /**
   * Clears keywords.
   * @returns {Promise<boolean>}
   */
  async clearKeywords() {
    await this.clearKeywordsIfNotEmpty();
    return true;
  }

  /**
   * Helper to match and select an option in a native <select> element.
   * Prioritizes immutable numeric ID matching for language resilience, with text fallback.
   * @private
   * @param {HTMLSelectElement} selectEl - Target select element.
   * @param {string|number} target - Value, name, or numeric ID to match.
   * @param {string|number} [parentMainId=null] - Optional parent main category ID for subcategory resolution.
   * @returns {boolean} True if matched.
   */
  _matchAndSelectOption(selectEl, target, parentMainId = null) {
    if (!selectEl || target === null || target === undefined) return false;
    const str = String(target).trim().toLowerCase();
    const resolvedId = resolveDreamstimeCategoryId(target, parentMainId);

    if (selectEl.options && selectEl.options.length > 0) {
      // 1. First priority: match by immutable numeric ID
      if (resolvedId) {
        for (const opt of selectEl.options) {
          const optVal = String(opt.value ?? '').trim();
          if (optVal === String(resolvedId)) {
            selectEl.value = opt.value;
            return true;
          }
        }
      }

      // 2. Direct match on value or text
      for (const opt of selectEl.options) {
        const optVal = String(opt.value ?? '').trim().toLowerCase();
        const optText = String(opt.textContent || opt.text || '').trim().toLowerCase();

        // Direct match on value or text
        if (optVal === str || optText === str) {
          selectEl.value = opt.value;
          return true;
        }

        // Substring match
        if (str.length > 3 && (optText.includes(str) || str.includes(optText))) {
          selectEl.value = opt.value;
          return true;
        }

        // Normalized match (ignore trailing 's' for plural variation e.g. illustration vs illustrations)
        const normStr = str.replace(/\b([a-z]+)s\b/g, '$1');
        const normOpt = optText.replace(/\b([a-z]+)s\b/g, '$1');
        if (normOpt.includes(normStr) || normStr.includes(normOpt)) {
          selectEl.value = opt.value;
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Helper to set a category / subcategory select pair with active option polling.
   * Resolves immutable numeric IDs, dispatches input and change events, then polls for subcategory options.
   * @param {HTMLSelectElement} catSelect - Category select element.
   * @param {HTMLSelectElement} subcatSelect - Dependent subcategory select element.
   * @param {string|number} mainVal - Main category value, name, or numeric ID.
   * @param {string|number} subVal - Subcategory value, name, or numeric ID.
   * @returns {Promise<boolean>}
   */
  async setCategoryPair(catSelect, subcatSelect, mainVal, subVal) {
    if (!catSelect || !mainVal) return false;

    // 1. Select Main Category
    const resolvedMainId = resolveDreamstimeCategoryId(mainVal);
    const matchedMain = this._matchAndSelectOption(catSelect, mainVal);
    if (!matchedMain) {
      catSelect.value = String(resolvedMainId || mainVal);
    }
    catSelect.dispatchEvent(new Event('input', { bubbles: true }));
    catSelect.dispatchEvent(new Event('change', { bubbles: true }));

    // 2. Poll for Subcategory Options to load (Dreamstime AJAX latency)
    if (subcatSelect && subVal) {
      const parentId = resolvedMainId || catSelect.value;
      const pollStart = Date.now();
      while (subcatSelect.options && subcatSelect.options.length <= 1 && (Date.now() - pollStart) < 3000) {
        await sleep(100);
      }
      await sleep(150);

      // 3. Select Subcategory
      const resolvedSubId = resolveDreamstimeCategoryId(subVal, parentId);
      const matchedSub = this._matchAndSelectOption(subcatSelect, subVal, parentId);
      if (!matchedSub) {
        subcatSelect.value = String(resolvedSubId || subVal);
      }
      subcatSelect.dispatchEvent(new Event('input', { bubbles: true }));
      subcatSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return true;
  }

  /**
   * Sets the license type to Commercial (RF) or Editorial (ED) at #licensesubmissiontype.
   * @param {boolean} [isEditorial=false]
   */
  async setLicenseType(isEditorial = false) {
    if (typeof document === 'undefined') return;

    const container = document.querySelector('#licensesubmissiontype');
    const links = container ? Array.from(container.querySelectorAll('a')) : [];

    const comBtn = links[0] ||
      document.querySelector('#licensesubmissiontype > a:nth-of-type(1)') ||
      Array.from(document.querySelectorAll('#licensesubmissiontype a, a')).find(a => a.textContent && a.textContent.includes('Commercial'));
    const edBtn = links[1] ||
      document.querySelector('#licensesubmissiontype > a:nth-of-type(2)') ||
      Array.from(document.querySelectorAll('#licensesubmissiontype a, a')).find(a => a.textContent && a.textContent.includes('Editorial'));

    const targetBtn = isEditorial ? edBtn : comBtn;
    const targetLabel = isEditorial ? 'Editorial (ED)' : 'Commercial (RF)';

    if (targetBtn) {
      const isActive = targetBtn.getAttribute?.('data-state') === 'active' ||
                       Boolean(targetBtn.classList?.contains?.('active'));
      if (!isActive) {
        logger.step(`Setting License Type to ${targetLabel}...`);
        simulateClick(targetBtn);
        await sleep(250);
      } else {
        logger.info(`License Type already set to ${targetLabel}.`);
      }
    }
  }

  /**
   * Injects sanitized metadata into Dreamstime edit modal sequentially.
   * - Step 1: Clear old title -> Fill title.
   * - Step 2: Clear old description -> Fill description.
   * - Step 3: Clear old categories.
   * - Step 4: Fill Main Cat 1 & Subcat 1 (with option polling).
   * - Step 5: Fill Main Cat 2 & Subcat 2 (with option polling).
   * - Step 6: Fill Main Cat 3 & Subcat 3 (AI Mode: "Illustration & Clipart" / "Generative AI").
   * - Step 7: Clear old keywords.
   * - Step 8: Fill Keywords (split multi-words into single words, clamped <= 70 tags).
   * - Step 9: Set License Type (Commercial RF vs Editorial ED).
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (isAiGenerated, isEditorial, licenseType, clearExisting).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    logger.banner('Injecting Dreamstime metadata sequentially...');

    // 1. Clear Title if populated
    if (options.clearExisting !== false) {
      await this.clearTitleIfNotEmpty();
      await sleep(150);
    }

    // 2. Fill Title
    const titleInput = document.querySelector('input#title, input[name="M_title"]');
    if (titleInput && metadata.title) {
      logger.step(`Injecting title: "${metadata.title.slice(0, 40)}..."`);
      setNativeValue(titleInput, metadata.title);
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(250);
    }

    // 3. Clear Description if populated
    if (options.clearExisting !== false) {
      await this.clearDescriptionIfNotEmpty();
      await sleep(150);
    }

    // 4. Fill Description
    const descInput = document.querySelector('textarea#description, textarea[name="M_description"]');
    if (descInput && metadata.description) {
      logger.step(`Injecting description: "${metadata.description.slice(0, 40)}..."`);
      setNativeValue(descInput, metadata.description);
      descInput.dispatchEvent(new Event('input', { bubbles: true }));
      descInput.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(250);
    }

    // 5. Clear Categories if populated
    if (options.clearExisting !== false) {
      await this.clearCategoriesIfNotEmpty();
      await sleep(150);
    }

    // 6. Category Pairs
    const categories = metadata.categories || options.categories || [];
    const isAi = Boolean(options.isAiGenerated);

    // Category 1
    const cat1 = categories[0];
    if (cat1) {
      const c1Select = document.querySelector('select#M_Category_1, select[name="M_Category_1"]');
      const s1Select = document.querySelector('select#M_Subcategory_1, select[name="M_Subcategory_1"]');
      const m1 = cat1.main || cat1.mainId || cat1.categoryId || cat1;
      const sub1 = cat1.sub || cat1.subId || cat1.subcategoryId;
      logger.step(`Setting Category 1: Main="${m1}", Sub="${sub1}"...`);
      await this.setCategoryPair(c1Select, s1Select, m1, sub1);
      await sleep(250);
    }

    // Category 2
    const cat2 = categories[1];
    if (cat2) {
      const c2Select = document.querySelector('select#M_Category_2, select[name="M_Category_2"]');
      const s2Select = document.querySelector('select#M_Subcategory_2, select[name="M_Subcategory_2"]');
      const m2 = cat2.main || cat2.mainId || cat2.categoryId || cat2;
      const sub2 = cat2.sub || cat2.subId || cat2.subcategoryId;
      logger.step(`Setting Category 2: Main="${m2}", Sub="${sub2}"...`);
      await this.setCategoryPair(c2Select, s2Select, m2, sub2);
      await sleep(250);
    }

    // Category 3 (Special AI Mode Rule or standard 3rd category)
    const c3Select = document.querySelector('select#M_Category_3, select[name="M_Category_3"]');
    const s3Select = document.querySelector('select#M_Subcategory_3, select[name="M_Subcategory_3"]');
    if (isAi) {
      logger.step('AI Declaration active: Setting Category 3 to "Illustrations & Clipart" (172) / "Generative AI" (212)...');
      await this.setCategoryPair(c3Select, s3Select, 172, 212);
      await sleep(250);
    } else if (categories[2]) {
      const cat3 = categories[2];
      const m3 = cat3.main || cat3.mainId || cat3.categoryId || cat3;
      const sub3 = cat3.sub || cat3.subId || cat3.subcategoryId;
      logger.step(`Setting Category 3: Main="${m3}", Sub="${sub3}"...`);
      await this.setCategoryPair(c3Select, s3Select, m3, sub3);
      await sleep(250);
    }

    // 7. Clear Keywords if populated
    if (options.clearExisting !== false) {
      await this.clearKeywordsIfNotEmpty();
      await sleep(150);
    }

    // 8. Keywords: Single-word per tag splitting, deduplication, clamped <= 70 tags
    if (metadata.keywords && metadata.keywords.length > 0) {
      const kwInput = document.querySelector('input#keywords_tag, div.popup__row--keywords input');
      if (kwInput) {
        const rawKeywords = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',');

        const seenWords = new Set();
        const cleanSingleWords = [];

        for (const kw of rawKeywords) {
          const parts = String(kw || '')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length >= 2);

          for (const word of parts) {
            if (!seenWords.has(word)) {
              seenWords.add(word);
              cleanSingleWords.push(word);
            }
          }
        }

        const finalTags = cleanSingleWords.slice(0, 70).join(', ');
        logger.step(`Injecting ${cleanSingleWords.slice(0, 70).length} single-word keywords...`);
        kwInput.focus();
        setNativeValue(kwInput, finalTags);
        simulateEnterKey(kwInput);
        kwInput.dispatchEvent(new Event('input', { bubbles: true }));
        kwInput.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300);
      }
    }

    // 9. License Type Selection: Commercial (RF) vs Editorial (ED)
    const isEditorial = Boolean(options.isEditorial || options.licenseType === 'editorial');
    await this.setLicenseType(isEditorial);

    logger.success('Metadata injection completed for current asset.');
    return true;
  }

  /**
   * Saves current edits as draft and awaits toast appearance AND disappearance.
   * @returns {Promise<boolean>} True if draft saved.
   */
  async saveDraft() {
    if (typeof document === 'undefined') return true;

    const saveBtn = document.querySelector('#js-savededits, div#js-savededits');
    if (!saveBtn) {
      logger.warn('Save edits button (#js-savededits) not found.');
      return false;
    }

    logger.step('Clicking "Save edits" button (#js-savededits)...');
    simulateClick(saveBtn);

    // 1. Wait for noty toast or success message to appear (up to 4000ms)
    logger.step('Waiting for save confirmation toast to appear...');
    let toast = null;
    const appearStart = Date.now();
    while ((Date.now() - appearStart) < 4000) {
      toast = document.querySelector(
        '.noty_bar.noty_type__dt-success, #noty_layout__bottomRight .noty_bar, #js-submit-message:not([style*="none"])'
      );
      if (toast && !toast.getAttribute('style')?.includes('display: none')) {
        break;
      }
      await sleep(150);
    }

    // 2. Wait for noty toast to disappear completely from DOM (up to 8000ms)
    if (toast) {
      logger.step('Save toast appeared. Waiting for toast to disappear...');
      const disappearStart = Date.now();
      while ((Date.now() - disappearStart) < 8000) {
        const activeToast = document.querySelector(
          '.noty_bar.noty_type__dt-success, #noty_layout__bottomRight .noty_bar'
        );
        if (!activeToast || activeToast.classList.contains('noty_effects_close') || activeToast.getAttribute('style')?.includes('display: none')) {
          break;
        }
        await sleep(200);
      }
      logger.success('Save toast resolved. Edits saved successfully.');
    } else {
      logger.info('No toast detected or status updated immediately.');
    }

    await sleep(300);
    return true;
  }

  /**
   * Submits active file for curator review (Mode B: Submit Immediately) and waits for toast disappearance.
   * @param {boolean} [isEditorial=false]
   * @returns {Promise<boolean>} True if submitted.
   */
  async submitForReview(isEditorial = false) {
    if (typeof document === 'undefined') return false;

    const submitBtn = document.querySelector(
      'a#submitbutton, #submitbutton, a#js-next-submit, #js-next-submit'
    );
    if (!submitBtn) {
      logger.warn('Submit button (#submitbutton) not found.');
      return false;
    }

    const label = isEditorial ? 'Submit editorial' : 'Submit commercial';
    logger.step(`Clicking "${label}" button (#submitbutton)...`);
    simulateClick(submitBtn);

    // 1. Wait for submit toast / notification to appear
    logger.step('Waiting for submit toast notification to appear...');
    let toast = null;
    const appearStart = Date.now();
    while ((Date.now() - appearStart) < 3000) {
      toast = document.querySelector(
        '.noty_bar, #noty_layout__bottomRight .noty_bar, #js-submit-message:not([style*="none"])'
      );
      if (toast && !toast.getAttribute('style')?.includes('display: none')) {
        break;
      }
      if (typeof process !== 'undefined' && !document.querySelector('#noty_layout__bottomRight, .noty_bar, #js-submit-message')) {
        break;
      }
      await sleep(150);
    }

    // 2. Wait for toast to disappear
    if (toast) {
      logger.step('Submit toast appeared. Waiting for toast to disappear...');
      const disappearStart = Date.now();
      while ((Date.now() - disappearStart) < 8000) {
        const activeToast = document.querySelector(
          '.noty_bar, #noty_layout__bottomRight .noty_bar'
        );
        if (!activeToast || activeToast.classList.contains('noty_effects_close') || activeToast.getAttribute('style')?.includes('display: none')) {
          break;
        }
        await sleep(200);
      }
      logger.success('Submit notification resolved.');
    }

    await sleep(400);
    return true;
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
      'a#js-next-submit.popup-nav__btn--next, #js-next-submit'
    );
    if (!nextArrow) {
      logger.info('Next button (#js-next-submit) not found. Finished all assets.');
      return { done: true, nextAssetId: null };
    }

    logger.step('Clicking next arrow (#js-next-submit)...');
    simulateClick(nextArrow);

    // Wait for asset ID or image to update (polling up to 5000ms)
    let nextId = null;
    const navStart = Date.now();
    while ((Date.now() - navStart) < 5000) {
      await sleep(200);
      const candId = this.getCurrentAssetId();
      if (candId && candId !== currentId) {
        nextId = candId;
        break;
      }
    }

    // Fallback: re-check ID
    if (!nextId) {
      nextId = this.getCurrentAssetId();
    }

    // If cycled back to first asset or already processed
    if (nextId && (nextId === this.firstAssetId || this.processedAssetIds.has(nextId))) {
      logger.banner(`Carousel loop cycle complete. Returned to first asset (ID: ${nextId}).`);
      return { done: true, nextAssetId: nextId };
    }

    // If modal closed or navigated away
    const modalActive = document.querySelector('div.popup-upload.popup-upload--submit, div.popup-upload');
    if (!modalActive && typeof window !== 'undefined' && !window.location.pathname.includes('/upload/edit')) {
      logger.info('Edit modal closed or returned to uploads. Automation complete.');
      return { done: true, nextAssetId: null };
    }

    logger.info(`Navigated to next asset (ID: ${nextId || 'unknown'}).`);
    return { done: false, nextAssetId: nextId };
  }
}
