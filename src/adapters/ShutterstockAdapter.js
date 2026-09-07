/**
 * ShutterstockAdapter — Platform Adapter for Shutterstock Contributor
 *
 * Implements BaseAdapter interface for Shutterstock (submit.shutterstock.com).
 * - Shared workflow for both Photo (26 categories) and Video (19 categories).
 * - Material-UI controlled input value injection via native prototype setter.
 * - Description instant single-string injection with optional editorial caption prefix.
 * - Category 1 (Primary) and Category 2 (Secondary) dropdown selection.
 * - Keyword chip injection: comma-separated list into MUI input + Enter key simulation.
 * - Auto-approval of spelling warnings ("Mark all as correct" button).
 * - Usage switch (commercial vs editorial).
 * - Bulk save strategy: Click last card checkbox -> click "Select page" on toolbar -> click "Save" in sidebar.
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
    const img = cardElement.querySelector?.('img[data-testid^="card-media-"], div[data-testid="asset-card"] img, img');
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an asset card in the grid to display its editor sidebar.
   * Clicks the card container element without clicking the selection checkbox.
   * @param {HTMLElement} cardElement - Card element to select.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    simulateClick(cardElement);
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
        'textarea[name="description"], div[data-testid="editInfo"], div[data-testid="description"] textarea',
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
   * Clears keywords using the 3-dots action menu ("Clear keywords").
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    // 1. Clear description textarea
    const descEl = document.querySelector('textarea[name="description"], div[data-testid="description"] textarea');
    if (descEl) {
      setNativeValue(descEl, '');
    }

    // 2. Clear existing keyword chips via 3-dots menu
    await this.clearKeywords();

    return true;
  }

  /**
   * Clears keyword chips using Shutterstock's 3-dots action menu.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;

    const moreBtn = document.querySelector(
      'button[data-testid="more-keyword-actions-button"], #more-keyword-actions-button'
    );
    if (moreBtn) {
      simulateClick(moreBtn);
      await sleep(80);
      const clearAction = document.querySelector('li[data-testid="clear-action"]') ||
        Array.from(document.querySelectorAll('li.MuiMenuItem-root, li')).find(
          (li) => li.textContent && li.textContent.includes('Clear keywords')
        );
      if (clearAction) {
        simulateClick(clearAction);
      }
    }

    return true;
  }

  /**
   * Selects a category from MUI Select dropdown.
   * @private
   * @param {string} testId - data-testid of container ('category1' or 'category2').
   * @param {string} inputName - Name attribute of hidden input ('category1' or 'category2').
   * @param {string} categoryValue - Name/value of category to select.
   * @returns {Promise<boolean>} True if selected.
   */
  async _selectMuiCategory(testId, inputName, categoryValue) {
    if (!categoryValue || typeof document === 'undefined') return false;

    // 1. Set native value directly on hidden input if present
    const hiddenInput = document.querySelector(`input[name="${inputName}"]`);
    if (hiddenInput) {
      setNativeValue(hiddenInput, categoryValue);
    }

    // 2. Trigger dropdown trigger to open MUI menu and select matching item
    const trigger = document.querySelector(`div[data-testid="${testId}"]`);
    if (trigger) {
      simulateClick(trigger);
      await sleep(50);

      const menuItems = Array.from(document.querySelectorAll('li.MuiMenuItem-root, ul[role="listbox"] li'));
      const target = menuItems.find((item) => {
        const val = item.getAttribute('data-value');
        const txt = item.textContent?.trim().toLowerCase();
        const targetVal = String(categoryValue).trim().toLowerCase();
        return val === categoryValue || txt === targetVal;
      });

      if (target) {
        simulateClick(target);
        return true;
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

    const descEl = document.querySelector('textarea[name="description"], div[data-testid="description"] textarea');
    if (descEl && descText) {
      setNativeValue(descEl, descText.slice(0, 200));
    }

    // 2. Category 1 (Primary, required)
    const cat1 = metadata.category_1 || metadata.category1 || metadata.category;
    if (cat1) {
      await this._selectMuiCategory('category1', 'category1', cat1);
    }

    // 3. Category 2 (Secondary, optional)
    const cat2 = metadata.category_2 || metadata.category2;
    if (cat2) {
      await this._selectMuiCategory('category2', 'category2', cat2);
    }

    // 4. Keyword Chip Injection
    if (metadata.keywords) {
      const kwInput = document.querySelector(
        'div[data-testid="keyword-input-text"] input, input[placeholder*="Add keyword"]'
      );
      if (kwInput) {
        const tagList = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',').map((t) => t.trim()).filter(Boolean);
        const kwString = tagList.slice(0, 50).join(', ') + ',';

        setNativeValue(kwInput, kwString);
        simulateEnterKey(kwInput);

        // Auto-approve spelling warnings after chips render
        await sleep(100);
        this.approveSpellingWarnings();
      }
    }

    // 5. Usage Switch (Commercial vs Editorial)
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
      } else if (!isEditorial && editorialInput.checked) {
        editorialInput.click();
      }
    }

    return true;
  }

  /**
   * Approves spelling warnings by clicking "Mark all as correct" if visible.
   * @returns {boolean} True if button was clicked.
   */
  approveSpellingWarnings() {
    if (typeof document === 'undefined') return false;

    const markCorrectBtn = document.querySelector(
      'button[data-testid="mark-all-correct-button"], button[data-testid="mark-all-correct"]'
    ) || Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && b.textContent.includes('Mark all as correct')
    );

    if (markCorrectBtn && !markCorrectBtn.disabled) {
      simulateClick(markCorrectBtn);
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
      return true;
    }
    return false;
  }

  /**
   * Bulk save strategy:
   * 1. On last card, click the selection checkbox.
   * 2. In the toolbar, click "Select page".
   * 3. In the sidebar, click "Save".
   *
   * @param {HTMLElement} [lastCardElement=null] - Optional reference to the last card.
   * @returns {Promise<boolean>} True if bulk save triggered.
   */
  async bulkSave(lastCardElement = null) {
    if (typeof document === 'undefined') return true;

    // 1. Click checkbox on the last card
    const targetCard = lastCardElement ||
      document.querySelector('div[data-testid="asset-card"]:last-of-type') ||
      document.querySelector('div[data-testid="asset-card"]');

    const cardCheckbox = targetCard?.querySelector?.('input[type="checkbox"]');
    if (cardCheckbox && !cardCheckbox.checked) {
      simulateClick(cardCheckbox);
    }

    await sleep(50);

    // 2. Click "Select page" in toolbar
    const selectPageBtn = document.querySelector(
      'button[data-testid="select-page-button"], button[data-testid="select-all-button"]'
    ) || Array.from(document.querySelectorAll('div.MuiGrid-root button, button')).find(
      (b) => b.textContent && b.textContent.includes('Select page')
    );

    if (selectPageBtn) {
      simulateClick(selectPageBtn);
    }

    await sleep(50);

    // 3. Click "Save" in sidebar
    const saveBtn = document.querySelector(
      'button[data-testid="edit-dialog-save-button"]'
    ) || Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && b.textContent.trim() === 'Save'
    );

    if (saveBtn && !saveBtn.disabled) {
      simulateClick(saveBtn);
      return true;
    }

    return true;
  }
}
