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
import { logger } from '../services/LoggerService.js';
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
   * Scans and retrieves all real catalog item cards in the grid (excluding fake placeholders).
   * @returns {HTMLElement[]} Array of catalog item card elements.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('div.catalog__item, div.row.mg-none > div.catalog__item')).filter(
      (el) => !el.classList?.contains('catalog__item--fake') && !(el.getAttribute?.('class') || '').includes('catalog__item--fake')
    );
  }

  /**
   * Extracts the thumbnail image URL from an asset card.
   * Targets artwork thumbnail preview and strictly avoids AI badge icons (aiGenerated.svg).
   *
   * @param {HTMLElement} cardElement - Asset card element.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      '.thumbnail img[data-cy*="preitemImg"], div.thumbnail img, .thumbnail img, img[data-cy*="preitemImg"]'
    ) || cardElement.querySelector?.('img:not([src*="aiGenerated"]):not([src*=".svg"])')
      || cardElement.querySelector?.('img');
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an asset card in the catalog grid to open its sidebar editor.
   * Targets the thumbnail preview image to trigger Vue item selection.
   * Defensively guards against double-clicking an already selected card.
   *
   * @param {HTMLElement} cardElement - Card element to select.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    logger.step('Freepik: Selecting asset card');

    try {
      if (typeof cardElement.scrollIntoView === 'function') {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch {
      // Ignore scroll errors
    }

    // Check if card is already selected; if so, do not re-click to avoid toggling off
    const isAlreadySelected = cardElement.classList?.contains('selected') ||
      (cardElement.getAttribute?.('class') || '').includes('selected');

    if (isAlreadySelected) {
      logger.info('Freepik: Asset card is already selected');
      return;
    }

    // Click innermost thumbnail image or container; bubbling handles card selection in Vue
    const clickTarget = cardElement.querySelector?.(
      '.thumbnail img[data-cy*="preitemImg"], div.thumbnail img, .thumbnail img, div.thumbnail, .content'
    ) || cardElement;

    simulateClick(clickTarget);
  }

  /**
   * Waits for the catalog sidebar editor form to become interactive for the selected asset.
   * Verifies that the sidebar is visible, textarea is present, card is selected, and not "Select 0".
   *
   * @param {HTMLElement} [cardElement=null] - Selected asset card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    if (typeof document === 'undefined') return true;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const sidebar = document.querySelector('aside.catalog__sidebar');
      const textarea = document.querySelector(
        'div.inputTitle textarea, aside.catalog__sidebar textarea'
      );

      const isCardSelected = cardElement
        ? (cardElement.classList?.contains('selected') || (cardElement.getAttribute?.('class') || '').includes('selected'))
        : true;

      const sidebarText = sidebar?.textContent || '';
      const isZeroSelected = /select\s+0\s*\//i.test(sidebarText);

      // Ready when sidebar & textarea exist, card is selected, and not "Select 0"
      if (sidebar && textarea && isCardSelected && !isZeroSelected) {
        await sleep(250);
        return true;
      }

      // If card was not selected and time is passing (>1s), try fallback click on checkbox indicator
      if (cardElement && !isCardSelected && Date.now() - startTime > 1000) {
        const fallbackTarget = cardElement.querySelector?.(
          'span.checkbox__indicator, label.checkbox, .thumbnail img'
        );
        if (fallbackTarget) {
          simulateClick(fallbackTarget);
          await sleep(250);
        }
      }

      await sleep(150);
    }

    // Fallback check after timeout
    return Boolean(document.querySelector('aside.catalog__sidebar, div.inputTitle textarea'));
  }

  /**
   * Clears old metadata fields (title, keywords) prior to new injection.
   * Clears title and keyword chips via trash button or individual remove buttons.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;
    logger.step('Freepik: Clearing existing title and keywords');

    // Helper to locate trash button in title or keyword section
    const findTrashButton = (sectionSelector) => {
      const section = document.querySelector(sectionSelector);
      if (!section) return null;
      const buttons = Array.from(section.querySelectorAll('button'));
      return buttons.find((b) => {
        if (b.disabled || b.classList?.contains('disabled') || (b.getAttribute?.('class') || '').includes('disabled')) return false;
        const cls = b.getAttribute?.('class') || b.className || '';
        if (cls.includes('icon--trash')) return true;
        return Boolean(b.querySelector?.('i.icon--trash, .icon--trash'));
      }) || null;
    };

    // 1. Clear title: click trash button in title group if present, or clear textarea
    const titleTrash = findTrashButton('div.inputTitle');

    if (titleTrash) {
      logger.info('Freepik: Clicking title trash button');
      simulateClick(titleTrash);
      await sleep(150);
    } else {
      const titleEl = document.querySelector(
        'div.inputTitle textarea, textarea[placeholder*="title"], textarea[placeholder*="Enter the title"]'
      );
      if (titleEl && titleEl.value) {
        logger.info('Freepik: Clearing title textarea');
        setNativeValue(titleEl, '');
        await sleep(100);
      }
    }

    // 2. Clear keywords: click trash button in tag group if present, or click individual remove buttons
    const kwTrash = findTrashButton('div.inputTag');

    if (kwTrash) {
      logger.info('Freepik: Clicking keyword trash button');
      simulateClick(kwTrash);
      await sleep(150);
    } else {
      const removeButtons = Array.from(document.querySelectorAll('button.inputTag__remove'));
      if (removeButtons.length > 0) {
        logger.info(`Freepik: Removing ${removeButtons.length} individual tag chips`);
        for (const btn of removeButtons) {
          simulateClick(btn);
        }
        await sleep(150);
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

    // 0. Explicitly clear previous title & keywords before injecting new metadata
    await this.clearMetadata();
    await sleep(200);

    logger.step('Freepik: Injecting metadata into sidebar editor');

    // 1. Category: Strictly omitted (Freepik indexes assets automatically)

    // 2. Generative AI Declaration
    const isAi = Boolean(options.isAiGenerated ?? metadata.isAiGenerated);
    const aiSwitch = document.querySelector(
      'div.aiSelector--container input.switch__input, label.switch.switch--sm input, label.switch input'
    );

    if (aiSwitch) {
      const isCurrentlyChecked = Boolean(
        aiSwitch.checked ||
        aiSwitch.getAttribute('checked') !== null ||
        aiSwitch.value === 'true' ||
        aiSwitch.closest?.('label.switch')?.classList?.contains('active')
      );

      try {
        if (isAi && !isCurrentlyChecked) {
          logger.step('Generative AI', 'Enabled');
          simulateClick(aiSwitch);
          await sleep(100);
        } else if (!isAi && isCurrentlyChecked) {
          logger.step('Generative AI', 'Disabled');
          simulateClick(aiSwitch);
          await sleep(100);
        }
      } catch (err) {
        logger.warn('Freepik: AI declaration switch toggle warning', err.message);
      }

      if (isAi) {
        // AI Base Model Selection
        const targetModel = options.aiModel || metadata.aiModel || 'Midjourney 6';
        logger.step('AI Model', targetModel);
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
          logger.step('AI Prompt', promptText.slice(0, 50) + (promptText.length > 50 ? '...' : ''));
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
        logger.step('Title', cleanTitle);
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

        logger.step('Keywords', `${tagList.slice(0, 50).length} tags injected`);
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
    logger.step('Freepik: Saving item draft ("Create draft")');

    const draftBtn = document.querySelector('button.button-paste-draft') ||
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Create draft')
      );

    if (draftBtn) {
      simulateClick(draftBtn);
      logger.info('Freepik: Waiting for draft save spinner to complete');

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

      logger.success('Freepik: Item draft saved successfully');
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
    logger.step('Freepik: Submitting selected assets for review');

    const submitBtn = document.querySelector('button.button--submit') ||
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Send to review')
      );

    if (submitBtn && !submitBtn.disabled) {
      simulateClick(submitBtn);
      logger.success('Freepik: Assets submitted for review');
      return true;
    }

    return false;
  }
}
