/**
 * MiriCanvasAdapter — Platform Adapter for MiriCanvas DesignHub
 *
 * Implements BaseAdapter interface for MiriCanvas (designhub.miricanvas.com):
 * - URL matching for designhub.miricanvas.com.
 * - Element card extraction from batch grid (div.panda-ehlNbj div.panda-gFNlpN, div.css-1qnaji9).
 * - Thumbnail extraction (div.panda-ehlNbj img, div.css-pzwb7t img).
 * - Card selection: clicks card container element.
 * - Editor readiness wait (textarea[placeholder="Enter Element Name"]).
 * - Title clearing and single-string instant injection (clamped <= 100 characters).
 * - Keywords clearing (removes active chips via svg icons) and comma-separated tag injection + Enter (clamped <= 25 tags).
 * - Content Tier (Pricing) selection: STANDARD (Free) vs PREMIUM (Paid).
 * - AI Generated Declaration: checkbox toggle in AI image generator container.
 * - Content Type handling (optional): selects input[name="contentType"][value="..."] if provided.
 * - Bulk Save Strategy: clicks top navbar select all checkbox -> wait 200ms -> clicks "Save Metadata" button.
 * - Submit for review: clicks "Submit" button.
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

export class MiriCanvasAdapter extends BaseAdapter {
  constructor() {
    super('miricanvas', 'MiriCanvas');
  }

  /**
   * Matches MiriCanvas DesignHub URLs.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return url.includes('designhub.miricanvas.com');
  }

  /**
   * Scans and retrieves all element cards in the grid.
   * @returns {HTMLElement[]} Array of element card containers.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    return Array.from(
      document.querySelectorAll(
        'div.panda-ehlNbj div.panda-gFNlpN, div.css-1qnaji9.e1pyeb4g3, div.panda-ehlNbj > div, div.css-1qnaji9'
      )
    );
  }

  /**
   * Extracts the thumbnail image URL from an element card.
   * @param {HTMLElement} cardElement - Element card container.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      'div.panda-ehlNbj img, div.css-pzwb7t img, img.css-l67sxu, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an element card in the grid to open the sidebar editor.
   * @param {HTMLElement} cardElement - Element card to select.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    simulateClick(cardElement);
  }

  /**
   * Waits for the sidebar editor form to become interactive.
   * @param {HTMLElement} [cardElement=null] - Selected element card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    try {
      await waitForElement(
        'textarea[placeholder="Enter Element Name"], textarea.panda-eDQUvt',
        typeof document !== 'undefined' ? document : null,
        timeoutMs
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears old metadata fields (title textarea and keyword chips) prior to injection.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    // 1. Reset Title
    const titleInput = document.querySelector(
      'textarea[placeholder="Enter Element Name"], textarea.panda-eDQUvt'
    );
    if (titleInput) {
      setNativeValue(titleInput, '');
    }

    // 2. Clear Keywords
    await this.clearKeywords();

    await sleep(60);
    return true;
  }

  /**
   * Clears existing keyword chips by clicking remove SVG icons.
   * @returns {Promise<boolean>}
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;

    const removeButtons = Array.from(
      document.querySelectorAll(
        'div.panda-ebDdrq svg, span.panda-cfsavV svg, div.panda-ebDdrq path'
      )
    );

    for (const btn of removeButtons) {
      simulateClick(btn);
    }

    return true;
  }

  /**
   * Injects sanitized metadata into MiriCanvas sidebar editor.
   * - Content Tier: Standard (STANDARD) vs Premium (PREMIUM).
   * - AI Generated: toggles checkbox if option specifies.
   * - Content Type (optional): selects content type radio if provided.
   * - Element Name (Title): single-string instant injection clamped to 100 chars.
   * - Keywords: comma-separated injection clamped to 25 tags max + Enter key simulation.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (contentTier, isAiGenerated, contentType, clearExisting).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    if (options.clearExisting !== false) {
      await this.clearMetadata();
    }

    // 1. Content Tier (Pricing) Radio Selection
    if (options.contentTier === 'PREMIUM') {
      const tierRadio =
        document.querySelector('input[name="contentTier"][value="PREMIUM"]') ||
        Array.from(document.querySelectorAll('label')).find(
          (l) => l.textContent && l.textContent.includes('Premium')
        )?.querySelector('input');

      if (tierRadio && !tierRadio.checked) {
        simulateClick(tierRadio);
      }
    } else {
      const tierRadio =
        document.querySelector('input[name="contentTier"][value="STANDARD"]') ||
        Array.from(document.querySelectorAll('label')).find(
          (l) => l.textContent && l.textContent.includes('Standard')
        )?.querySelector('input');

      if (tierRadio && !tierRadio.checked) {
        simulateClick(tierRadio);
      }
    }

    // 2. AI Generated Content Checkbox
    const aiContainer = Array.from(document.querySelectorAll('div, label')).find(
      (el) => el.textContent && el.textContent.includes('AI image generator')
    );
    const aiCheckbox =
      aiContainer?.querySelector?.('input[type="checkbox"]') ||
      document.querySelector('div.panda-xPAgg input[type="checkbox"]');

    if (aiCheckbox) {
      const shouldCheck = Boolean(options.isAiGenerated);
      if (aiCheckbox.checked !== shouldCheck) {
        simulateClick(aiCheckbox);
      }
    }

    // 3. Content Type Radio Selection (Optional)
    if (options.contentType) {
      const typeRadio = document.querySelector(
        `input[name="contentType"][value="${options.contentType}"]`
      );
      if (typeRadio && !typeRadio.checked) {
        simulateClick(typeRadio);
      }
    }

    // 4. Element Name (Title): Clamped to <= 100 characters
    const nameTextarea = document.querySelector(
      'textarea[placeholder="Enter Element Name"], textarea.panda-eDQUvt'
    );
    if (nameTextarea && metadata.title) {
      const clampedTitle = String(metadata.title).trim().slice(0, 100);
      setNativeValue(nameTextarea, clampedTitle);
    }

    // 5. Keywords: Comma-separated injection clamped to 25 tags max + Enter key
    if (metadata.keywords && metadata.keywords.length > 0) {
      const kwInput = document.querySelector(
        'input[placeholder*="Separate multiple keywords"], input.panda-eNrFAg'
      );
      if (kwInput) {
        const rawKeywords = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',');

        const cleanTags =
          rawKeywords
            .map((k) => (typeof k === 'string' ? k.trim() : ''))
            .filter((k) => k.length > 0)
            .slice(0, 25)
            .join(', ') + ',';

        setNativeValue(kwInput, cleanTags);
        simulateEnterKey(kwInput);
      }
    }

    return true;
  }

  /**
   * Bulk Save Strategy: Selects all elements via navbar checkbox then clicks Save Metadata.
   * @returns {Promise<boolean>} True if bulk save executed.
   */
  async bulkSave() {
    if (typeof document === 'undefined') return false;

    // 1. Click top navbar "Select all" checkbox
    const selectAllCheckbox = document.querySelector(
      'nav div.panda-cVAOOe input[type="checkbox"], nav input[type="checkbox"]'
    );
    if (selectAllCheckbox && !selectAllCheckbox.checked) {
      simulateClick(selectAllCheckbox);
    }

    await sleep(200);

    // 2. Click "Save Metadata" button
    const saveBtn =
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Save Metadata')
      ) || document.querySelector('button.panda-YJgQP');

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
   * Submits selected elements for moderation review.
   * @returns {Promise<boolean>} True if submitted.
   */
  async submitForReview() {
    if (typeof document === 'undefined') return false;

    const submitBtn =
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && (b.textContent.trim() === 'Submit' || b.textContent.includes('Submit'))
      ) || document.querySelector('button.panda-YJgQP');

    if (submitBtn && !submitBtn.disabled) {
      simulateClick(submitBtn);
      return true;
    }
    return false;
  }
}
