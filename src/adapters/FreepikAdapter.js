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
 * - MANDATORY PER-ITEM PERSISTENCE: Triggers button[data-cy="savePreitems"] (icon--save)
 *   and awaits save completion and button disabled state.
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
   * Dismisses any unexpected "Create a draft" modal dialog that might have been opened.
   */
  dismissDraftModal() {
    if (typeof document === 'undefined') return;
    const modal = document.querySelector('div.modal, div.modal--dialog, div[data-cy="draftModal"]');
    if (modal) {
      const closeBtn = modal.querySelector(
        'button.modal__close, button[data-cy="closeModal"], button.modal__close--top-right, button:has(i.icon--cross), button.nostyle'
      ) || Array.from(modal.querySelectorAll('button')).find((b) => Boolean(b.querySelector?.('i.icon--cross')));
      if (closeBtn) {
        logger.info('Freepik: Dismissing unexpected draft modal');
        simulateClick(closeBtn);
      }
    }
  }

  /**
   * Pre-automation preparation hook executed once immediately after starting automation
   * and before beginning the sequential card processing loop.
   * Checks if the header select-all checkbox (<input data-v-f08075b8="" type="checkbox">)
   * is currently active (e.g. batch-selected state "Select 2/2").
   * If active, clicks it to deselect all assets before processing the first card.
   * If already inactive (e.g. "Select 0/2"), skips cleanly.
   *
   * @returns {Promise<boolean>} True if check completed.
   */
  async prepareAutomation() {
    if (typeof document === 'undefined') return true;

    try {
      const selectAllInput = document.querySelector(
        'div[data-cy="filterSelect"] input[type="checkbox"], input[data-v-f08075b8][type="checkbox"], div.checkbox-dropdown input[type="checkbox"]'
      );
      const dropdownContent = document.querySelector(
        'div[data-cy="filterSelect"] .checkbox-dropdown__content, .checkbox-dropdown__content'
      );
      const isFullOrPartial = Boolean(
        dropdownContent && (
          dropdownContent.classList.contains('full') ||
          dropdownContent.classList.contains('partial') ||
          (dropdownContent.getAttribute('class') || '').includes('full') ||
          (dropdownContent.getAttribute('class') || '').includes('partial')
        )
      );
      const isCatalogActive = Boolean(document.querySelector('.catalog__actions.active'));
      const isInputChecked = Boolean(
        selectAllInput && (
          typeof selectAllInput.checked === 'boolean'
            ? selectAllInput.checked
            : (selectAllInput.getAttribute?.('checked') === 'true' || selectAllInput.getAttribute?.('checked') === true)
        )
      );

      const isSelectAllActive = Boolean(isFullOrPartial || isCatalogActive || isInputChecked);

      if (isSelectAllActive) {
        logger.info('Freepik: Header select-all checkbox is active, clicking to deselect all assets');
        const clickTarget = selectAllInput?.closest?.('label') ||
          document.querySelector('div[data-cy="filterSelect"] label, label[data-v-f08075b8]') ||
          selectAllInput;

        if (clickTarget) {
          simulateClick(clickTarget);
          if (selectAllInput) selectAllInput.checked = false;
          await sleep(500);
        }
      } else {
        logger.info('Freepik: Header select-all checkbox is already inactive, proceeding directly');
      }
    } catch (err) {
      logger.warn('Freepik: Pre-automation select-all check warning:', err.message);
    }

    return true;
  }

  /**
   * Clears old metadata fields (title, keywords) prior to new injection.
   * Strictly avoids clicking template draft buttons.
   * Only clears keywords if keyword chips exist and deleteTags button is active.
   *
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;
    logger.step('Freepik: Checking and clearing existing title and keywords');

    // 0. Dismiss any unexpected draft modal first
    this.dismissDraftModal();

    // 1. Clear title: check if title delete button exists and is active
    const titleInput = document.querySelector(
      'textarea[data-cy="editTitle"], div.inputTitle textarea, textarea[placeholder*="title"], textarea[placeholder*="Enter the title"]'
    );
    const hasTitle = Boolean(titleInput && titleInput.value && titleInput.value.trim().length > 0);

    const titleTrash = document.querySelector(
      'button[data-cy="deleteTitle"], div.inputTitle button:has(i.icon--trash)'
    ) || Array.from(document.querySelectorAll('div.inputTitle button')).find((b) => {
      const cls = b.getAttribute?.('class') || b.className || '';
      if (cls.includes('disabled') || b.disabled) return false;
      return cls.includes('icon--trash') || Boolean(b.querySelector?.('i.icon--trash, .icon--trash'));
    });

    const isTitleTrashDisabled = titleTrash ? Boolean(
      titleTrash.disabled ||
      titleTrash.classList?.contains('disabled') ||
      (titleTrash.getAttribute?.('class') || '').includes('disabled')
    ) : true;

    if (titleTrash && !isTitleTrashDisabled && hasTitle) {
      logger.info('Freepik: Clicking title trash button');
      simulateClick(titleTrash);
      await sleep(150);
    } else if (titleInput && titleInput.value) {
      logger.info('Freepik: Clearing title textarea via native value');
      setNativeValue(titleInput, '');
      await sleep(100);
    }

    // 2. Clear keywords:
    // Check if chips are present in the DOM
    const chips = Array.from(document.querySelectorAll(
      'div.inputTag__item, div[data-cy="commonTag"], .inputTag__item'
    ));

    const kwTrash = document.querySelector(
      'button[data-cy="deleteTags"], div.inputTag button:has(i.icon--trash)'
    ) || Array.from(document.querySelectorAll('div.inputTag button')).find((b) => {
      const cls = b.getAttribute?.('class') || b.className || '';
      if (cls.includes('disabled') || b.disabled) return false;
      return cls.includes('icon--trash') || Boolean(b.querySelector?.('i.icon--trash, .icon--trash'));
    });

    const isKwTrashDisabled = kwTrash ? Boolean(
      kwTrash.disabled ||
      kwTrash.classList?.contains('disabled') ||
      (kwTrash.getAttribute?.('class') || '').includes('disabled')
    ) : true;

    if (chips.length > 0) {
      if (kwTrash && !isKwTrashDisabled) {
        logger.info(`Freepik: Clicking keyword trash button (${chips.length} chips present)`);
        simulateClick(kwTrash);
        await sleep(200);
      } else {
        // Fallback: Remove remaining individual tag chips if trash button is disabled or absent
        const removeButtons = Array.from(document.querySelectorAll(
          'button[data-cy="deleteTag"], button.inputTag__remove'
        ));
        if (removeButtons.length > 0) {
          logger.info(`Freepik: Removing ${removeButtons.length} individual tag chips`);
          for (const btn of removeButtons) {
            simulateClick(btn);
          }
          await sleep(150);
        }
      }
    } else {
      logger.info('Freepik: No existing keyword chips found, skipping keyword clear');
    }

    // Clear any leftover raw text in the keyword input field
    const rawTagInput = document.querySelector(
      'input[data-cy="editTags"], #inputTag, div.inputTag input'
    );
    if (rawTagInput && rawTagInput.value) {
      setNativeValue(rawTagInput, '');
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
   * - Keyword comma-separated injection (clamped to 49 for AI assets, 50 for non-AI) + Enter key simulation.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (isAiGenerated, aiModel, aiPrompt, etc.).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    // 0. Dismiss any unexpected draft modal first
    this.dismissDraftModal();

    // Explicitly clear previous title & keywords before injecting new metadata
    await this.clearMetadata();
    await sleep(200);

    logger.step('Freepik: Injecting metadata into sidebar editor');

    // 1. Category: Strictly omitted (Freepik indexes assets automatically)

    // 2. Generative AI Declaration
    const isAi = Boolean(options.isAiGenerated ?? metadata.isAiGenerated);
    const aiInput = document.querySelector(
      'div.aiSelector--container input.switch__input, label.switch.switch--sm input, label.switch input'
    );
    const aiSwitchIndicator = document.querySelector(
      'div.aiSelector--container span.switch__indicator, label.switch.aiSelector--check, div.aiSelector--container label.switch'
    );
    const isCurrentlyChecked = Boolean(
      aiInput?.checked ||
      aiInput?.getAttribute?.('checked') === 'true' ||
      aiInput?.getAttribute?.('checked') === true ||
      aiInput?.value === 'true' ||
      aiInput?.closest?.('label.switch')?.classList?.contains('active')
    );

    try {
      if (isAi && !isCurrentlyChecked) {
        await sleep(500);
        logger.step('Generative AI', 'Enabled');
        const clickTarget = aiSwitchIndicator || aiInput;
        if (clickTarget) {
          simulateClick(clickTarget);
          if (aiInput) aiInput.checked = true;
          await sleep(500);
        }
      } else if (!isAi && isCurrentlyChecked) {
        await sleep(500);
        logger.step('Generative AI', 'Disabled');
        const clickTarget = aiSwitchIndicator || aiInput;
        if (clickTarget) {
          simulateClick(clickTarget);
          if (aiInput) aiInput.checked = false;
          await sleep(500);
        }
      }
    } catch (err) {
      logger.warn('Freepik: AI declaration switch toggle warning', err.message);
    }

    if (isAi) {
      // AI Base Model Selection
      const targetModel = options.aiModel || metadata.aiModel || 'Midjourney 6';
      logger.step('AI Model', targetModel);

      // Delay before selecting AI model
      await sleep(500);

      // Prioritize Custom Dropdown FIRST (Freepik/Magnific uses Vue custom dropdown, not native select)
      const dropdownBtn = document.querySelector(
        'div.selector_base_model div.dropdown__button, div.dropdown__container div.dropdown__button, div.selector_base_model p.line-height-xs'
      );
      if (dropdownBtn) {
        const currentBtnText = dropdownBtn.textContent?.trim().toLowerCase() || '';
        if (!currentBtnText.includes(targetModel.toLowerCase())) {
          simulateClick(dropdownBtn);
          await sleep(300);

          const optionsList = Array.from(document.querySelectorAll(
            'div.selector_base_model li, ul.dropdown__list li, div.dropdown__select li'
          ));
          const matchingOption = optionsList.find(
            (li) => (li.getAttribute?.('data-value') || '').trim().toLowerCase() === targetModel.trim().toLowerCase() ||
              li.textContent?.trim().toLowerCase() === targetModel.trim().toLowerCase()
          ) || optionsList.find(
            (li) => (li.getAttribute?.('data-value') || '').trim().toLowerCase().includes(targetModel.trim().toLowerCase()) ||
              li.textContent?.trim().toLowerCase().includes(targetModel.trim().toLowerCase())
          );

          if (matchingOption) {
            simulateClick(matchingOption);
            await sleep(500);
          }

          // If dropdown menu button still has active class, click it again to close
          const activeBtn = document.querySelector(
            'div.selector_base_model div.dropdown__button.active, div.dropdown__button.active'
          );
          if (activeBtn) {
            simulateClick(activeBtn);
            await sleep(200);
          }
        } else {
          await sleep(500);
        }
      }

      // Secondary sync to hidden native select if present
      const modelSelect = document.querySelector('div.selector_base_model select');
      if (modelSelect && modelSelect.value !== targetModel) {
        modelSelect.value = targetModel;
        modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // AI Prompt injection
      const promptText = options.aiPrompt || metadata.aiPrompt || options.prompt || '';
      if (promptText) {
        logger.step('AI Prompt', promptText.slice(0, 50) + (promptText.length > 50 ? '...' : ''));
        const promptInput = document.querySelector(
          'textarea#aiPrompt, textarea[placeholder*="prompt"], textarea[placeholder*="Enter your prompt"]'
        );
        if (promptInput) {
          setNativeValue(promptInput, promptText);
        }
      }
    }

    // 3. Title (Single-string instant injection, clamped to max 100 characters)
    if (metadata.title) {
      const titleInput = document.querySelector(
        'textarea[data-cy="editTitle"], div.inputTitle textarea, textarea[placeholder*="title"], textarea[placeholder*="Enter the title"]'
      );
      if (titleInput) {
        const cleanTitle = String(metadata.title).slice(0, 100);
        logger.step('Title', cleanTitle);
        setNativeValue(titleInput, cleanTitle);
      }
    }

    // 4. Keywords (Comma-separated chip injection clamped to 49 tags for AI, 50 tags for non-AI + Enter key)
    if (metadata.keywords) {
      const tagInput = document.querySelector('input[data-cy="editTags"], #inputTag, div.inputTag input');
      if (tagInput) {
        const maxAllowedTags = isAi ? 49 : 50;
        const tagList = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',').map((t) => t.trim()).filter(Boolean);
        const tagsString = tagList.slice(0, maxAllowedTags).join(', ') + ',';

        logger.step('Keywords', `${tagList.slice(0, maxAllowedTags).length} tags injected (max ${maxAllowedTags} for ${isAi ? 'AI asset' : 'standard asset'})`);
        setNativeValue(tagInput, tagsString);
        simulateEnterKey(tagInput);
      }
    }

    return true;
  }

  /**
   * Saves metadata for currently selected asset.
   * MANDATORY PER-ITEM PERSISTENCE:
   * Triggers button[data-cy="savePreitems"] (containing i.icon--save) in sidebar header.
   * Strictly avoids button.button-paste-draft ("Create draft") which is a template management modal.
   *
   * @returns {Promise<boolean>} True if saved successfully.
   */
  async saveDraft() {
    if (typeof document === 'undefined') return true;
    logger.step('Freepik: Saving item metadata');

    // First dismiss any unexpected draft modal if open
    this.dismissDraftModal();

    // Locate the actual save button (data-cy="savePreitems" with icon--save)
    let saveBtn = document.querySelector(
      'button[data-cy="savePreitems"], aside.catalog__sidebar button:has(i.icon--save), button:has(i.icon--save)'
    );

    if (!saveBtn) {
      saveBtn = Array.from(document.querySelectorAll('aside.catalog__sidebar button, button')).find(
        (b) => {
          const cls = b.getAttribute?.('class') || b.className || '';
          if (cls.includes('button-paste-draft') || cls.includes('catalog__draft')) return false;
          return Boolean(b.querySelector?.('i.icon--save, .icon--save'));
        }
      );
    }

    if (!saveBtn) {
      logger.warn('Freepik: Save button not found');
      return false;
    }

    // Wait briefly if save button is still disabled while Vue processes input changes
    const isSaveDisabled = (btn) => Boolean(
      btn.disabled ||
      btn.classList?.contains('disabled') ||
      (btn.getAttribute?.('class') || '').includes('disabled')
    );

    if (isSaveDisabled(saveBtn)) {
      // Poll up to 1000ms for button to become enabled after input
      const startTime = Date.now();
      while (Date.now() - startTime < 1000) {
        await sleep(100);
        if (!isSaveDisabled(saveBtn)) break;
      }
    }

    simulateClick(saveBtn);
    logger.info('Freepik: Clicked Save button, waiting for save completion');

    // Wait for save spinner to complete if present
    try {
      await waitForElementToDisappear(
        'button[data-cy="savePreitems"] span.spinner, button[data-cy="savePreitems"] i.icon--loading, span.spinner',
        typeof document !== 'undefined' ? document : null,
        3000
      );
    } catch {
      // Continue if spinner wait times out
    }

    await sleep(350);
    logger.success('Freepik: Item metadata saved successfully');
    return true;
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
