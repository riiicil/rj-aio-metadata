/**
 * MiriCanvasAdapter — Platform Adapter for MiriCanvas DesignHub
 *
 * Implements BaseAdapter interface for MiriCanvas (designhub.miricanvas.com):
 * - URL matching for designhub.miricanvas.com.
 * - Element card extraction from batch grid (article[data-f="CA-d943"], ul > li > article, article.er317d30, article.css-3q5rav).
 * - Thumbnail extraction (img.css-l67sxu.er317d31, div[data-f="DT-1ecb"] img, img).
 * - Pre-automation preparation:
 *   1. Check left navigation sidebar: if open, collapse via button[data-f="SB-82b8"].
 *   2. Navbar select all checkbox (CI-66e5): reset selection state (if unchecked: check -> uncheck; if checked: uncheck).
 * - Card selection: clicks thumbnail/card body to open right inspector panel.
 * - Editor readiness wait (textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], div[data-f="SD-e6c2"]).
 * - Title clearing via trash button (div[data-f="SD-e6c2"] button[data-f="TT-c273"]) and single-string injection clamped <= 100 chars.
 * - Keywords clearing via trash button (div[data-f="SD-e7b2"] button[data-f="TT-c273"]) and single-batch comma-delimited tag entry clamped <= 25 tags + Enter key commit.
 * - Content Tier (Pricing) selection: STANDARD (Free) vs PREMIUM (Paid).
 * - AI Generated Declaration: checkbox toggle in AI image generator container (div[data-f="AD-8705"] span[data-f="CC-bb45"][role="checkbox"]).
 * - Bulk Save Strategy:
 *   1. Select all elements via navbar checkbox (input[data-f="CI-66e5"]).
 *   2. Click Save Metadata button (button[data-f="SG-8f01"]).
 *   3. Wait for save confirmation (button disabled or toast section[data-f="SL-2fb0"]).
 *   4. Uncheck navbar select all checkbox to restore clean state.
 * - Submit for review: clicks Submit button.
 */

import { BaseAdapter } from './BaseAdapter.js';
import {
  setNativeValue,
  waitForElement,
  simulateClick,
  simulateEnterKey,
  simulateCommaKey,
  extractThumbnailUrl,
  sleep
} from './utils/dom_helpers.js';
import { logger } from '../services/LoggerService.js';

export class MiriCanvasAdapter extends BaseAdapter {
  constructor() {
    super('miricanvas', 'MiriCanvas');
    this.logger = logger;
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
   * Performs pre-automation initialization:
   * 1. Checks left navigation sidebar: collapses if open via button[data-f="SB-82b8"].
   * 2. Resets navbar Select All checkbox (input[data-f="CI-66e5"]):
   *    if unchecked: checks then unchecks to flush active grid selection;
   *    if checked: unchecks.
   * @returns {Promise<void>}
   */
  async prepareAutomation() {
    if (typeof document === 'undefined') return;

    (this.logger || logger).banner('MiriCanvas: Initializing automation pre-flight checks...');

    // 1. Check left navigation sidebar
    try {
      const navDrawer = document.querySelector('nav[data-f="MN-02f2"], nav.panda-cAaCsB');
      const isSidebarOpen = navDrawer && (
        navDrawer.classList?.contains('panda-mVcIL') ||
        (typeof navDrawer.offsetWidth === 'number' && navDrawer.offsetWidth > 100)
      );

      if (isSidebarOpen) {
        (this.logger || logger).step('sidebar', 'Left sidebar is open. Collapsing sidebar...');
        const sidebarToggle = document.querySelector('button[data-f="SB-82b8"], header button');
        if (sidebarToggle) {
          simulateClick(sidebarToggle);
          await sleep(300);
        }
      }
    } catch (err) {
      (this.logger || logger).warn('Failed to check/collapse sidebar:', err);
    }

    // 2. Reset navbar Select All checkbox state
    try {
      const selectAllCheckbox = document.querySelector(
        'nav[data-f="CT-a2b2"] input[data-f="CI-66e5"], nav input[type="checkbox"][data-f="CI-66e5"], nav input[type="checkbox"]'
      );

      if (selectAllCheckbox) {
        if (!selectAllCheckbox.checked) {
          (this.logger || logger).step('Select All', 'Resetting navbar Select All checkbox (check -> uncheck)...');
          simulateClick(selectAllCheckbox);
          await sleep(150);
          simulateClick(selectAllCheckbox);
          await sleep(150);
        } else {
          (this.logger || logger).step('Select All', 'Navbar Select All checkbox is already checked. Unchecking...');
          simulateClick(selectAllCheckbox);
          await sleep(150);
        }
      }
    } catch (err) {
      (this.logger || logger).warn('Failed to toggle initial navbar Select All checkbox:', err);
    }

    (this.logger || logger).success('MiriCanvas pre-flight checks completed');
  }

  /**
   * Scans and retrieves all element cards in the grid.
   * Prioritizes the visible grid list (ul[data-f="TU-5eb5"]) and filters out
   * the virtualizer ghost sizer container (ul[data-f="GU-fa4b"] / ul.panda-ecnXzs).
   * @returns {HTMLElement[]} Array of element card containers.
   */
  getAssetCards() {
    if (typeof document === 'undefined') return [];

    // Prioritize visible grid list items in real MiriCanvas DOM
    const visibleGridArticles = Array.from(
      document.querySelectorAll(
        'ul[data-f="TU-5eb5"] article[data-f="CA-d943"], ul[data-f="TU-5eb5"] > li > article, ul[data-f="TU-5eb5"] article'
      )
    );
    if (visibleGridArticles.length > 0) return visibleGridArticles;

    // Fallback: Query all article cards and filter out hidden sizer containers
    const allArticles = Array.from(
      document.querySelectorAll(
        'article[data-f="CA-d943"], ul > li > article, article.er317d30, article.css-3q5rav, article'
      )
    ).filter((a) => {
      // Exclude hidden sizer containers
      if (typeof a.closest === 'function' && a.closest('ul[data-f="GU-fa4b"], ul.panda-ecnXzs')) {
        return false;
      }
      return true;
    });

    if (allArticles.length > 0) return allArticles;

    return Array.from(
      document.querySelectorAll('div.css-1qnaji9.e1pyeb4g3, div.css-1qnaji9')
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
      'img.css-l67sxu.er317d31, div[data-f="DT-1ecb"] img, img.css-l67sxu, div.panda-ehlNbj img, img'
    );
    return extractThumbnailUrl(img || cardElement);
  }

  /**
   * Selects an element card in the grid to open the sidebar editor.
   * Checks whether the card is already active/selected to prevent toggling it off.
   * Scrolls into view and clicks the thumbnail image (avoids clicking the card checkbox).
   * @param {HTMLElement} cardElement - Element card to select.
   */
  selectCard(cardElement) {
    if (!cardElement) return;
    try {
      cardElement.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    } catch {
      // Ignore scroll errors in mock environments
    }

    // Check if card is already active/selected (.css-1510m7j or active indicator)
    const isAlreadySelected = Boolean(
      cardElement.querySelector?.('.css-1510m7j, [data-f="CT-5090"].css-1510m7j') ||
      cardElement.classList?.contains?.('selected') ||
      cardElement.getAttribute?.('data-selected') === 'true'
    );

    if (isAlreadySelected) {
      (this.logger || logger).step('selectCard', 'Card is already selected/active. Skipping click to prevent toggle-off.');
      return;
    }

    const clickTarget =
      cardElement.querySelector?.('img.css-l67sxu.er317d31, img, div[data-f="DT-1ecb"], .er317d31') || cardElement;
    simulateClick(clickTarget);
  }

  /**
   * Waits for the sidebar editor form to become interactive.
   * If editor is not ready and card is not selected, retries clicking the card once.
   * @param {HTMLElement} [cardElement=null] - Selected element card.
   * @param {number} [timeoutMs=4000] - Timeout in milliseconds.
   * @returns {Promise<boolean>} True if ready, false on timeout.
   */
  async waitForEditorReady(cardElement = null, timeoutMs = 4000) {
    try {
      await waitForElement(
        'textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], textarea[placeholder*="Multiple names"], div[data-f="SD-e6c2"]',
        typeof document !== 'undefined' ? document : null,
        timeoutMs
      );
      return true;
    } catch {
      // Fallback: If not ready and cardElement exists, try clicking once more if unselected
      if (cardElement && typeof document !== 'undefined') {
        const isSelected = Boolean(
          cardElement.querySelector?.('.css-1510m7j, [data-f="CT-5090"].css-1510m7j')
        );
        if (!isSelected) {
          const clickTarget =
            cardElement.querySelector?.('img.css-l67sxu.er317d31, img, div[data-f="DT-1ecb"], .er317d31') || cardElement;
          simulateClick(clickTarget);
          await sleep(500);
          try {
            await waitForElement(
              'textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], textarea[placeholder*="Multiple names"], div[data-f="SD-e6c2"]',
              document,
              2000
            );
            return true;
          } catch {
            return false;
          }
        }
      }
      return false;
    }
  }

  /**
   * Helper to locate the trash/delete button inside a section header.
   * Distinguishes the trash button (containing div[data-f="DD-04b4"] or svg[data-f="DD-e725"])
   * from the copy button (which also has data-f="TT-c273").
   * @param {HTMLElement|null} container - Section container element.
   * @param {string} fallbackSelector - Fallback selector if container is not found.
   * @returns {HTMLElement|null}
   */
  _findTrashButton(container, fallbackSelector = '') {
    if (!container && fallbackSelector && typeof document !== 'undefined') {
      container = document.querySelector(fallbackSelector);
    }
    if (!container) return null;

    // 1. Direct match: search for container with DD-04b4 or DD-e725 and find its button
    const trashIcon = container.querySelector?.('div[data-f="DD-04b4"], svg[data-f="DD-e725"]');
    if (trashIcon) {
      let cur = trashIcon;
      while (cur && cur !== container) {
        if (cur.tagName === 'BUTTON' || (typeof cur.matches === 'function' && cur.matches('button'))) {
          return cur;
        }
        cur = cur.parentElement || cur.parent;
      }
    }

    const buttons = Array.from(container.querySelectorAll('button[data-f="TT-c273"], button'));

    // 2. Search by inner elements or SVG path
    for (const btn of buttons) {
      if (btn.querySelector?.('div[data-f="DD-04b4"], svg[data-f="DD-e725"]')) {
        return btn;
      }
      const path = btn.querySelector?.('path')?.getAttribute?.('d') || '';
      if (path.startsWith('M17 6') || path.includes('h5v2')) {
        return btn;
      }
    }

    // 3. Filter out copy buttons (which contain CD-7f75 or ID-430b)
    const nonCopyButtons = buttons.filter(
      (btn) => !btn.querySelector?.('div[data-f="CD-7f75"], svg[data-f="ID-430b"]')
    );

    if (nonCopyButtons.length > 0) {
      // In MiriCanvas DOM, button[0] is Copy (CD-7f75) and button[1] is Trash (DD-04b4)
      return nonCopyButtons[nonCopyButtons.length - 1];
    }

    // If 2 buttons present, button 1 is trash
    if (buttons.length >= 2) {
      return buttons[1];
    }

    return buttons[0] || null;
  }

  /**
   * Clears old metadata fields (title textarea and keyword chips) prior to injection.
   * Uses trash buttons as mandated by platform design.
   * @returns {Promise<boolean>} True if cleared.
   */
  async clearMetadata() {
    if (typeof document === 'undefined') return true;

    await this.clearTitle();
    await this.clearKeywords();

    await sleep(60);
    return true;
  }

  /**
   * Clears the title field using the trash button if present.
   * @returns {Promise<boolean>}
   */
  async clearTitle() {
    if (typeof document === 'undefined') return true;

    const titleSection = document.querySelector('div[data-f="SD-e6c2"]');
    const titleInput = document.querySelector(
      'div[data-f="SD-e6c2"] textarea, textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], textarea[placeholder*="Multiple names"]'
    );

    const trashBtn = this._findTrashButton(titleSection, 'div[data-f="FA-93a1"], div[data-f="SD-e6c2"]');

    if (trashBtn && !trashBtn.disabled && !trashBtn.hasAttribute?.('disabled')) {
      (this.logger || logger).step('title', 'Clearing pre-existing title via trash button...');

      const innerIcon = trashBtn.querySelector?.('div[data-f="DD-04b4"], svg[data-f="DD-e725"], svg, path');
      if (innerIcon) {
        simulateClick(innerIcon);
        try {
          innerIcon.dispatchEvent?.(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch {}
      }

      simulateClick(trashBtn);
      try {
        trashBtn.dispatchEvent?.(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      } catch {}

      await sleep(100);
    }

    if (titleInput && titleInput.value) {
      setNativeValue(titleInput, '');
    }

    return true;
  }

  /**
   * Clears existing keyword chips sequentially using per-chip remove ('x') icons.
   * Eliminates the bulk trash button approach completely for keywords as requested,
   * relying entirely on reactive, verified per-chip removal with active disappearance polling
   * to accommodate container scrolling and React 18 state reconciler unmounting.
   *
   * @returns {Promise<boolean>}
   */
  async clearKeywords() {
    if (typeof document === 'undefined') return true;

    const getExistingChips = () => {
      const kwSection = document.querySelector('div[data-f="SD-e7b2"]');
      if (kwSection) {
        return Array.from(kwSection.querySelectorAll('span[data-f="CL-67aa"]'));
      }
      return Array.from(document.querySelectorAll('span[data-f="CL-67aa"]'));
    };

    let existingChips = getExistingChips();
    if (existingChips.length === 0) {
      return true;
    }

    (this.logger || logger).step(
      'keywords',
      `Clearing ${existingChips.length} pre-existing keywords individually via remove icon...`
    );

    let consecutiveFailures = 0;
    const maxIterations = 60;
    let iteration = 0;

    while (iteration < maxIterations && consecutiveFailures < 4) {
      iteration++;
      const currentChips = getExistingChips();
      if (currentChips.length === 0) {
        break;
      }

      const prevCount = currentChips.length;

      // Handle scrollable chip container:
      // Deleting bottom-up (last chip first, matching human interaction in recording)
      // naturally shrinks scroll height. On failure, alternate to top chip (first chip).
      const targetChip = (consecutiveFailures % 2 === 0)
        ? currentChips[currentChips.length - 1]
        : currentChips[0];

      if (!targetChip) break;

      // Ensure chip is scrolled into view within the scrollable container
      try {
        if (typeof targetChip.scrollIntoView === 'function') {
          targetChip.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        }
      } catch {}

      const removeIcon =
        targetChip.querySelector?.('svg[data-f="CD-213b"], svg:has(path[d*="10.587"]), path[d*="10.587"], svg') ||
        targetChip;

      const innerPath = removeIcon.querySelector?.('path') || (removeIcon.tagName === 'path' ? removeIcon : null);

      if (innerPath) {
        simulateClick(innerPath);
        try {
          innerPath.dispatchEvent?.(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch {}
      }

      simulateClick(removeIcon);
      try {
        removeIcon.dispatchEvent?.(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      } catch {}

      // Active polling: wait for chip count to decrease before moving to next chip
      // Gives React 18 state reconciler time to unmount without dropping concurrent clicks
      let chipRemoved = false;
      for (let poll = 0; poll < 8; poll++) {
        await sleep(75);
        const updatedCount = getExistingChips().length;
        if (updatedCount < prevCount) {
          chipRemoved = true;
          consecutiveFailures = 0;
          break;
        }
      }

      if (!chipRemoved) {
        consecutiveFailures++;
        await sleep(100);
      }
    }

    // Final verification
    const remaining = getExistingChips().length;
    if (remaining === 0) {
      (this.logger || logger).step('keywords', 'Verified: All keyword chips successfully cleared.');
    } else {
      (this.logger || logger).warn(`Keyword clearing: ${remaining} chips still remain in DOM after removal attempts.`);
    }

    return true;
  }

  /**
   * Injects sanitized metadata into MiriCanvas sidebar editor.
   * - AI Generated Declaration: checkbox toggle.
   * - Content Tier: Standard (STANDARD) vs Premium (PREMIUM).
   * - Element Name (Title): single-string instant injection clamped <= 100 chars.
   * - Keywords: comma-separated injection clamped <= 25 tags max + Enter key simulation.
   *
   * @param {Object} metadata - Sanitized metadata payload.
   * @param {Object} [options={}] - Options (contentTier, isAiGenerated, licenseType, contentType, clearExisting).
   * @param {HTMLElement} [cardElement=null] - Optional element card reference.
   * @returns {Promise<boolean>} True if injection succeeded.
   */
  async fillMetadata(metadata, options = {}, cardElement = null) {
    if (typeof document === 'undefined' || !metadata) return false;

    // Check if editor is mounted; if not, wait for it
    const hasEditor = document.querySelector(
      'div[data-f="SD-e6c2"], textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], textarea[placeholder*="Multiple names"]'
    );
    if (!hasEditor) {
      await this.waitForEditorReady(cardElement, 3000);
    }

    // 1. AI Generated Content Checkbox Toggle
    try {
      const aiContainer = document.querySelector('div[data-f="AD-8705"]') ||
        Array.from(document.querySelectorAll('div, label')).find(
          (el) => el.textContent && el.textContent.includes('AI image generator')
        );

      if (aiContainer) {
        const checkboxSpan = aiContainer.querySelector(
          'span[data-f="CC-bb45"][role="checkbox"], span[role="checkbox"]'
        );
        const checkboxInput = aiContainer.querySelector('input[type="checkbox"]');

        const isCurrentlyChecked = checkboxSpan
          ? checkboxSpan.getAttribute('aria-checked') === 'true'
          : Boolean(checkboxInput?.checked);

        const shouldBeChecked = Boolean(options.isAiGenerated);
        if (isCurrentlyChecked !== shouldBeChecked) {
          (this.logger || logger).step(
            'AI declaration',
            `Setting AI declaration to ${shouldBeChecked ? 'checked' : 'unchecked'}...`
          );
          simulateClick(checkboxSpan || checkboxInput);
          await sleep(120);
        }
      }
    } catch (err) {
      (this.logger || logger).warn('Failed to set AI generated checkbox:', err);
    }

    // 2. Content Tier (Pricing) Radio Selection
    try {
      const wantPremium = options.contentTier === 'PREMIUM' ||
        options.licenseType === 'paid' ||
        options.isPremium === true;
      const targetTier = wantPremium ? 'PREMIUM' : 'STANDARD';

      const tierRadio =
        document.querySelector(`input[name="contentTier"][value="${targetTier}"]`) ||
        Array.from(document.querySelectorAll('label')).find(
          (l) => l.textContent && l.textContent.toLowerCase().includes(wantPremium ? 'premium' : 'standard')
        )?.querySelector('input');

      if (tierRadio && !tierRadio.checked) {
        (this.logger || logger).step('Content Tier', `Setting Content Tier to ${targetTier}...`);
        simulateClick(tierRadio);
        await sleep(100);
      }
    } catch (err) {
      (this.logger || logger).warn('Failed to set Content Tier:', err);
    }

    // 3. Content Type Radio Selection (Optional)
    if (options.contentType) {
      try {
        const typeRadio = document.querySelector(
          `input[name="contentType"][value="${options.contentType}"]`
        );
        if (typeRadio && !typeRadio.checked) {
          simulateClick(typeRadio);
          await sleep(100);
        }
      } catch (err) {
        (this.logger || logger).warn('Failed to set content type:', err);
      }
    }

    // 4. Element Name (Title): Clamped to <= 100 characters
    if (options.clearExisting !== false) {
      await this.clearTitle();
    }
    if (metadata.title) {
      const nameTextarea = document.querySelector(
        'div[data-f="SD-e6c2"] textarea, textarea[data-f="DT-9450"], textarea[placeholder*="Element Name"], textarea[placeholder*="Multiple names"], textarea.panda-eDQUvt'
      );
      if (nameTextarea) {
        const clampedTitle = String(metadata.title).trim().slice(0, 100);
        (this.logger || logger).step('title', `Injecting Title (${clampedTitle.length} chars): "${clampedTitle.slice(0, 40)}..."`);
        setNativeValue(nameTextarea, clampedTitle);
        await sleep(100);
      }
    }

    // 5. Keywords: Clamped to <= 25 tags max, injected as comma-delimited batch and committed via Enter
    if (options.clearExisting !== false) {
      await this.clearKeywords();
    }
    if (metadata.keywords && metadata.keywords.length > 0) {
      const kwInput = document.querySelector(
        'div[data-f="SD-e7b2"] input, input[data-f="II-b5a4"], input[placeholder*="Separate multiple keywords"], input.panda-eNrFAg'
      );
      if (kwInput) {
        const rawKeywords = Array.isArray(metadata.keywords)
          ? metadata.keywords
          : String(metadata.keywords).split(',');

        const cleanTags = rawKeywords
          .map((k) => (typeof k === 'string' ? k.trim() : ''))
          .filter((k) => k.length > 0)
          .slice(0, 25);

        (this.logger || logger).step('keywords', `Injecting ${cleanTags.length} keywords as comma-delimited batch...`);

        if (typeof kwInput.focus === 'function') {
          kwInput.focus();
        }

        const tagBatchString = cleanTags.join(', ');

        // Safely set native value WITHOUT triggering premature blur
        const prototype = (typeof HTMLInputElement !== 'undefined' && kwInput instanceof HTMLInputElement)
          ? HTMLInputElement.prototype
          : Object.getPrototypeOf(kwInput);
        const descriptor = prototype ? Object.getOwnPropertyDescriptor(prototype, 'value') : null;
        if (descriptor?.set) {
          descriptor.set.call(kwInput, tagBatchString);
        } else {
          kwInput.value = tagBatchString;
        }

        // Dispatch input event mimicking paste
        try {
          const inputEvt = typeof InputEvent !== 'undefined'
            ? new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertFromPaste', data: tagBatchString })
            : new Event('input', { bubbles: true });
          kwInput.dispatchEvent(inputEvt);
        } catch {
          kwInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Helper to dispatch keyboard events safely without mutating read-only Event getters
        const dispatchKeyEvent = (type, key, code, keyCode) => {
          let evt;
          const options = { bubbles: true, cancelable: true, key, code, keyCode, which: keyCode };
          try {
            if (typeof KeyboardEvent !== 'undefined') {
              evt = new KeyboardEvent(type, options);
            }
          } catch {}

          if (!evt && typeof Event !== 'undefined') {
            try {
              evt = new Event(type, { bubbles: true, cancelable: true });
            } catch {}
          }

          if (evt) {
            try { evt.keyCode = keyCode; } catch {}
            try { evt.which = keyCode; } catch {}
            try { evt.key = key; } catch {}
            try { evt.code = code; } catch {}
            kwInput.dispatchEvent(evt);
          }
        };

        // Dispatch Enter key sequence (keydown -> change -> keyup)
        dispatchKeyEvent('keydown', 'Enter', 'Enter', 13);
        kwInput.dispatchEvent(new Event('change', { bubbles: true }));
        dispatchKeyEvent('keyup', 'Enter', 'Enter', 13);

        const getChipCount = () =>
          document.querySelectorAll('div[data-f="SD-e7b2"] span[data-f="CL-67aa"], span[data-f="CL-67aa"]').length;

        // Polling wait for chips to appear (up to 1200ms)
        let chipsCreated = false;
        for (let attempt = 0; attempt < 8; attempt++) {
          await sleep(150);
          if (getChipCount() > 0) {
            chipsCreated = true;
            break;
          }
        }

        // Fallback 1: If chips not formed or input still contains text, simulate Comma key then Enter
        if (!chipsCreated || kwInput.value) {
          dispatchKeyEvent('keydown', ',', 'Comma', 188);
          kwInput.dispatchEvent(new Event('change', { bubbles: true }));
          dispatchKeyEvent('keyup', ',', 'Comma', 188);

          dispatchKeyEvent('keydown', 'Enter', 'Enter', 13);
          kwInput.dispatchEvent(new Event('change', { bubbles: true }));
          dispatchKeyEvent('keyup', 'Enter', 'Enter', 13);

          await sleep(200);
          if (getChipCount() > 0) {
            chipsCreated = true;
          }
        }

        // Fallback 2: If chips still 0, inject tags sequentially with comma and enter
        if (getChipCount() === 0) {
          (this.logger || logger).step('keywords', 'Batch commit fallback: entering tags sequentially...');
          for (const tag of cleanTags) {
            if (descriptor?.set) {
              descriptor.set.call(kwInput, tag + ',');
            } else {
              kwInput.value = tag + ',';
            }
            kwInput.dispatchEvent(new Event('input', { bubbles: true }));
            dispatchKeyEvent('keydown', ',', 'Comma', 188);
            dispatchKeyEvent('keydown', 'Enter', 'Enter', 13);
            kwInput.dispatchEvent(new Event('change', { bubbles: true }));
            dispatchKeyEvent('keyup', 'Enter', 'Enter', 13);
            dispatchKeyEvent('keyup', ',', 'Comma', 188);
            await sleep(40);
          }
        }

        // Additional Verification: Check and log chips active in DOM
        const finalChips = getChipCount();
        if (finalChips > 0) {
          (this.logger || logger).step('keywords', `Verified: ${finalChips} keyword chips active in editor.`);
        } else {
          (this.logger || logger).warn(`Keyword verification: 0 chips detected after batch injection.`);
        }

        // Clean up leftover uncommitted text in input if any
        if (kwInput.value) {
          if (descriptor?.set) {
            descriptor.set.call(kwInput, '');
          } else {
            kwInput.value = '';
          }
          kwInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (typeof kwInput.blur === 'function') {
          kwInput.blur();
        }
        await sleep(60);
      }
    }

    return true;
  }

  /**
   * Bulk Save Strategy:
   * 1. Checks navbar Select All checkbox (CI-66e5).
   * 2. Clicks Save Metadata button (SG-8f01).
   * 3. Waits until Save Metadata button becomes disabled or toast notification appears.
   * 4. Unchecks navbar Select All checkbox to restore clean state.
   *
   * @returns {Promise<boolean>} True if bulk save executed successfully.
   */
  async bulkSave() {
    if (typeof document === 'undefined') return false;

    (this.logger || logger).banner('MiriCanvas: Initiating bulk save...');

    // 1. Check top navbar "Select all" checkbox
    const selectAllCheckbox = document.querySelector(
      'nav[data-f="CT-a2b2"] input[data-f="CI-66e5"], nav input[type="checkbox"][data-f="CI-66e5"], nav div.panda-cVAOOe input[type="checkbox"], nav input[type="checkbox"]'
    );

    if (selectAllCheckbox && !selectAllCheckbox.checked) {
      (this.logger || logger).step('bulkSave', 'Checking navbar Select All checkbox...');
      simulateClick(selectAllCheckbox);
      await sleep(250);
    }

    // 2. Click "Save Metadata" button
    const saveBtn =
      document.querySelector('button[data-f="SG-8f01"]') ||
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Save Metadata')
      ) ||
      document.querySelector('button.panda-YJgQP');

    if (!saveBtn) {
      (this.logger || logger).warn('Save Metadata button not found');
      return false;
    }

    (this.logger || logger).step('bulkSave', 'Clicking Save Metadata button...');
    simulateClick(saveBtn);

    // 3. Wait until button becomes disabled or toast notification appears (max 8000ms)
    const startTime = Date.now();
    let saveConfirmed = false;
    while (Date.now() - startTime < 8000) {
      await sleep(200);
      const isBtnDisabled = Boolean(
        saveBtn.disabled ||
        saveBtn.hasAttribute?.('disabled') ||
        saveBtn.getAttribute?.('aria-disabled') === 'true'
      );
      const toast = document.querySelector(
        'section[data-f="SL-2fb0"], div[role="alert"], section.panda-HgOzd'
      );
      if (isBtnDisabled || toast) {
        saveConfirmed = true;
        (this.logger || logger).step('bulkSave', 'Save confirmed via button disabled state or toast notification');
        break;
      }
    }

    if (!saveConfirmed) {
      (this.logger || logger).warn('Save confirmation timeout reached (8000ms), continuing buffer wait...');
    }

    // Allow 2000ms buffer for background synchronization / network persistence
    await sleep(2000);

    // 4. Re-query fresh navbar Select All checkbox to restore clean unselected state
    const currentSelectAllCheckbox = document.querySelector(
      'nav[data-f="CT-a2b2"] input[data-f="CI-66e5"], nav input[type="checkbox"][data-f="CI-66e5"], nav div.panda-cVAOOe input[type="checkbox"], nav input[type="checkbox"]'
    );
    if (currentSelectAllCheckbox && currentSelectAllCheckbox.checked) {
      (this.logger || logger).step('bulkSave', 'Unchecking navbar Select All checkbox...');
      simulateClick(currentSelectAllCheckbox);
      await sleep(200);
    }

    (this.logger || logger).success('MiriCanvas bulk save completed');
    return true;
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
      (this.logger || logger).step('submit', 'Clicking Submit button...');
      simulateClick(submitBtn);
      return true;
    }
    return false;
  }
}
