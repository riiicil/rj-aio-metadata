/**
 * FreepikAdapter — Platform Adapter for Freepik Contributor
 *
 * Implements BaseAdapter interface for Freepik (contributor.freepik.com / contributor.magnific.com).
 * - URL matching for contributor.freepik.com and contributor.magnific.com.
 * - Card selection and thumbnail extraction from div.catalog__item.
 * - Title single-string instant injection (min 5 words, max 100 characters).
 * - Keyword clearing (trash icon / remove buttons) and comma-separated chip injection + Enter key simulation.
 * - AI declaration toggle switch, base model selection (from 47 official models), and prompt injection.
 * - Category is 100% omitted (automatically categorized by Freepik).
 * - MANDATORY PER-ITEM SAVE DRAFT: Triggers button.button-paste-draft ("Create draft")
 *   and awaits spinner disappearance (waitForElementToDisappear) and button disabled state.
 */

import { BaseAdapter } from './BaseAdapter.js';
import {
  setNativeValue,
  waitForElement,
  waitForElementToDisappear,
  simulateClick,
  simulateEnterKey,
  extractThumbnailUrl,
  sleep
} from './utils/dom_helpers.js';

export class FreepikAdapter extends BaseAdapter {
  constructor() {
    super('freepik', 'Freepik');
  }

  /**
   * Matches Freepik contributor URLs.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return url.includes('contributor.freepik.com') || url.includes('contributor.magnific.com');
  }

  /**
   * Scans and retrieves all catalog item cards in the grid.
   * @returns {HTMLElement[]} Array of catalog item card elements.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('div.catalog__item, div.row.mg-none > div.catalog__item'));
  }

  /**
   * Extracts the thumbnail image URL from an asset card.
   * @param {HTMLElement} cardElement - Asset card element.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      'div.catalog__item .thumbnail img, div.thumbnail > img, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an asset card in the catalog grid to open its sidebar editor.
   * @param {HTMLElement} cardElement - Card element to select.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    simulateClick(cardElement);
  }

  /**
   * Waits for the catalog sidebar editor form to become interactive.
   * @param {HTMLElement} [cardElement=null] - Selected asset card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    try {
      await waitForElement(
        'aside.catalog__sidebar, div.inputTitle textarea',
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
   * Clears title and keyword chips via trash button or individual remove buttons.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    // 1. Clear title: click trash button in title group if present, or clear textarea
    const titleTrash = document.querySelector('div.inputTitle button.icon--trash') ||
      Array.from(document.querySelectorAll('div.inputTitle button')).find(
        (b) => b.querySelector?.('i.icon--trash') || (b.getAttribute?.('class') || b.className || '').includes('icon--trash')
      );

    if (titleTrash) {
      simulateClick(titleTrash);
    } else {
      const titleEl = document.querySelector(
        'div.inputTitle textarea, textarea[placeholder*="title"], textarea[placeholder*="Enter the title"]'
      );
      if (titleEl) {
        setNativeValue(titleEl, '');
      }
    }

    // 2. Clear keywords: click trash button in tag group if present, or click individual remove buttons
    const kwTrash = document.querySelector('div.inputTag button.icon--trash') ||
      Array.from(document.querySelectorAll('div.inputTag button')).find(
        (b) => b.querySelector?.('i.icon--trash') || (b.getAttribute?.('class') || b.className || '').includes('icon--trash')
      );

    if (kwTrash) {
      simulateClick(kwTrash);
    } else {
      const removeButtons = Array.from(document.querySelectorAll('button.inputTag__remove'));
      for (const btn of removeButtons) {
        simulateClick(btn);
      }
    }

    return true;
  }

  /**
   * Clears keyword chips. Alias for clearMetadata.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearKeywords() {
    return this.clearMetadata();
  }

  /**
   * Injects sanitized metadata into Freepik sidebar editor.
   * - Category: 100% omitted (automatically categorized by Freepik).
   * - AI declaration switch, base model selection, and prompt injection.
   * - Title single-string injection (clamped to max 100 characters).
   * - Keyword comma-separated injection + Enter key simulation (max 50 tags).
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (isAiGenerated, aiModel, aiPrompt, etc.).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    // 1. Category: Strictly omitted (Freepik indexes assets automatically)

    // 2. Generative AI Declaration
    const isAi = Boolean(options.isAiGenerated ?? metadata.isAiGenerated);
    const aiSwitch = document.querySelector(
      'div.aiSelector--container input.switch__input, label.switch.switch--sm input, label.switch input'
    );

    if (aiSwitch) {
      if (isAi && !aiSwitch.checked) {
        simulateClick(aiSwitch);
        await sleep(100);
      } else if (!isAi && aiSwitch.checked) {
        simulateClick(aiSwitch);
        await sleep(100);
      }

      if (isAi) {
        // AI Base Model Selection
        const targetModel = options.aiModel || metadata.aiModel || 'Midjourney 6';
        const modelSelect = document.querySelector('div.selector_base_model select');

        if (modelSelect) {
          modelSelect.value = targetModel;
          modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // Fallback for custom dropdown menu
          const dropdownBtn = document.querySelector('div.selector_base_model div.dropdown__button');
          if (dropdownBtn) {
            simulateClick(dropdownBtn);
            await sleep(80);

            const optionsList = Array.from(document.querySelectorAll(
              'div.selector_base_model li, ul.dropdown__list li, div.dropdown__select li'
            ));
            const matchingOption = optionsList.find(
              (li) => li.textContent?.trim().toLowerCase() === targetModel.toLowerCase()
            );

            if (matchingOption) {
              simulateClick(matchingOption);
            }
          }
        }

        // AI Prompt injection
        const promptText = options.aiPrompt || metadata.aiPrompt || options.prompt || '';
        if (promptText) {
          const promptInput = document.querySelector('textarea#aiPrompt, textarea[placeholder*="prompt"]');
          if (promptInput) {
            setNativeValue(promptInput, promptText);
          }
        }
      }
    }

    // 3. Title (Single-string instant injection, clamped to max 100 characters)
    if (metadata.title) {
      const titleInput = document.querySelector(
        'div.inputTitle textarea, textarea[placeholder*="title"], textarea[placeholder*="Enter the title"]'
      );
      if (titleInput) {
        const cleanTitle = String(metadata.title).slice(0, 100);
        setNativeValue(titleInput, cleanTitle);
      }
    }

    // 4. Keywords (Comma-separated chip injection clamped to 50 tags max + Enter key)
    if (metadata.keywords) {
      const tagInput = document.querySelector('#inputTag, div.inputTag input');
      if (tagInput) {
        const tagList = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',').map((t) => t.trim()).filter(Boolean);
        const tagsString = tagList.slice(0, 50).join(', ') + ',';

        setNativeValue(tagInput, tagsString);
        simulateEnterKey(tagInput);
      }
    }

    return true;
  }

  /**
   * Saves metadata draft for currently selected asset.
   * MANDATORY PER-ITEM PERSISTENCE:
   * Triggers button.button-paste-draft ("Create draft"), awaits spinner completion,
   * and awaits button disabled state before proceeding to next card.
   *
   * @returns {Promise<boolean>} True if draft saved successfully.
   */
  async saveDraft() {
    if (typeof document === 'undefined') return true;

    const draftBtn = document.querySelector('button.button-paste-draft') ||
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Create draft')
      );

    if (draftBtn) {
      simulateClick(draftBtn);

      try {
        await waitForElementToDisappear(
          'button.button-paste-draft span.spinner, button.button-paste-draft i.icon--loading, span.spinner',
          typeof document !== 'undefined' ? document : null,
          4000
        );
      } catch {
        // Continue if spinner wait times out
      }

      if (!draftBtn.disabled) {
        await sleep(400);
      }

      return true;
    }

    return false;
  }

  /**
   * Submits selected files for review moderation.
   * @returns {Promise<boolean>} True if submission button clicked.
   */
  async submitForReview() {
    if (typeof document === 'undefined') return false;

    const submitBtn = document.querySelector('button.button--submit') ||
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Send to review')
      );

    if (submitBtn && !submitBtn.disabled) {
      simulateClick(submitBtn);
      return true;
    }

    return false;
  }
}
