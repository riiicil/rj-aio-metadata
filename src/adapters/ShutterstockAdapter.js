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
   * Clears keyword chips using Shutterstock's 3-dots action menu.
   * Checks for existing chips first. If present, clicks 3-dots menu -> 'Clear keywords'.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;

    const existingChips = Array.from(document.querySelectorAll(
      '.MuiChip-root[data-testid^="selected-keyword-"], div[data-testid^="selected-keyword-"]'
    ));

    const moreBtn = document.querySelector(
      'button[data-testid="more-keyword-actions-button"], #more-keyword-actions-button'
    );

    if (moreBtn && (!moreBtn.disabled || existingChips.length > 0)) {
      simulateClick(moreBtn);
      await sleep(250);

      const clearAction = document.querySelector('li[data-testid="clear-action"]') ||
        Array.from(document.querySelectorAll('li.MuiMenuItem-root, li')).find(
          (li) => li.textContent && li.textContent.includes('Clear keywords')
        );

      if (clearAction) {
        simulateClick(clearAction);
        await sleep(350);
        (this.logger || logger).step('keywords', 'Cleared existing chips');
      } else {
        // Fallback: click individual chip delete buttons if clear action menu is missing
        const deleteIcons = Array.from(document.querySelectorAll(
          '.MuiChip-root[data-testid^="selected-keyword-"] svg[data-testid="ClearIcon"]'
        ));
        for (const icon of deleteIcons) {
          const btn = icon.closest('button') || icon.parentElement;
          if (btn) simulateClick(btn);
        }
      }
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

        // Auto-approve spelling warnings after chips render
        await sleep(500);
        this.approveSpellingWarnings();
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
   * @returns {boolean} True if button was clicked.
   */
  approveSpellingWarnings() {
    if (typeof document === 'undefined') return false;

    const candidateButtons = Array.from(document.querySelectorAll(
      'button[data-testid="mark-all-correct-button"], button[data-testid="button"], button'
    ));

    const markCorrectBtn = candidateButtons.find((btn) => {
      const text = btn.textContent?.trim().toLowerCase() || '';
      return text.includes('mark all keywords as correct') || text.includes('mark all as correct');
    });

    if (markCorrectBtn && !markCorrectBtn.disabled) {
      simulateClick(markCorrectBtn);
      (this.logger || logger).step('approving spelling warnings', 'Approved');
      return true;
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
      (b) => b.textContent && b.textContent.trim() === 'Save'
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
   * 4. Close drawer if close button exists.
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
        'button[data-testid="select-page-button"], button[data-testid="select-all-button"]'
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
      (b) => b.textContent && b.textContent.trim() === 'Save'
    );

    if (saveBtn && !saveBtn.disabled) {
      simulateClick(saveBtn);
      await sleep(1500);

      // 4. Close drawer if close button exists
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
