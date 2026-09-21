/**
 * ShutterstockAdapter — Platform Adapter for Shutterstock Contributor
 *
 * Implements BaseAdapter interface for Shutterstock (submit.shutterstock.com).
 * - Shared workflow for both Photo (26 categories) and Video (19 categories).
 * - Material-UI controlled input value injection via native prototype setter.
 * - Description instant single-string injection with optional editorial caption prefix.
 * - Deepest Material-UI Category 1 (Primary) and Category 2 (Secondary) dropdown selection.
 * - Keyword chip injection: comma-separated list into MUI input + Enter key simulation.
 * - Auto-approval of spelling warnings ("Mark all as correct" / "Mark all keywords as correct").
 * - Usage toggle group (commercial vs editorial buttons with fallback).
 * - Bulk save strategy: Card checkbox -> "Select page" toolbar -> "Save" sidebar.
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

export class ShutterstockAdapter extends BaseAdapter {
  constructor() {
    super('shutterstock', 'Shutterstock');
  }

  /**
   * Matches Shutterstock contributor URLs.
   * @param {string} url - Target URL to evaluate.
   * @returns {boolean} True if matching, false otherwise.
   */
  isMatch(url) {
    if (typeof url !== 'string') return false;
    return url.includes('submit.shutterstock.com');
  }

  /**
   * Scans and retrieves all asset cards in the grid.
   * @returns {HTMLElement[]} Array of asset card elements.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('div[data-testid="asset-card"]'));
  }

  /**
   * Extracts the thumbnail image URL from an asset card.
   * @param {HTMLElement} cardElement - Asset card element.
   * @returns {string|null} Image URL or null.
   */
  getThumbnailUrl(cardElement) {
    if (!cardElement) return null;
    const img = cardElement.querySelector?.(
      'img[data-testid^="card-media-"], img.MuiCardMedia-img, div[data-testid="asset-card"] img, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an asset card in the grid to display its editor sidebar.
   * Scrolls smoothly to the card, clicks the container, and allows sidebar to settle.
   * @param {HTMLElement} cardElement - Card element to select.
   */
  async selectCard(cardElement) {
    if (!cardElement) return;

    try {
      if (typeof cardElement.scrollIntoView === 'function') {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch {
      // Ignore scroll errors
    }

    simulateClick(cardElement);
    await sleep(400);

    (this.logger || logger).step('card selection', 'OK');
  }

  /**
   * Waits for the editor sidebar / dialog panel to become interactive.
   * @param {HTMLElement} [cardElement=null] - Selected asset card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    try {
      await waitForElement(
        'div[data-testid="description"] textarea.MuiInputBase-input, textarea[name="description"], div[data-testid="editInfo"], div[data-testid="editDialogForm"]',
        typeof document !== 'undefined' ? document : null,
        timeoutMs
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears old metadata fields (description, keywords) prior to new injection.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    // 1. Clear description textarea
    const descEl = document.querySelector(
      'div[data-testid="description"] textarea.MuiInputBase-input, textarea[name="description"], div[data-testid="description"] textarea'
    );
    if (descEl) {
      setNativeValue(descEl, '');
    }

    // 2. Clear existing keyword chips via 3-dots menu
    await this.clearKeywords();

    return true;
  }

  /**
   * Detects whether existing keyword chips are present in the sidebar.
   * @returns {HTMLElement[]} Array of existing keyword chip elements.
   */
  _getExistingKeywordChips() {
    if (typeof document === 'undefined') return [];

    // 1. Primary: Selected keyword chips with data-testid (strictly chips)
    const chips = Array.from(document.querySelectorAll(
      '.MuiChip-root[data-testid^="selected-keyword-"]'
    ));

    if (chips.length > 0) return chips;

    // 2. Fallback: Any element with data-testid starting with "selected-keyword-" that is a chip
    const testIdChips = Array.from(document.querySelectorAll(
      '[data-testid^="selected-keyword-"]'
    )).filter((el) => {
      return el.classList.contains('MuiChip-root') ||
        el.getAttribute('role') === 'button' ||
        Boolean(el.querySelector('svg[data-testid="ClearIcon"], svg.MuiChip-deleteIcon'));
    });

    if (testIdChips.length > 0) return testIdChips;

    // 3. Fallback scoped strictly inside the keyword chip stack container (never broad form or page grid)
    const kwStack = document.querySelector(
      'div[data-testid="keywords-block-all"] .MuiStack-root, div[data-testid="keyword-input-text"] ~ .MuiStack-root'
    );
    if (kwStack) {
      return Array.from(kwStack.querySelectorAll('.MuiChip-root')).filter((el) => {
        return Boolean(el.querySelector('svg[data-testid="ClearIcon"], svg.MuiChip-deleteIcon'));
      });
    }

    return [];
  }

  /**
   * Clears keyword chips using Shutterstock's 3-dots action menu.
   * Strictly verifies presence of existing keyword chips before opening menu or clearing.
   * If no chips exist, exits immediately without triggering clear actions.
   *
   * @returns {Promise<boolean>} True if cleared or no chips were present.
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;

    // Check for empty keywords state indicators
    const hasEmptyMessage = Boolean(
      document.querySelector('div[data-testid="keywords-block-all"] p.MuiTypography-alignCenter, [data-testid="keyword-input"] p.MuiTypography-alignCenter')
    );
    if (hasEmptyMessage) {
      return true;
    }

    const existingChips = this._getExistingKeywordChips();

    // If no keyword chips are present, skip clearing entirely
    if (existingChips.length === 0) {
      return true;
    }

    const moreBtn = document.querySelector(
      'button[data-testid="more-keyword-actions-button"], #more-keyword-actions-button'
    );

    if (moreBtn && !moreBtn.disabled) {
      simulateClick(moreBtn);
      await sleep(250);

      const clearAction = document.querySelector('li[data-testid="clear-action"]') ||
        Array.from(document.querySelectorAll('li.MuiMenuItem-root, li')).find(
          (li) => (li.getAttribute('data-testid') || '').toLowerCase().includes('clear') ||
            (li.textContent && li.textContent.toLowerCase().includes('clear'))
        );

      if (clearAction) {
        simulateClick(clearAction);
        await sleep(350);
        (this.logger || logger).step('keywords', 'Cleared existing chips');
        return true;
      }
    }

    // Fallback: click individual chip delete buttons if clear action menu is missing
    const deleteIcons = Array.from(document.querySelectorAll(
      '.MuiChip-root[data-testid^="selected-keyword-"] svg[data-testid="ClearIcon"], .MuiChip-root svg.MuiChip-deleteIcon'
    ));
    if (deleteIcons.length > 0) {
      for (const icon of deleteIcons) {
        const btn = icon.closest('button') || icon.parentElement;
        if (btn) simulateClick(btn);
      }
      await sleep(250);
      (this.logger || logger).step('keywords', 'Cleared existing chips (manual)');
    }

    return true;
  }

  /**
   * Selects a category from MUI Select dropdown.
   * Targets deepest button/combobox, opens popover, matches category, and closes cleanly.
   *
   * @private
   * @param {string} testId - data-testid of container ('category1' or 'category2').
   * @param {string} inputName - Name attribute of hidden input ('category1' or 'category2').
   * @param {string} categoryValue - Name/value of category to select.
   * @returns {Promise<boolean>} True if selected.
   */
  async _selectMuiCategory(testId, inputName, categoryValue) {
    if (!categoryValue || typeof document === 'undefined') return false;

    // 1. Set native value directly on hidden input if present (for form state & testing)
    const hiddenInput = document.querySelector(`input[name="${inputName}"]`);
    if (hiddenInput) {
      setNativeValue(hiddenInput, categoryValue);
    }

    // 2. Locate container and check if disabled
    const container = document.querySelector(`div[data-testid="${testId}"]`);
    if (container) {
      if (
        container.classList?.contains('Mui-disabled') ||
        container.querySelector?.('div[aria-disabled="true"]') ||
        container.querySelector?.('input[disabled]')
      ) {
        (this.logger || logger).info(`${testId === 'category1' ? 'Category 1' : 'Category 2'} is disabled, skipping`);
        return false;
      }

      // 3. Target deepest trigger: role="button", role="combobox", or aria-labelledby
      const trigger = container.querySelector(
        'div[role="button"], div[role="combobox"], [aria-labelledby*="category"], div.MuiSelect-select'
      ) || container;

      simulateClick(trigger);
      await sleep(350);

      // 4. Find open MUI popover list
      const menuList = document.querySelector(
        'div.MuiPopover-paper ul.MuiMenu-list, div.MuiMenu-paper ul.MuiList-root, ul.MuiMenu-list, ul[role="listbox"]'
      ) || document;

      const menuItems = Array.from(menuList.querySelectorAll('li.MuiMenuItem-root, li'));

      // Normalize category text for flexible matching (e.g. "The Arts" <-> "Arts")
      const normalizeCat = (str) =>
        String(str || '')
          .toLowerCase()
          .replace(/^the\s+/, '')
          .replace(/[\s/]+/g, ' ')
          .trim();

      const targetValNorm = normalizeCat(categoryValue);

      const target = menuItems.find((item) => {
        const val = item.getAttribute?.('data-value');
        const txt = item.textContent?.trim();
        return (
          val === categoryValue ||
          txt?.toLowerCase() === String(categoryValue).toLowerCase() ||
          normalizeCat(val) === targetValNorm ||
          normalizeCat(txt) === targetValNorm
        );
      });

      if (target) {
        simulateClick(target);
        await sleep(250);
        (this.logger || logger).step(
          testId === 'category1' ? 'Category 1' : 'Category 2',
          target.textContent?.trim() || categoryValue
        );

        // Ensure backdrop or menu popover closes
        try {
          document.body?.click?.();
        } catch {
          // Ignore click errors
        }
        return true;
      } else {
        // Close menu if target option not found
        try {
          document.body?.click?.();
        } catch {
          // Ignore click errors
        }
      }
    }

    return Boolean(hiddenInput);
  }

  /**
   * Injects sanitized metadata into Shutterstock editor sidebar.
   * Supports photo & video categories, single-string description (+ editorial prefix),
   * Category 1 & Category 2, keyword chips with Enter simulation,
   * auto-approves spelling warnings, and toggles usage switch.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (isEditorial, editorialPrefix, etc.).
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}) {
    if (typeof document === 'undefined' || !metadata) return false;

    // 1. Description (Instant single-string injection with optional editorial prefix)
    const isEditorial = Boolean(options.isEditorial ?? metadata.isEditorial);
    let descText = metadata.description || '';

    if (isEditorial && options.editorialPrefix) {
      const prefix = String(options.editorialPrefix).trim();
      if (!descText.startsWith(prefix)) {
        descText = `${prefix} ${descText}`.trim();
      }
    }

    const descEl = document.querySelector(
      'div[data-testid="description"] textarea.MuiInputBase-input, textarea[name="description"], div[data-testid="description"] textarea'
    );
    if (descEl && descText) {
      try {
        descEl.focus();
      } catch {
        // Ignore focus errors
      }
      setNativeValue(descEl, descText.slice(0, 200));
      (this.logger || logger).step('description', descText.slice(0, 200));
      await sleep(250);
    }

    // 2. Category 1 (Primary, required for both photo 26 & video 19 categories)
    const cat1 = metadata.category_1 || metadata.category1 || metadata.category;
    if (cat1) {
      await this._selectMuiCategory('category1', 'category1', cat1);
      await sleep(250);
    }

    // 3. Category 2 (Secondary, optional)
    const cat2 = metadata.category_2 || metadata.category2;
    if (cat2) {
      await this._selectMuiCategory('category2', 'category2', cat2);
      await sleep(250);
    }

    // 4. Keyword Chip Injection (Sequential clearing + single injection + Enter simulation)
    if (metadata.keywords) {
      // Clear pre-existing keyword chips before injecting new ones
      await this.clearKeywords();
      await sleep(200);

      const kwInput = document.querySelector(
        'div[data-testid="keyword-input-text"] input.MuiInputBase-input, div[data-testid="keyword-input-text"] input, input[placeholder*="Add keyword"]'
      );
      if (kwInput) {
        try {
          kwInput.focus();
        } catch {
          // Ignore focus errors
        }

        const tagList = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',').map((t) => t.trim()).filter(Boolean);

        const kwString = tagList.slice(0, 50).join(', ') + ',';

        setNativeValue(kwInput, kwString);
        simulateEnterKey(kwInput);
        (this.logger || logger).step('keywords', `${Math.min(tagList.length, 50)} tags`);

        // Auto-approve spelling warnings after chips render with polling
        await sleep(600);
        await this.approveSpellingWarnings();
      }
    }

    // 5. Usage Toggle (Commercial vs Editorial)
    // Primary: Material-UI toggle buttons inside div[data-testid="usage-toggle"]
    // Fallback: input[name="isEditorial"] checkbox
    const usageToggle = document.querySelector('div[data-testid="usage-toggle"]');
    if (usageToggle) {
      const editorialBtn = usageToggle.querySelector('button[data-testid="button-editorial"]');
      const commercialBtn = usageToggle.querySelector('button[data-testid="button-commercial"]');

      if (isEditorial && editorialBtn) {
        const isSelected =
          editorialBtn.classList.contains('Mui-selected') ||
          editorialBtn.getAttribute('aria-pressed') === 'true';
        if (!isSelected) {
          simulateClick(editorialBtn);
          (this.logger || logger).step('usage toggle', 'Editorial');
          await sleep(250);
        }
      } else if (!isEditorial && commercialBtn) {
        const isSelected =
          commercialBtn.classList.contains('Mui-selected') ||
          commercialBtn.getAttribute('aria-pressed') === 'true';
        if (!isSelected) {
          simulateClick(commercialBtn);
          (this.logger || logger).step('usage toggle', 'Commercial');
          await sleep(250);
        }
      }
    } else {
      // Fallback: input[name="isEditorial"]
      const editorialInput = document.querySelector(
        'input[name="isEditorial"]'
      ) || (
        Array.from(document.querySelectorAll('label')).find(
          (l) => l.textContent && l.textContent.includes('Editorial')
        )?.querySelector('input')
      );

      if (editorialInput) {
        if (isEditorial && !editorialInput.checked) {
          editorialInput.click();
          (this.logger || logger).step('usage toggle', 'Editorial (checkbox)');
        } else if (!isEditorial && editorialInput.checked) {
          editorialInput.click();
          (this.logger || logger).step('usage toggle', 'Commercial (checkbox)');
        }
      }
    }

    // 6. Mature Content (Optional: isAdult / isMature)
    if (options.isMature) {
      const moreOptions = document.querySelector('div[data-testid="more_options"] .MuiAccordionSummary-root');
      if (moreOptions && moreOptions.getAttribute('aria-expanded') !== 'true') {
        simulateClick(moreOptions);
        await sleep(300);
      }
      const matureCb = document.querySelector(
        'span[data-testid="mature_content"] input, input#isAdult, input[name="isAdult"]'
      );
      if (matureCb && !matureCb.checked) {
        simulateClick(matureCb);
        (this.logger || logger).step('mature content', 'Enabled');
      }
    }

    return true;
  }

  /**
   * Approves spelling warnings by clicking "Mark all as correct" or "Mark all keywords as correct".
   * Polls asynchronously until the warning button appears, or exits cleanly if no error chip is detected.
   *
   * @param {number} [maxWaitMs=3500] - Maximum wait time in milliseconds.
   * @param {number} [pollIntervalMs=250] - Interval between checks in milliseconds.
   * @returns {Promise<boolean>} True if button was clicked.
   */
  async approveSpellingWarnings(maxWaitMs = 3500, pollIntervalMs = 250) {
    if (typeof document === 'undefined') return false;

    const findMarkCorrectBtn = () => {
      // 1. Dedicated testid
      const direct = document.querySelector('button[data-testid="mark-all-correct-button"]');
      if (direct && !direct.disabled) return direct;

      // 2. Target button inside keyword-input section with text "Mark all keywords as correct"
      // As shown in recording: div[data-testid="keyword-input"] button[data-testid="button"]
      const kwContainer = document.querySelector('div[data-testid="keyword-input"]');
      if (kwContainer) {
        const btn = Array.from(kwContainer.querySelectorAll('button')).find((b) => {
          const testId = (b.getAttribute('data-testid') || '').toLowerCase();
          if (testId === 'add-all-button' || testId === 'more-keyword-actions-button' || b.id === 'more-keyword-actions-button') {
            return false;
          }
          if (b.getAttribute('role') === 'tab') return false;

          const text = (b.textContent || '').trim().toLowerCase();
          return (text.includes('mark all keywords as correct') || text.includes('mark all as correct')) && !b.disabled;
        });
        if (btn) return btn;
      }

      // 3. Fallback: buttons on page matching exact text, strictly excluding tabs and add-all
      const candidateButtons = Array.from(document.querySelectorAll(
        'button[data-testid="button"], button'
      ));

      return candidateButtons.find((btn) => {
        if (btn.getAttribute('role') === 'tab') return false;
        const testId = (btn.getAttribute('data-testid') || '').toLowerCase();
        if (testId.startsWith('tab-') || testId === 'add-all-button' || testId === 'more-keyword-actions-button') {
          return false;
        }
        const text = btn.textContent?.trim().toLowerCase() || '';
        return (text.includes('mark all keywords as correct') || text.includes('mark all as correct')) && !btn.disabled;
      });
    };

    const startTime = Date.now();
    let hasDetectedError = false;

    while (Date.now() - startTime < maxWaitMs) {
      const markCorrectBtn = findMarkCorrectBtn();
      if (markCorrectBtn && !markCorrectBtn.disabled) {
        simulateClick(markCorrectBtn);
        (this.logger || logger).step('approving spelling warnings', 'Approved');
        await sleep(500);
        return true;
      }

      // Check for red error chips or spelling warning indicator in DOM
      if (!hasDetectedError) {
        const errorChip = document.querySelector(
          '.MuiChip-colorError, .MuiChip-filledError, [data-testid*="error"], [class*="chip"][class*="error"]'
        );
        const hasSpellingNotice = document.querySelector('div[data-testid="keyword-input-text"]')
          ?.parentElement?.textContent?.toLowerCase?.()?.includes('spelling');

        if (errorChip || hasSpellingNotice) {
          hasDetectedError = true;
        } else if (Date.now() - startTime > 1500) {
          // If no error chips or spelling warning appeared after 1.5s, continue
          break;
        }
      }

      await sleep(pollIntervalMs);
    }

    return false;
  }

  /**
   * Saves metadata draft for currently selected asset.
   * @returns {Promise<boolean>} True if save clicked.
   */
  async saveDraft() {
    if (typeof document === 'undefined') return true;
    const saveBtn = document.querySelector(
      'button[data-testid="edit-dialog-save-button"]'
    ) || Array.from(document.querySelectorAll('button')).find(
      (b) => (b.getAttribute('data-testid') || '').includes('save') || (b.textContent && b.textContent.trim() === 'Save')
    );

    if (saveBtn && !saveBtn.disabled) {
      simulateClick(saveBtn);
      (this.logger || logger).step('save draft', 'Clicked Save');
      return true;
    }
    return false;
  }

  /**
   * Bulk save strategy:
   * 1. On target card (first or specified card), click selection checkbox.
   * 2. In the toolbar, click "Select page" (if more than 1 card).
   * 3. In the sidebar, click "Save".
   * 4. Wait for save spinner to finish and button to return to normal.
   * 5. Click "Deselect page" in the toolbar.
   * 6. Close drawer if close button exists.
   *
   * @param {HTMLElement} [lastCardElement=null] - Optional reference to card element.
   * @returns {Promise<boolean>} True if bulk save triggered.
   */
  async bulkSave(lastCardElement = null) {
    if (typeof document === 'undefined') return true;

    (this.logger || logger).step('bulk save', 'Initiating bulk save...');

    // 1. Click checkbox on the target card
    const targetCard = lastCardElement ||
      document.querySelector('div[data-testid="asset-card"]');

    const cardCheckbox = targetCard?.querySelector?.(
      'span[data-testid="asset-checkbox"] input[type="checkbox"], input[type="checkbox"]'
    );

    if (cardCheckbox && !cardCheckbox.checked) {
      simulateClick(cardCheckbox);
    }

    await sleep(400);

    // 2. Click "Select page" in toolbar if multiple cards exist
    const cards = this.getAssetCards();
    if (cards.length > 1 || !lastCardElement) {
      const selectPageBtn = document.querySelector(
        'button[data-testid="select-page-button"], button[data-testid="select-all-button"], #bulk-editor button[data-testid="button"], #bulk-editor button'
      ) || Array.from(document.querySelectorAll('div.MuiGrid-root button, button')).find(
        (b) => b.textContent && b.textContent.includes('Select page')
      );

      if (selectPageBtn) {
        simulateClick(selectPageBtn);
        await sleep(400);
      }
    }

    // 3. Click "Save" in sidebar
    const saveBtn = document.querySelector(
      'button[data-testid="edit-dialog-save-button"]'
    ) || Array.from(document.querySelectorAll('button')).find(
      (b) => (b.getAttribute('data-testid') || '').includes('save') || (b.textContent && b.textContent.trim() === 'Save')
    );

    if (saveBtn && !saveBtn.disabled) {
      simulateClick(saveBtn);
      (this.logger || logger).step('bulk save', 'Clicked Save, waiting for completion...');
      await sleep(350);

      // 4. Wait for save button spinner to resolve and button to return to normal
      const isSaveBusy = () => {
        const currentSaveBtn = document.querySelector('button[data-testid="edit-dialog-save-button"]') || saveBtn;
        if (!currentSaveBtn || (typeof document.body?.contains === 'function' && !document.body.contains(currentSaveBtn))) {
          return false;
        }
        const hasSpinner = Boolean(
          currentSaveBtn.querySelector?.('svg.MuiCircularProgress-svg, .MuiCircularProgress-root, [role="progressbar"], .MuiLoadingButton-loadingIndicator') ||
          document.querySelector?.('div.MuiDialog-root [role="progressbar"], [data-testid="save-loading"]')
        );
        const isDisabled = currentSaveBtn.disabled ||
          currentSaveBtn.classList?.contains?.('Mui-disabled') ||
          currentSaveBtn.getAttribute?.('aria-busy') === 'true';
        const isSavingText = currentSaveBtn.textContent && /saving/i.test(currentSaveBtn.textContent);

        return Boolean(hasSpinner || isDisabled || isSavingText);
      };

      const maxSaveWaitMs = 20000;
      const saveStartTime = Date.now();
      let wasBusy = isSaveBusy();

      while (Date.now() - saveStartTime < maxSaveWaitMs) {
        const busy = isSaveBusy();
        if (busy) {
          wasBusy = true;
        } else if (wasBusy || Date.now() - saveStartTime >= 1000) {
          break;
        }
        await sleep(300);
      }

      (this.logger || logger).step('bulk save', 'Save finished, button back to normal');
      await sleep(400);

      // 5. Click "Deselect page" in toolbar
      const findDeselectButton = () => {
        const direct = document.querySelector(
          'button[data-testid="deselect-page-button"], button[data-testid="deselect-all-button"]'
        );
        if (direct) return direct;

        const bulkEditorBtn = document.querySelector('#bulk-editor button[data-testid="button"], #bulk-editor button');
        if (bulkEditorBtn) return bulkEditorBtn;

        const allButtons = Array.from(document.querySelectorAll('div.MuiGrid-root button, button'));
        const textMatch = allButtons.find((btn) => {
          const txt = btn.textContent?.trim().toLowerCase() || '';
          return txt.includes('deselect page') || txt.includes('deselect all') || txt === 'deselect';
        });
        if (textMatch) return textMatch;

        const selectPageBtn = document.querySelector('button[data-testid="select-page-button"]');
        if (selectPageBtn) {
          const txt = selectPageBtn.textContent?.trim().toLowerCase() || '';
          if (txt.includes('deselect')) return selectPageBtn;
        }

        return null;
      };

      let deselectBtn = findDeselectButton();
      if (!deselectBtn) {
        const deselectStart = Date.now();
        while (Date.now() - deselectStart < 2000) {
          await sleep(250);
          deselectBtn = findDeselectButton();
          if (deselectBtn) break;
        }
      }

      if (deselectBtn) {
        simulateClick(deselectBtn);
        (this.logger || logger).step('bulk save', 'Deselected page');
        await sleep(400);
      } else if (cardCheckbox && cardCheckbox.checked) {
        simulateClick(cardCheckbox);
        await sleep(300);
      }

      // 6. Close drawer if close button exists
      const closeBtn = document.querySelector('button svg[data-testid="close-icon"]')?.closest('button');
      if (closeBtn) {
        simulateClick(closeBtn);
        await sleep(300);
      }

      (this.logger || logger).info('Bulk save executed successfully');
      return true;
    }

    return true;
  }
}
