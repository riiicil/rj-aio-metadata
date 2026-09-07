/**
 * VecteezyAdapter — Platform Adapter for Vecteezy Contributor
 *
 * Implements BaseAdapter interface for Vecteezy (contributors.vecteezy.com).
 * - URL matching for contributors.vecteezy.com.
 * - Card selection and thumbnail extraction from div[data-testid="resource-card"].
 * - License radio selection (Pro, Free, Editorial).
 * - Category is 100% ignored (auto-detected from file format by Vecteezy).
 * - AI software selection (Midjourney, Stable Diffusion, DALL·E) or "Other" with custom software text input.
 * - Title single-string instant injection (max 200 characters).
 * - Keyword clearing (remove svg icons) and comma-separated chip injection + Enter key simulation.
 * - Prohibited terms warning modal dismiss guard (div[data-testid="prohibited-terms-modal"]).
 * - Bulk save strategy: "Deselect all" -> "Select all" -> "Save changes" icon button.
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

export class VecteezyAdapter extends BaseAdapter {
  constructor() {
    super('vecteezy', 'Vecteezy');
  }

  /**
   * Matches Vecteezy contributor URLs.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return url.includes('contributors.vecteezy.com');
  }

  /**
   * Scans and retrieves all resource cards in the batch list.
   * @returns {HTMLElement[]} Array of resource card elements.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('div[data-testid="resource-card"], div.sc-dhNZpn'));
  }

  /**
   * Extracts the thumbnail image URL from a resource card.
   * @param {HTMLElement} cardElement - Asset card element.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      'div[data-testid="resource-card-preview"] img, div[data-testid="resource-card"] img, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects a resource card in the grid to open its sidebar editor.
   * @param {HTMLElement} cardElement - Card element to select.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    simulateClick(cardElement);
  }

  /**
   * Waits for the editor sidebar to become interactive.
   * @param {HTMLElement} [cardElement=null] - Selected asset card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    try {
      await waitForElement(
        'input#title-input, div[data-testid="resource-sidebar"], input[name="title"]',
        typeof document !== 'undefined' ? document : null,
        timeoutMs
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears old metadata fields (title, keywords) prior to new injection.
   * Clears title input and removes existing keyword chips.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    // 1. Clear title input
    const titleInput = document.querySelector('input#title-input, input[name="title"]');
    if (titleInput) {
      setNativeValue(titleInput, '');
    }

    // 2. Clear keyword chips
    await this.clearKeywords();

    return true;
  }

  /**
   * Clears active keyword chips by clicking remove SVG icons.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;

    const removeIcons = Array.from(document.querySelectorAll(
      'svg[data-testid="tag-remove"], div[data-testid="tag"] svg'
    ));

    for (const icon of removeIcons) {
      simulateClick(icon);
    }

    return true;
  }

  /**
   * Dismisses prohibited terms warning modal if present.
   * @returns {boolean} True if modal was detected and dismissed.
   */
  dismissProhibitedModal() {
    if (typeof document === 'undefined') return false;

    const modal = document.querySelector('div[data-testid="prohibited-terms-modal"]');
    if (modal) {
      const dismissBtn = modal.querySelector('div[data-testid="modal-actions"] button, button') ||
        document.querySelector('div[data-testid="modal-actions"] button') ||
        Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent && b.textContent.includes('Close')
        );

      if (dismissBtn) {
        simulateClick(dismissBtn);
        return true;
      }
    }

    return false;
  }

  /**
   * Injects sanitized metadata into Vecteezy sidebar editor.
   * - License radio selection (Pro, Free, Editorial).
   * - Category: 100% ignored (auto-detected from file format).
   * - AI software selection (Midjourney, Stable Diffusion, DALL·E) or "Other" with custom text input.
   * - Title single-string injection (max 200 characters).
   * - Keyword comma-separated injection + Enter key simulation (max 50 tags).
   * - Prohibited terms modal dismiss guard.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (licenseType, isAiGenerated, aiSoftware, customAiSoftware, etc.).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    // 1. Prohibited terms modal dismiss guard (check upfront)
    this.dismissProhibitedModal();

    // 2. License Selection Radio (Pro, Free, Editorial)
    const rawLicense = options.licenseType || options.license || metadata.licenseType || 'free';
    const normLicense = String(rawLicense).trim().toLowerCase();

    let targetValue = 'Free';
    if (normLicense === 'pro') {
      targetValue = 'Pro';
    } else if (normLicense === 'editorial') {
      targetValue = 'Editorial';
    }

    const licenseRadio = document.querySelector(
      `input[value="${targetValue}"], input[value="${targetValue.toLowerCase()}"]`
    ) || Array.from(document.querySelectorAll('label[data-testid="radio-input"], label')).find(
      (lbl) => lbl.textContent && lbl.textContent.trim().toLowerCase().includes(normLicense)
    )?.querySelector('input[type="radio"]');

    if (licenseRadio && !licenseRadio.checked) {
      simulateClick(licenseRadio);
    }

    // 3. Category: Strictly ignored (auto-detected from file format)

    // 4. Generative AI Declaration
    const isAi = Boolean(options.isAiGenerated ?? metadata.isAiGenerated);
    const aiCheckbox = document.querySelector(
      'div[data-testid="ai-generated-section"] input[type="checkbox"], span[data-testid="checkbox-no-label"] input'
    );

    if (aiCheckbox) {
      if (isAi && !aiCheckbox.checked) {
        simulateClick(aiCheckbox);
        await sleep(100);
      } else if (!isAi && aiCheckbox.checked) {
        simulateClick(aiCheckbox);
        await sleep(100);
      }

      if (isAi) {
        const software = options.aiSoftware || metadata.aiSoftware || 'Midjourney';
        const customTool = options.customAiSoftware || metadata.customAiSoftware || '';
        const normSoftware = String(software).trim().toLowerCase();

        // Open dropdown trigger if options list is not yet in DOM
        const dropdownTrigger = document.querySelector(
          'div[data-testid="ai-generated-section"] div[role="button"], div[data-testid="ai-generated-section"] div.MuiSelect-select'
        );
        if (dropdownTrigger) {
          simulateClick(dropdownTrigger);
          await sleep(60);
        }

        const isOther = normSoftware === 'other' || Boolean(customTool) ||
          (!normSoftware.includes('midjourney') && !normSoftware.includes('stable') && !normSoftware.includes('dall'));

        if (!isOther) {
          // Standard generator selection
          let targetDataVal = 'midjourney';
          if (normSoftware.includes('stable')) {
            targetDataVal = 'stable_diffusion';
          } else if (normSoftware.includes('dall')) {
            targetDataVal = 'dall_e';
          }

          const optionEl = document.querySelector(`li[data-value="${targetDataVal}"]`) ||
            Array.from(document.querySelectorAll('li.MuiMenuItem-root, ul[role="listbox"] li, li')).find(
              (li) => li.textContent && li.textContent.trim().toLowerCase().includes(normSoftware)
            );

          if (optionEl) {
            simulateClick(optionEl);
          }
        } else {
          // "Other" flow with custom software name input
          const otherOption = document.querySelector('li[data-value="other"]') ||
            Array.from(document.querySelectorAll('li.MuiMenuItem-root, ul[role="listbox"] li, li')).find(
              (li) => li.textContent && li.textContent.trim().toLowerCase().includes('other')
            );

          if (otherOption) {
            simulateClick(otherOption);
            await sleep(80);
          }

          const toolNameToInject = customTool || (normSoftware === 'other' ? '' : software);
          if (toolNameToInject) {
            const customInput = document.querySelector(
              'input#undefined-input, div[data-testid="ai-generated-section"] input[type="text"]'
            );
            if (customInput) {
              setNativeValue(customInput, toolNameToInject);
            }
          }
        }
      }
    }

    // 5. Title (Single-string instant injection, clamped to max 200 characters)
    if (metadata.title) {
      const titleInput = document.querySelector('input#title-input, input[name="title"]');
      if (titleInput) {
        const cleanTitle = String(metadata.title).slice(0, 200);
        setNativeValue(titleInput, cleanTitle);
      }
    }

    // 6. Keywords (Comma-separated chip injection clamped to 50 tags max + Enter key)
    if (metadata.keywords) {
      const kwInput = document.querySelector(
        'div[data-testid="tagger-input"] input, div[data-testid="tag-input"] input, input.sc-bFqpvU.sc-idvBfp'
      );
      if (kwInput) {
        const tagList = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',').map((t) => t.trim()).filter(Boolean);
        const tagsString = tagList.slice(0, 50).join(', ') + ',';

        setNativeValue(kwInput, tagsString);
        simulateEnterKey(kwInput);
      }
    }

    // 7. Prohibited modal dismiss guard (check after injection)
    await sleep(50);
    this.dismissProhibitedModal();

    return true;
  }

  /**
   * Bulk save strategy for Vecteezy:
   * 1. Clicks "Deselect all" button.
   * 2. Waits 200ms.
   * 3. Clicks "Select all" button.
   * 4. Waits 200ms.
   * 5. Clicks "Save changes" icon button.
   *
   * @returns {Promise<boolean>} True if bulk save triggered.
   */
  async bulkSave() {
    if (typeof document === 'undefined') return true;

    // 1. Click "Deselect all"
    const deselectBtn = document.querySelector(
      'div[data-testid="filter-bar"] button:has-text("Deselect all")'
    ) || Array.from(document.querySelectorAll('div[data-testid="filter-bar"] button, button')).find(
      (b) => b.textContent && b.textContent.includes('Deselect all')
    );

    if (deselectBtn) {
      simulateClick(deselectBtn);
    }

    await sleep(200);

    // 2. Click "Select all"
    const selectAllBtn = document.querySelector(
      'div[data-testid="filter-bar"] button:has-text("Select all")'
    ) || Array.from(document.querySelectorAll('div[data-testid="filter-bar"] button, button')).find(
      (b) => b.textContent && b.textContent.includes('Select all')
    );

    if (selectAllBtn) {
      simulateClick(selectAllBtn);
    }

    await sleep(200);

    // 3. Click "Save changes"
    const saveIcon = document.querySelector(
      'div[data-testid="save-changes-icon"], button[data-testid="save-changes-icon"], div.sc-bTuCdP'
    );

    if (saveIcon) {
      simulateClick(saveIcon);
      return true;
    }

    return true;
  }

  /**
   * Saves draft changes for currently selected asset.
   * @returns {Promise<boolean>} True if save clicked.
   */
  async saveDraft() {
    if (typeof document === 'undefined') return true;
    const saveIcon = document.querySelector(
      'div[data-testid="save-changes-icon"], button[data-testid="save-changes-icon"], div.sc-bTuCdP'
    );
    if (saveIcon) {
      simulateClick(saveIcon);
      return true;
    }
    return false;
  }

  /**
   * Submits selected assets for moderation review.
   * @returns {Promise<boolean>} True if submit clicked.
   */
  async submitForReview() {
    if (typeof document === 'undefined') return false;
    const submitBtn = document.querySelector('button[data-testid="submit-button"]') ||
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Submit')
      );

    if (submitBtn && !submitBtn.disabled) {
      simulateClick(submitBtn);
      return true;
    }

    return false;
  }
}
